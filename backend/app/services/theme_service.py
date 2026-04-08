from __future__ import annotations

import random
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select

from app.domain.enums import GroupRole, ThemeCyclePhase
from app.models.theme import MonthlyTheme, ThemeCycle, ThemeSuggestion
from app.models.user import User
from app.repositories.group_repo import GroupRepository
from app.repositories.theme_repo import ThemeRepository
from app.schemas.theme import (
    CycleResponse,
    SuggestionCreate,
    SuggestionResponse,
    ThemeCreate,
    ThemeResponse,
)


def _forbid(d: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, d)


def _not_found(d: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, d)


def _bad(d: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, d)


def _current_month() -> str:
    return datetime.now(UTC).strftime("%Y-%m")


class ThemeService:
    def __init__(self, themes: ThemeRepository, groups: GroupRepository) -> None:
        self.themes = themes
        self.groups = groups

    async def _require_member(self, group_id: uuid.UUID, actor: User):
        group = await self.groups.get_by_id(group_id)
        if group is None:
            raise _not_found("Group not found")
        m = await self.groups.get_membership(group_id, actor.id)
        if m is None:
            if actor.is_sys_admin:
                return None
            raise _forbid("Not a member of this group")
        return m

    async def _require_admin_or_mod(self, group_id: uuid.UUID, actor: User):
        if actor.is_sys_admin:
            return
        m = await self._require_member(group_id, actor)
        if m is None or m.role not in (GroupRole.ADMIN, GroupRole.MOD):
            raise _forbid("Admin or Mod role required")

    async def _require_admin(self, group_id: uuid.UUID, actor: User):
        if actor.is_sys_admin:
            return
        m = await self._require_member(group_id, actor)
        if m is None or m.role != GroupRole.ADMIN:
            raise _forbid("Admin role required")

    async def set_theme(self, group_id: uuid.UUID, data: ThemeCreate, actor: User) -> ThemeResponse:
        await self._require_admin_or_mod(group_id, actor)
        month = data.month_year or _current_month()
        if await self.themes.get_for_month(group_id, month):
            raise _bad(f"Tema ja definido para {month}")
        theme = MonthlyTheme(
            group_id=group_id,
            month_year=month,
            theme_name=data.theme_name,
            description=data.description,
            image_url=data.image_url,
            decided_by="manual",
            created_by=actor.id,
        )
        await self.themes.add(theme)
        return ThemeResponse.model_validate(theme)

    async def get_current(self, group_id: uuid.UUID, actor: User) -> ThemeResponse | None:
        await self._require_member(group_id, actor)
        theme = await self.themes.get_for_month(group_id, _current_month())
        return ThemeResponse.model_validate(theme) if theme else None

    async def list_history(self, group_id: uuid.UUID, actor: User) -> list[ThemeResponse]:
        await self._require_member(group_id, actor)
        themes = await self.themes.list_for_group(group_id)
        return [ThemeResponse.model_validate(t) for t in themes]

    async def delete(self, group_id: uuid.UUID, theme_id: uuid.UUID, actor: User) -> None:
        await self._require_admin_or_mod(group_id, actor)
        themes = await self.themes.list_for_group(group_id)
        target = next((t for t in themes if t.id == theme_id), None)
        if target is None:
            raise _not_found("Theme not found")
        await self.themes.delete(target)

    # ---- cycles ----

    async def get_or_none_current_cycle(
        self, group_id: uuid.UUID, actor: User
    ) -> CycleResponse | None:
        await self._require_member(group_id, actor)
        cycle = await self.themes.get_cycle_for_month(group_id, _current_month())
        if cycle is None:
            return None
        return await self._cycle_response(cycle, actor)

    async def open_cycle(self, group_id: uuid.UUID, actor: User) -> CycleResponse:
        # criar ciclo novo: admin ou mod.
        # reiniciar ciclo existente (reset): so admin, pq limpa sugestoes e votos.
        month = _current_month()
        existing = await self.themes.get_cycle_for_month(group_id, month)
        if existing is not None:
            await self._require_admin(group_id, actor)
        else:
            await self._require_admin_or_mod(group_id, actor)
        if existing is not None:
            # nulla winner FK antes de deletar as sugestoes, senao FK explode
            existing.winner_suggestion_id = None
            existing.tiebreak_kind = None
            existing.tied_suggestion_ids = None
            existing.decided_at = None
            existing.phase = ThemeCyclePhase.VOTING
            existing.opened_by = actor.id
            await self.themes.save()
            await self.themes.delete_votes(existing.id)
            await self.themes.delete_suggestions(existing.id)
            await self.themes.save()
            from app.services.notifications import notify_group

            await notify_group(
                self.themes.db,
                group_id=group_id,
                event="theme.cycle_opened",
                title="Tema do mês reaberto",
                body="Sugira e vote no tema do mês",
                link=f"/groups/{group_id}/themes",
                data={"cycle_id": str(existing.id), "group_id": str(group_id)},
                exclude_user_ids=[actor.id],
                webhook_description=(
                    "Um novo ciclo de **tema do mês** foi aberto. "
                    "Manda sua sugestão e vota nas dos outros."
                ),
            )
            return await self._cycle_response(existing, actor)
        # ciclo ja abre em VOTING: sugestoes e votos rolam ao mesmo tempo,
        # admin so precisa fechar quando achar que ta bom
        cycle = ThemeCycle(
            group_id=group_id,
            month_year=month,
            phase=ThemeCyclePhase.VOTING,
            opened_by=actor.id,
        )
        await self.themes.add_cycle(cycle)
        from app.services.notifications import notify_group

        await notify_group(
            self.themes.db,
            group_id=group_id,
            event="theme.cycle_opened",
            title="Tema do mês aberto",
            body="Sugira e vote no tema do mês",
            link=f"/groups/{group_id}/themes",
            data={"cycle_id": str(cycle.id), "group_id": str(group_id)},
            exclude_user_ids=[actor.id],
            webhook_description=(
                "Começou um novo ciclo de **tema do mês**. "
                "Manda sua sugestão e vota nas dos outros."
            ),
        )
        return await self._cycle_response(cycle, actor)

    async def upsert_suggestion(
        self,
        group_id: uuid.UUID,
        cycle_id: uuid.UUID,
        data: SuggestionCreate,
        actor: User,
    ) -> CycleResponse:
        await self._require_member(group_id, actor)
        cycle = await self._load_cycle(group_id, cycle_id)
        # sem trava de fase: qualquer membro pode sugerir/editar a qualquer momento
        existing = await self.themes.get_user_suggestion(cycle_id, actor.id)
        is_new = existing is None
        if existing:
            existing.name = data.name
            existing.description = data.description
            existing.image_url = data.image_url
            await self.themes.save()
            sug_id = existing.id
        else:
            new_sug = ThemeSuggestion(
                cycle_id=cycle_id,
                user_id=actor.id,
                name=data.name,
                description=data.description,
                image_url=data.image_url,
            )
            await self.themes.add_suggestion(new_sug)
            sug_id = new_sug.id
        # auto-voto na propria sugestao se ainda nao votou
        if cycle.phase == ThemeCyclePhase.VOTING:
            votes = await self.themes.list_votes(cycle_id)
            if not any(v.user_id == actor.id for v in votes):
                await self.themes.upsert_vote(cycle_id, actor.id, sug_id)
        if is_new:
            from app.services.notifications import notify_group

            author = actor.discord_display_name or actor.discord_username or "alguem"
            fields = [{"name": "Sugerido por", "value": author, "inline": True}]
            if data.description:
                fields.append({"name": "Descrição", "value": data.description[:200], "inline": False})
            await notify_group(
                self.themes.db,
                group_id=group_id,
                event="theme.suggestion_created",
                title=f"Nova sugestão de tema: {data.name}",
                body=f"{author} sugeriu {data.name}",
                link=f"/groups/{group_id}/themes",
                data={"cycle_id": str(cycle_id), "suggestion_id": str(sug_id), "group_id": str(group_id)},
                exclude_user_ids=[actor.id],
                webhook_description=(
                    f"**{data.name}** entrou no ciclo de **tema do mês**. "
                    "Abre a plataforma pra votar ou mandar a sua."
                ),
                webhook_fields=fields,
                webhook_image_url=data.image_url,
            )
        return await self._cycle_response(cycle, actor)

    async def delete_suggestion(
        self,
        group_id: uuid.UUID,
        cycle_id: uuid.UUID,
        actor: User,
        suggestion_id: uuid.UUID | None = None,
    ) -> CycleResponse:
        m = await self._require_member(group_id, actor)
        cycle = await self._load_cycle(group_id, cycle_id)
        # sem trava de fase
        if suggestion_id is not None:
            s = await self.themes.get_suggestion(suggestion_id)
            if s is None or s.cycle_id != cycle_id:
                raise _not_found("sugestao nao encontrada")
            is_admin = actor.is_sys_admin or (
                m is not None and m.role in (GroupRole.ADMIN, GroupRole.MOD)
            )
            if s.user_id != actor.id and not is_admin:
                raise _forbid("so admin/mod pode remover sugestao alheia")
        else:
            s = await self.themes.get_user_suggestion(cycle_id, actor.id)
            if s is None:
                raise _not_found("voce nao tem sugestao nesse ciclo")
        await self.themes.delete_suggestion(s)
        return await self._cycle_response(cycle, actor)

    async def start_voting(
        self, group_id: uuid.UUID, cycle_id: uuid.UUID, actor: User
    ) -> CycleResponse:
        await self._require_admin_or_mod(group_id, actor)
        cycle = await self._load_cycle(group_id, cycle_id)
        if cycle.phase != ThemeCyclePhase.SUGGESTING:
            raise _bad("fase invalida pra abrir voto")
        suggestions = await self.themes.list_suggestions(cycle_id)
        if len(suggestions) == 0:
            raise _bad("sem sugestoes pra votar")
        if len(suggestions) == 1:
            return await self._finalize(cycle, suggestions[0].id, "auto", actor)
        cycle.phase = ThemeCyclePhase.VOTING
        await self.themes.save()
        return await self._cycle_response(cycle, actor)

    async def cast_vote(
        self,
        group_id: uuid.UUID,
        cycle_id: uuid.UUID,
        suggestion_id: uuid.UUID,
        actor: User,
    ) -> CycleResponse:
        await self._require_member(group_id, actor)
        cycle = await self._load_cycle(group_id, cycle_id)
        # sem trava: vota sempre, mesmo apos decided (vira voto novo)
        s = await self.themes.get_suggestion(suggestion_id)
        if s is None or s.cycle_id != cycle_id:
            raise _not_found("sugestao nao encontrada")
        # toggle: se ja ta votado na mesma sugestao, desmarca
        existing = await self.themes.get_user_vote(cycle_id, actor.id)
        if existing is not None and existing.suggestion_id == suggestion_id:
            await self.themes.delete_user_vote(cycle_id, actor.id)
        else:
            await self.themes.upsert_vote(cycle_id, actor.id, suggestion_id)
        return await self._cycle_response(cycle, actor)

    async def close_cycle(
        self, group_id: uuid.UUID, cycle_id: uuid.UUID, actor: User
    ) -> CycleResponse:
        await self._require_admin_or_mod(group_id, actor)
        cycle = await self._load_cycle(group_id, cycle_id)
        suggestions = await self.themes.list_suggestions(cycle_id)
        votes = await self.themes.list_votes(cycle_id)
        if not suggestions:
            raise _bad("sem sugestoes")
        counts: dict[uuid.UUID, int] = {s.id: 0 for s in suggestions}
        for v in votes:
            if v.suggestion_id in counts:
                counts[v.suggestion_id] += 1
        # repeat-block K=3: se uma sugestao com nome igual a algum dos 3 ultimos
        # temas do grupo vencer, deprioriza (so volta a contar se for o unico
        # candidato com votos)
        recent_themes = await self.themes.list_for_group(group_id)
        blocked_names = {t.theme_name.strip().lower() for t in recent_themes[:3]}
        sug_by_id = {s.id: s for s in suggestions}
        max_votes = max(counts.values()) if counts else 0
        winners = [sid for sid, c in counts.items() if c == max_votes]
        if blocked_names and max_votes > 0:
            non_blocked = [
                sid for sid in winners if sug_by_id[sid].name.strip().lower() not in blocked_names
            ]
            if non_blocked:
                winners = non_blocked
            else:
                # todos top winners estao bloqueados: tenta o proximo nivel
                ranked = sorted(counts.items(), key=lambda x: -x[1])
                for _, c in ranked:
                    if c == 0 or c == max_votes:
                        continue
                    level = [sid for sid, cc in counts.items() if cc == c]
                    level_nb = [
                        sid
                        for sid in level
                        if sug_by_id[sid].name.strip().lower() not in blocked_names
                    ]
                    if level_nb:
                        winners = level_nb
                        max_votes = c
                        break
        if len(winners) == 1:
            return await self._finalize(cycle, winners[0], "vote", actor)
        kind = "tiebreak_coin" if len(winners) == 2 else "tiebreak_roulette"
        cycle.tied_suggestion_ids = [str(w) for w in winners]
        picked = random.choice(winners)
        return await self._finalize(cycle, picked, kind, actor)

    async def force_decide(
        self,
        group_id: uuid.UUID,
        cycle_id: uuid.UUID,
        suggestion_id: uuid.UUID,
        actor: User,
    ) -> CycleResponse:
        await self._require_admin(group_id, actor)
        cycle = await self._load_cycle(group_id, cycle_id)
        s = await self.themes.get_suggestion(suggestion_id)
        if s is None or s.cycle_id != cycle_id:
            raise _not_found("sugestao nao encontrada")
        return await self._finalize(cycle, suggestion_id, "admin", actor)

    async def cancel_cycle(
        self, group_id: uuid.UUID, cycle_id: uuid.UUID, actor: User
    ) -> CycleResponse:
        await self._require_admin(group_id, actor)
        cycle = await self._load_cycle(group_id, cycle_id)
        cycle.phase = ThemeCyclePhase.CANCELLED
        await self.themes.save()
        return await self._cycle_response(cycle, actor)

    # ---- helpers ----

    async def _load_cycle(self, group_id: uuid.UUID, cycle_id: uuid.UUID) -> ThemeCycle:
        cycle = await self.themes.get_cycle(cycle_id)
        if cycle is None or cycle.group_id != group_id:
            raise _not_found("ciclo nao encontrado")
        return cycle

    async def _finalize(
        self,
        cycle: ThemeCycle,
        winner_id: uuid.UUID,
        kind: str,
        actor: User,
    ) -> CycleResponse:
        winner = await self.themes.get_suggestion(winner_id)
        if winner is None:
            raise _not_found("sugestao vencedora sumiu")
        existing_theme = await self.themes.get_for_month(cycle.group_id, cycle.month_year)
        if existing_theme is not None:
            # sobrescreve o tema anterior se re-decidirem o mes
            existing_theme.theme_name = winner.name
            existing_theme.description = winner.description
            existing_theme.image_url = winner.image_url
            existing_theme.decided_by = kind
            existing_theme.created_by = winner.user_id
        else:
            theme = MonthlyTheme(
                group_id=cycle.group_id,
                month_year=cycle.month_year,
                theme_name=winner.name,
                description=winner.description,
                image_url=winner.image_url,
                decided_by=kind,
                created_by=winner.user_id,
            )
            await self.themes.add(theme)
        cycle.phase = ThemeCyclePhase.DECIDED
        cycle.winner_suggestion_id = winner_id
        cycle.tiebreak_kind = kind if kind.startswith("tiebreak") else None
        cycle.decided_at = datetime.now(UTC)
        await self.themes.save()
        from app.services.notifications import notify_group

        tiebreak_label = ""
        if kind.startswith("tiebreak"):
            tiebreak_label = (
                " (desempate no cara-coroa)"
                if kind == "tiebreak_coin"
                else " (desempate na roleta)"
            )
        elif kind == "admin":
            tiebreak_label = " (decidido pelo admin)"
        await notify_group(
            self.themes.db,
            group_id=cycle.group_id,
            event="theme.decided",
            title=f"Tema do mês: {winner.name}",
            body=f"Vencedor do ciclo {cycle.month_year}",
            link=f"/groups/{cycle.group_id}/themes",
            data={"cycle_id": str(cycle.id), "group_id": str(cycle.group_id), "theme": winner.name},
            webhook_description=(
                f"**{winner.name}** venceu o tema do mês{tiebreak_label}.\n\n"
                f"{winner.description or ''}"
            ),
            webhook_image_url=winner.image_url,
        )
        return await self._cycle_response(cycle, actor)

    async def _cycle_response(self, cycle: ThemeCycle, actor: User) -> CycleResponse:
        suggestions = await self.themes.list_suggestions(cycle.id)
        votes = await self.themes.list_votes(cycle.id)
        counts: dict[uuid.UUID, int] = {s.id: 0 for s in suggestions}
        for v in votes:
            counts[v.suggestion_id] = counts.get(v.suggestion_id, 0) + 1

        user_ids = list({s.user_id for s in suggestions})
        users_map: dict[uuid.UUID, User] = {}
        if user_ids:
            res = await self.themes.db.execute(select(User).where(User.id.in_(user_ids)))
            users_map = {u.id: u for u in res.scalars().all()}

        suggestion_responses = []
        for s in suggestions:
            u = users_map.get(s.user_id)
            suggestion_responses.append(
                SuggestionResponse(
                    id=s.id,
                    cycle_id=s.cycle_id,
                    user_id=s.user_id,
                    user_name=(u.discord_display_name or u.discord_username) if u else None,
                    user_avatar=u.discord_avatar if u else None,
                    user_discord_id=u.discord_id if u else None,
                    name=s.name,
                    description=s.description,
                    image_url=s.image_url,
                    vote_count=counts.get(s.id, 0),
                )
            )

        user_suggestion = next((s.id for s in suggestions if s.user_id == actor.id), None)
        user_vote = next((v.suggestion_id for v in votes if v.user_id == actor.id), None)

        return CycleResponse(
            id=cycle.id,
            group_id=cycle.group_id,
            month_year=cycle.month_year,
            phase=cycle.phase,
            opened_by=cycle.opened_by,
            winner_suggestion_id=cycle.winner_suggestion_id,
            tiebreak_kind=cycle.tiebreak_kind,
            tied_suggestion_ids=[uuid.UUID(s) for s in cycle.tied_suggestion_ids]
            if cycle.tied_suggestion_ids
            else None,
            decided_at=cycle.decided_at,
            suggestions=suggestion_responses,
            user_suggestion_id=user_suggestion,
            user_vote_suggestion_id=user_vote,
            total_votes=len(votes),
        )
