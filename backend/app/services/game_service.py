from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status

from app.domain.enums import GameStage, GroupRole, HardwareTier, InterestSignal
from app.models.game import Game
from app.models.user import User
from app.repositories.game_repo import GameRepository
from app.repositories.group_repo import GroupRepository
from app.schemas.game import (
    GameCreate,
    GameUpdate,
    GameViability,
    GameWithViability,
)
from app.services.viability import ViabilityInput, calculate_viability


def _forbid(d: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, d)


def _not_found(d: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, d)


def _bad(d: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, d)


class GameService:
    def __init__(self, games: GameRepository, groups: GroupRepository) -> None:
        self.games = games
        self.groups = groups

    async def _require_member(self, group_id: uuid.UUID, actor: User):
        group = await self.groups.get_by_id(group_id)
        if group is None:
            raise _not_found("Group not found")
        m = await self.groups.get_membership(group_id, actor.id)
        if m is None:
            if actor.is_sys_admin:
                from app.models.group import GroupMembership

                m = GroupMembership(group_id=group_id, user_id=actor.id, role=GroupRole.ADMIN)
            else:
                raise _forbid("Not a member of this group")
        return group, m

    async def _require_admin_or_mod(self, group_id: uuid.UUID, actor: User):
        group, m = await self._require_member(group_id, actor)
        if not actor.is_sys_admin and m.role not in (GroupRole.ADMIN, GroupRole.MOD):
            raise _forbid("Admin or Mod role required")
        return group, m

    async def create(self, group_id: uuid.UUID, data: GameCreate, actor: User) -> GameWithViability:
        await self._require_admin_or_mod(group_id, actor)

        if await self.games.get_by_name_in_group(group_id, data.name):
            raise _bad(f"Ja existe um jogo com o nome '{data.name}' neste grupo")
        if data.steam_appid and await self.games.get_by_steam_appid_in_group(
            group_id, data.steam_appid
        ):
            raise _bad(f"Ja existe um jogo com Steam ID {data.steam_appid} neste grupo")

        is_free = data.is_free or (data.price_current is not None and data.price_current <= 0)
        price = data.price_current if data.price_current and data.price_current > 0 else None

        game = Game(
            group_id=group_id,
            name=data.name,
            steam_appid=data.steam_appid,
            cover_url=data.cover_url,
            description=data.description,
            is_free=is_free,
            price_current=price,
            genres=data.genres,
            tags=data.tags,
            player_min=data.player_min,
            player_max=data.player_max,
            min_hardware_tier=data.min_hardware_tier,
            stage=GameStage.EXPLORING,
            created_by=actor.id,
            developer=data.developer,
            release_date=data.release_date,
            metacritic_score=data.metacritic_score,
            price_original=data.price_original,
            discount_percent=data.discount_percent,
        )
        await self.games.add(game)
        # auto-marca ownership pra membros do grupo que ja importaram a lib steam
        # e tem esse appid na lista. sem isso, quem importou antes teria que reimportar
        # toda vez que um jogo novo e cadastrado.
        if game.steam_appid is not None:
            try:
                from sqlalchemy import select as _select

                from app.models.game import SteamGameOwnership

                members = await self.groups.list_members(group_id)
                for mem in members:
                    u = mem.user
                    if u is None:
                        continue
                    owned = (u.settings or {}).get("steam_owned_appids") or []
                    if game.steam_appid in owned:
                        existing = (
                            await self.games.db.execute(
                                _select(SteamGameOwnership).where(
                                    SteamGameOwnership.user_id == u.id,
                                    SteamGameOwnership.game_id == game.id,
                                )
                            )
                        ).scalar_one_or_none()
                        if existing is None:
                            self.games.db.add(
                                SteamGameOwnership(user_id=u.id, game_id=game.id, manual=False)
                            )
                await self.games.db.commit()
            except Exception:
                import logging as _log

                _log.getLogger(__name__).warning("steam auto-match falhou", exc_info=True)
        from app.services.notifications import notify_group

        fields = []
        if game.player_min:
            pl = (
                f"{game.player_min}+"
                if not game.player_max
                else f"{game.player_min}-{game.player_max}"
            )
            fields.append({"name": "Jogadores", "value": pl, "inline": True})
        if game.is_free:
            fields.append({"name": "Preço", "value": "Grátis", "inline": True})
        elif game.price_current:
            fields.append(
                {"name": "Preço", "value": f"R$ {game.price_current:.2f}", "inline": True}
            )
        await notify_group(
            self.games.db,
            group_id=group_id,
            event="game.added",
            title=f"Novo jogo: {game.name}",
            body=game.description[:140] if game.description else None,
            link=f"/groups/{group_id}/games/{game.id}",
            data={"game_id": str(game.id), "group_id": str(group_id)},
            exclude_user_ids=[actor.id],
            webhook_description=(
                f"**{game.name}** foi adicionado ao catálogo. "
                f"Marca seu interesse pra contar nas próximas votações."
            ),
            webhook_fields=fields or None,
            webhook_image_url=game.cover_url,
        )
        return await self._enrich(game, group_id, actor)

    async def list_for_group(
        self, group_id: uuid.UUID, actor: User, include_archived: bool
    ) -> list[GameWithViability]:
        await self._require_member(group_id, actor)
        games = await self.games.list_for_group(group_id, include_archived)
        out: list[GameWithViability] = []
        for g in games:
            out.append(await self._enrich(g, group_id, actor))
        out.sort(key=lambda x: x.viability.viability_score, reverse=True)
        return out

    async def get(self, group_id: uuid.UUID, game_id: uuid.UUID, actor: User) -> GameWithViability:
        await self._require_member(group_id, actor)
        game = await self.games.get_by_id(game_id)
        if game is None or game.group_id != group_id:
            raise _not_found("Game not found")
        return await self._enrich(game, group_id, actor)

    async def update(
        self, group_id: uuid.UUID, game_id: uuid.UUID, data: GameUpdate, actor: User
    ) -> GameWithViability:
        await self._require_admin_or_mod(group_id, actor)
        game = await self.games.get_by_id(game_id)
        if game is None or game.group_id != group_id:
            raise _not_found("Game not found")

        for field in (
            "name",
            "cover_url",
            "description",
            "player_min",
            "player_max",
            "steam_appid",
            "is_free",
            "price_current",
            "genres",
            "tags",
            "developer",
            "release_date",
            "metacritic_score",
            "price_original",
            "discount_percent",
        ):
            v = getattr(data, field)
            if v is not None:
                setattr(game, field, v)
        if data.min_hardware_tier is not None:
            game.min_hardware_tier = data.min_hardware_tier
        if data.stage is not None:
            game.stage = data.stage
            game.stage_updated_at = datetime.now(UTC)

        await self.games.save()
        return await self._enrich(game, group_id, actor)

    async def archive(self, group_id: uuid.UUID, game_id: uuid.UUID, actor: User) -> None:
        await self._require_admin_or_mod(group_id, actor)
        game = await self.games.get_by_id(game_id)
        if game is None or game.group_id != group_id:
            raise _not_found("Game not found")
        await self.games.archive(game, datetime.now(UTC))

    # ---- interest / roster / ownership ----

    async def set_interest(
        self, game_id: uuid.UUID, signal: InterestSignal, actor: User
    ) -> GameWithViability:
        game = await self.games.get_by_id(game_id)
        if game is None:
            raise _not_found("Game not found")
        if (await self.groups.get_membership(game.group_id, actor.id)) is None:
            raise _forbid("Not a member of this group")
        await self.games.upsert_interest(game_id, actor.id, signal)
        return await self._enrich(game, game.group_id, actor)

    async def join_roster(
        self,
        game_id: uuid.UUID,
        actor: User,
        participation_status: str,
        notes: str | None,
    ) -> GameWithViability:
        game = await self.games.get_by_id(game_id)
        if game is None:
            raise _not_found("Game not found")
        if (await self.groups.get_membership(game.group_id, actor.id)) is None:
            raise _forbid("Not a member of this group")
        await self.games.upsert_roster(game_id, actor.id, participation_status, notes)
        return await self._enrich(game, game.group_id, actor)

    async def leave_roster(self, game_id: uuid.UUID, actor: User) -> GameWithViability:
        game = await self.games.get_by_id(game_id)
        if game is None:
            raise _not_found("Game not found")
        await self.games.remove_from_roster(game_id, actor.id)
        return await self._enrich(game, game.group_id, actor)

    async def toggle_ownership(
        self, game_id: uuid.UUID, owns: bool, actor: User
    ) -> GameWithViability:
        game = await self.games.get_by_id(game_id)
        if game is None:
            raise _not_found("Game not found")
        if (await self.groups.get_membership(game.group_id, actor.id)) is None:
            raise _forbid("Not a member of this group")
        await self.games.set_ownership(actor.id, game_id, owns)
        return await self._enrich(game, game.group_id, actor)

    # ---- helpers ----

    async def _enrich(self, game: Game, group_id: uuid.UUID, actor: User) -> GameWithViability:
        member_count = max(await self.groups.count_members(group_id), 1)
        tiers = await self.games.member_tiers(group_id)
        counts = await self.games.count_interests_by_signal(game.id)
        want = counts.get(InterestSignal.WANT, 0)
        ok = counts.get(InterestSignal.OK, 0)
        pass_ = counts.get(InterestSignal.PASS, 0)

        score = calculate_viability(
            ViabilityInput(
                is_free=game.is_free,
                price_current=game.price_current,
                min_hardware_tier=HardwareTier(game.min_hardware_tier),
                member_tiers=tuple(tiers),
                want_count=want,
                ok_count=ok,
                pass_count=pass_,
                member_count=member_count,
            )
        )

        ownership_count = await self.games.count_owners(game.id)
        user_interest = await self.games.get_user_interest(game.id, actor.id)
        user_in_roster = await self.games.has_roster(game.id, actor.id)
        user_owns = await self.games.user_owns(actor.id, game.id)

        viab = GameViability(
            price_score=score.price_score,
            hardware_fit_percent=score.hardware_fit_percent,
            interest_score=score.interest_score,
            viability_score=score.viability_score,
            interest_want_count=want,
            interest_ok_count=ok,
            interest_pass_count=pass_,
            ownership_count=ownership_count,
        )
        return GameWithViability(
            id=game.id,
            group_id=game.group_id,
            name=game.name,
            steam_appid=game.steam_appid,
            cover_url=game.cover_url,
            description=game.description,
            is_free=game.is_free,
            price_current=game.price_current,
            genres=game.genres,
            tags=game.tags,
            player_min=game.player_min,
            player_max=game.player_max,
            min_hardware_tier=HardwareTier(game.min_hardware_tier),
            stage=GameStage(game.stage),
            stage_updated_at=game.stage_updated_at,
            created_by=game.created_by,
            created_at=game.created_at,
            archived_at=game.archived_at,
            viability=viab,
            user_interest=user_interest,
            user_in_roster=user_in_roster,
            user_owns_game=user_owns,
        )
