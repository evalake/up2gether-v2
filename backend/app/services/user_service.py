from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import HardwareTier
from app.models.game import Game
from app.models.group import Group, GroupMembership
from app.models.session import PlaySession
from app.models.user import User, UserHardwareProfile
from app.models.vote import VoteBallot
from app.schemas.user import (
    HardwareResponse,
    HardwareUpdate,
    OnboardingResponse,
    SettingsResponse,
    SettingsUpdate,
)

log = logging.getLogger(__name__)

# ordem de promocao quando o owner sai: tenta admin mais antigo, depois mod,
# depois member. se ninguem sobra, deleta o grupo (libera discord_guild_id
# pra recriar).
_ROLE_RANK = {"admin": 3, "mod": 2, "member": 1}


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def set_hardware(self, actor: User, data: HardwareUpdate) -> HardwareResponse:
        result = await self.db.execute(
            select(UserHardwareProfile).where(UserHardwareProfile.user_id == actor.id)
        )
        prof = result.scalar_one_or_none()
        if prof is None:
            prof = UserHardwareProfile(user_id=actor.id, tier=data.tier, notes=data.notes)
            self.db.add(prof)
        else:
            prof.tier = data.tier
            prof.notes = data.notes
        await self.db.commit()
        await self.db.refresh(prof)
        return HardwareResponse(user_id=actor.id, tier=HardwareTier(prof.tier), notes=prof.notes)

    async def get_settings(self, actor: User) -> SettingsResponse:
        return SettingsResponse(
            timezone=actor.timezone,
            notification_email=actor.notification_email,
            locale=actor.locale,
            onboarding_completed=actor.onboarding_completed,
            settings=actor.settings or {},
        )

    async def update_settings(self, actor: User, data: SettingsUpdate) -> SettingsResponse:
        if data.timezone is not None:
            actor.timezone = data.timezone
        if data.notification_email is not None:
            actor.notification_email = data.notification_email
        if data.locale is not None:
            actor.locale = data.locale
        if data.onboarding_completed is not None:
            actor.onboarding_completed = data.onboarding_completed
        if data.settings is not None:
            merged = dict(actor.settings or {})
            merged.update(data.settings)
            actor.settings = merged
        await self.db.commit()
        await self.db.refresh(actor)
        return await self.get_settings(actor)

    async def onboarding(self, actor: User) -> OnboardingResponse:
        """Checklist de ativacao. 4 passos: grupo, 3+ games, 1 sessao, 1 voto."""
        group_ids = (
            (
                await self.db.execute(
                    select(GroupMembership.group_id).where(GroupMembership.user_id == actor.id)
                )
            )
            .scalars()
            .all()
        )
        has_group = bool(group_ids)

        has_games = False
        if group_ids:
            game_count = await self.db.scalar(
                select(func.count()).select_from(Game).where(Game.group_id.in_(group_ids))
            )
            has_games = (game_count or 0) >= 3

        has_session = False
        if group_ids:
            session_count = await self.db.scalar(
                select(func.count())
                .select_from(PlaySession)
                .where(PlaySession.group_id.in_(group_ids))
            )
            has_session = (session_count or 0) >= 1

        has_vote = bool(
            await self.db.scalar(
                select(func.count()).select_from(VoteBallot).where(VoteBallot.user_id == actor.id)
            )
        )

        done = sum([has_group, has_games, has_session, has_vote])
        return OnboardingResponse(
            has_group=has_group,
            has_games=has_games,
            has_session=has_session,
            has_vote=has_vote,
            steps_done=done,
            steps_total=4,
            complete=done == 4,
        )

    async def delete_account(self, actor: User) -> None:
        # artefatos pessoais cascata via FK (memberships, ballots, rsvps,
        # integrations, notifications, hardware). antes de deletar, resolve
        # grupos onde ele era owner: transfere pra outro membro ou deleta
        # o grupo se ele era o unico (libera discord_guild_id).
        await self._resolve_owned_groups(actor)
        await self.db.delete(actor)
        await self.db.commit()

    async def _resolve_owned_groups(self, actor: User) -> None:
        owned = (
            (await self.db.execute(select(Group).where(Group.owner_user_id == actor.id)))
            .scalars()
            .all()
        )
        for grp in owned:
            await self._transfer_or_delete_group(grp, actor)

    async def _transfer_or_delete_group(self, grp: Group, owner: User) -> None:
        # busca todos os memberships exceto o do owner que ta saindo,
        # ordenado por (rank do role desc, joined_at asc) -- mais senior + mais antigo
        candidates = (
            (
                await self.db.execute(
                    select(GroupMembership)
                    .where(
                        GroupMembership.group_id == grp.id,
                        GroupMembership.user_id != owner.id,
                    )
                    .order_by(GroupMembership.joined_at.asc())
                )
            )
            .scalars()
            .all()
        )
        if not candidates:
            # owner era o unico no grupo: deleta tudo. cascade limpa games,
            # sessions, votes, etc. discord_guild_id volta a ficar disponivel.
            await self.db.delete(grp)
            return

        # pega o mais senior (admin > mod > member). desempate por joined_at asc.
        candidates.sort(key=lambda m: (-_ROLE_RANK.get(m.role, 0), m.joined_at))
        new_owner = candidates[0]
        old_role = new_owner.role
        new_owner.role = "admin"
        grp.owner_user_id = new_owner.user_id

        # avisa o grupo (in-app + webhook discord se tiver)
        try:
            from app.services.notifications import notify_group

            await notify_group(
                self.db,
                group_id=grp.id,
                event="group.owner_changed",
                title=f"novo dono em {grp.name}",
                body=(
                    f"o dono anterior excluiu a conta. ownership passou pra outro membro"
                    f" (era {old_role}, agora admin)."
                ),
            )
        except Exception as e:
            log.warning("failed to notify owner change for group %s: %s", grp.id, e)
