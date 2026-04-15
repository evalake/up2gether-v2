from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select

from app.domain.enums import GroupRole
from app.models.game import Game, SteamGameOwnership
from app.models.group import Group, GroupMembership
from app.models.user import User
from app.repositories.group_repo import GroupRepository
from app.schemas.group import GroupMembershipResponse, GroupResponse, GroupWithStats
from app.schemas.user import UserResponse
from app.services.events import EVENT_GROUP_CREATED, EVENT_GROUP_JOINED, track_event


def _forbid(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, detail)


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, detail)


def _bad(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, detail)


class GroupService:
    def __init__(self, repo: GroupRepository) -> None:
        self.repo = repo

    async def _require_membership(
        self, group_id: uuid.UUID, actor: User
    ) -> tuple[Group, GroupMembership]:
        group = await self.repo.get_by_id(group_id)
        if group is None:
            raise _not_found("Group not found")
        membership = await self.repo.get_membership(group_id, actor.id)
        if membership is None:
            if actor.is_sys_admin:
                # cyberbandolero ghost membership: admin virtual, nao persiste
                membership = GroupMembership(
                    group_id=group_id, user_id=actor.id, role=GroupRole.ADMIN
                )
            else:
                raise _forbid("Not a member of this group")
        return group, membership

    async def create_or_join_from_discord(
        self,
        *,
        discord_guild_id: str,
        name: str,
        icon_url: str | None,
        webhook_url: str | None,
        actor: User,
        discord_permissions: str | None = None,  # mantido pra compat, nao usado
    ) -> GroupResponse:
        # regra: o primeiro user que registra o guild vira ADMIN (owner).
        # todos os proximos entram como MEMBER. admin promove manualmente
        # pra mod/admin dps. discord perms nao elevam auto pq inflava o
        # role de todo mundo que tinha manage_guild.
        del discord_permissions

        existing = await self.repo.get_by_discord_guild_id(discord_guild_id)
        if existing is not None:
            membership = await self.repo.get_membership(existing.id, actor.id)
            if membership is None:
                await self.repo.add_member(existing, actor.id, GroupRole.MEMBER)
                await track_event(
                    self.repo.db,
                    EVENT_GROUP_JOINED,
                    user_id=actor.id,
                    group_id=existing.id,
                )
            await self._sync_steam_ownership(actor, existing.id)
            return GroupResponse.model_validate(existing)

        group = await self.repo.create_with_owner(
            discord_guild_id=discord_guild_id,
            name=name,
            icon_url=icon_url,
            webhook_url=webhook_url,
            owner_user_id=actor.id,
        )
        await track_event(
            self.repo.db,
            EVENT_GROUP_CREATED,
            user_id=actor.id,
            group_id=group.id,
            payload={"discord_guild_id": discord_guild_id},
        )
        await self._sync_steam_ownership(actor, group.id)
        return GroupResponse.model_validate(group)

    async def _sync_steam_ownership(self, actor: User, group_id: uuid.UUID) -> None:
        """pra quando um user entra/cria grupo: se ele ja importou a lib do steam
        (settings.steam_owned_appids), marca ownership pros games desse grupo
        que ele possui. idempotente."""
        owned = (actor.settings or {}).get("steam_owned_appids") or []
        if not owned:
            return
        db = self.repo.db
        games = (
            (
                await db.execute(
                    select(Game).where(
                        Game.group_id == group_id,
                        Game.steam_appid.in_(owned),
                    )
                )
            )
            .scalars()
            .all()
        )
        if not games:
            return
        game_ids = [g.id for g in games]
        existing = set(
            (
                await db.execute(
                    select(SteamGameOwnership.game_id).where(
                        SteamGameOwnership.user_id == actor.id,
                        SteamGameOwnership.game_id.in_(game_ids),
                    )
                )
            )
            .scalars()
            .all()
        )
        for g in games:
            if g.id not in existing:
                db.add(SteamGameOwnership(user_id=actor.id, game_id=g.id, manual=False))
        await db.commit()

    async def purge(self, group_id: uuid.UUID, actor: User) -> None:
        group = await self.repo.get_by_id(group_id)
        if group is None:
            raise _not_found("Group not found")
        if group.owner_user_id != actor.id and not actor.is_sys_admin:
            raise _forbid("Apenas o dono pode resetar o servidor")
        await self.repo.purge_content(group_id)

    async def list_for_user(self, actor: User) -> list[GroupWithStats]:
        rows = await self.repo.list_for_user(actor.id)
        if not rows:
            return []
        group_ids = [g.id for g, _ in rows]
        counts = await self.repo.count_members_batch(group_ids)
        out: list[GroupWithStats] = []
        for group, membership in rows:
            item = GroupWithStats.model_validate(group, from_attributes=True).model_copy(
                update={
                    "member_count": counts.get(group.id, 0),
                    "game_count": 0,
                    "active_vote_sessions": 0,
                    "user_role": GroupRole(membership.role),
                }
            )
            out.append(item)
        return out

    async def get_for_user(self, group_id: uuid.UUID, actor: User) -> GroupWithStats:
        from app.domain.tiers import seat_limit_for_tier, tier_for_seats

        group, membership = await self._require_membership(group_id, actor)
        member_count = await self.repo.count_members(group.id)
        seat_count = await self.repo.count_seats(group.id)
        tier = tier_for_seats(seat_count)
        return GroupWithStats.model_validate(group, from_attributes=True).model_copy(
            update={
                "member_count": member_count,
                "game_count": 0,
                "active_vote_sessions": 0,
                "user_role": GroupRole(membership.role),
                "seat_count": seat_count,
                "tier": tier,
                "seat_limit": seat_limit_for_tier(tier),
                "legacy_free": bool(group.legacy_free),
            }
        )

    async def list_members(self, group_id: uuid.UUID, actor: User) -> list[GroupMembershipResponse]:
        await self._require_membership(group_id, actor)
        memberships = await self.repo.list_members(group_id)
        return [
            GroupMembershipResponse(
                id=m.id,
                user_id=m.user_id,
                group_id=m.group_id,
                role=GroupRole(m.role),
                joined_at=m.joined_at,
                user=UserResponse.from_user(m.user) if m.user else None,
            )
            for m in memberships
        ]

    async def update_webhook(
        self, group_id: uuid.UUID, actor: User, webhook_url: str | None
    ) -> None:
        group, _ = await self._require_membership(group_id, actor)
        if group.owner_user_id != actor.id and not actor.is_sys_admin:
            raise _forbid("Only the server owner can edit the webhook")
        await self.repo.update_webhook(group, webhook_url)

    async def leave(self, group_id: uuid.UUID, actor: User) -> None:
        group = await self.repo.get_by_id(group_id)
        if group is None:
            raise _not_found("Group not found")
        membership = await self.repo.get_membership(group_id, actor.id)
        if membership is None:
            raise _not_found("Not a member of this group")

        if membership.role == GroupRole.ADMIN:
            admin_count = await self.repo.count_admins(group_id)
            if admin_count == 1:
                raise _bad("Voce e o unico admin. Promova outro membro antes de sair.")

        await self.repo.remove_member(group_id, actor.id)

    async def delete(self, group_id: uuid.UUID, actor: User) -> None:
        group = await self.repo.get_by_id(group_id)
        if group is None:
            raise _not_found("Group not found")
        if group.owner_user_id != actor.id and not actor.is_sys_admin:
            raise _forbid("Apenas o dono do grupo pode exclui-lo")
        await self.repo.delete_group(group)

    async def promote(
        self,
        group_id: uuid.UUID,
        target_user_id: uuid.UUID,
        new_role: GroupRole,
        actor: User,
    ) -> None:
        group, requester = await self._require_membership(group_id, actor)

        if target_user_id == actor.id:
            raise _bad("Voce nao pode se auto-promover")

        is_owner = group.owner_user_id == actor.id
        is_admin = requester.role == GroupRole.ADMIN

        if new_role == GroupRole.ADMIN:
            if not is_owner and not actor.is_sys_admin:
                raise _forbid("Apenas o dono do grupo pode promover a admin")
        elif new_role == GroupRole.MOD:
            if not (is_owner or is_admin) and not actor.is_sys_admin:
                raise _forbid("Apenas admin ou dono pode promover a mod")
        else:
            raise _bad("Role invalido. Use 'mod' ou 'admin'")

        target = await self.repo.get_membership(group_id, target_user_id)
        if target is None:
            raise _not_found("Usuario nao encontrado neste grupo")

        await self.repo.update_role(group_id, target_user_id, new_role)

    async def demote(self, group_id: uuid.UUID, target_user_id: uuid.UUID, actor: User) -> None:
        group, requester = await self._require_membership(group_id, actor)

        target = await self.repo.get_membership(group_id, target_user_id)
        if target is None:
            raise _not_found("Usuario nao encontrado neste grupo")

        if group.owner_user_id == target_user_id:
            raise _bad("Nao e possivel rebaixar o dono do grupo")

        is_owner = group.owner_user_id == actor.id
        is_admin = requester.role == GroupRole.ADMIN
        target_role = target.role

        if target_role == GroupRole.ADMIN and not is_owner and not actor.is_sys_admin:
            raise _forbid("Apenas o dono pode rebaixar admins")
        if target_role == GroupRole.MOD and not (is_owner or is_admin) and not actor.is_sys_admin:
            raise _forbid("Apenas admin ou dono pode rebaixar mods")

        await self.repo.update_role(group_id, target_user_id, GroupRole.MEMBER)

    async def kick(self, group_id: uuid.UUID, target_user_id: uuid.UUID, actor: User) -> None:
        group, requester = await self._require_membership(group_id, actor)

        if target_user_id == actor.id:
            raise _bad("Use leave pra sair do grupo")
        if group.owner_user_id == target_user_id:
            raise _bad("Nao da pra remover o dono do grupo")

        target = await self.repo.get_membership(group_id, target_user_id)
        if target is None:
            raise _not_found("Usuario nao encontrado neste grupo")

        is_owner = group.owner_user_id == actor.id
        is_admin = requester.role == GroupRole.ADMIN
        if not (is_owner or is_admin) and not actor.is_sys_admin:
            raise _forbid("Apenas admin ou dono pode remover membros")
        if target.role == GroupRole.ADMIN and not is_owner and not actor.is_sys_admin:
            raise _forbid("Apenas o dono pode remover admins")

        await self.repo.remove_member(group_id, target_user_id)
