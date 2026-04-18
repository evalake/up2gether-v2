from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import HardwareTier
from app.models.event import Event
from app.models.game import Game
from app.models.group import Group, GroupMembership
from app.models.notification import Notification
from app.models.session import PlaySession, SessionRsvpRow
from app.models.user import IntegrationAccount, User, UserHardwareProfile
from app.models.vote import VoteBallot
from app.schemas.user import (
    DataExportResponse,
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

    async def export_data(self, actor: User) -> DataExportResponse:
        """Snapshot LGPD: tudo que persistimos sobre o user em JSON serializavel.

        Tokens OAuth (access/refresh) nao entram - sao secret nosso, nao do user.
        Email do discord entra pq foi o user que cedeu via OAuth.
        """
        hw = (
            await self.db.execute(
                select(UserHardwareProfile).where(UserHardwareProfile.user_id == actor.id)
            )
        ).scalar_one_or_none()
        integrations = (
            (
                await self.db.execute(
                    select(IntegrationAccount).where(IntegrationAccount.user_id == actor.id)
                )
            )
            .scalars()
            .all()
        )
        memberships = (
            await self.db.execute(
                select(GroupMembership, Group.name, Group.discord_guild_id)
                .join(Group, Group.id == GroupMembership.group_id)
                .where(GroupMembership.user_id == actor.id)
            )
        ).all()
        rsvps = (
            (
                await self.db.execute(
                    select(SessionRsvpRow).where(SessionRsvpRow.user_id == actor.id)
                )
            )
            .scalars()
            .all()
        )
        ballots = (
            (await self.db.execute(select(VoteBallot).where(VoteBallot.user_id == actor.id)))
            .scalars()
            .all()
        )
        notifs = (
            (await self.db.execute(select(Notification).where(Notification.user_id == actor.id)))
            .scalars()
            .all()
        )
        events = (
            (
                await self.db.execute(
                    select(Event).where(Event.user_id == actor.id).order_by(Event.occurred_at.asc())
                )
            )
            .scalars()
            .all()
        )

        return DataExportResponse(
            generated_at=datetime.now(UTC),
            user={
                "id": str(actor.id),
                "discord_id": actor.discord_id,
                "discord_username": actor.discord_username,
                "discord_display_name": actor.discord_display_name,
                "discord_email": actor.discord_email,
                "created_at": actor.created_at.isoformat() if actor.created_at else None,
            },
            settings={
                "timezone": actor.timezone,
                "notification_email": actor.notification_email,
                "locale": actor.locale,
                "onboarding_completed": actor.onboarding_completed,
                "settings": actor.settings or {},
            },
            hardware=(
                {"tier": hw.tier, "notes": hw.notes, "updated_at": hw.updated_at.isoformat()}
                if hw is not None
                else None
            ),
            integrations=[
                {
                    "provider": i.provider,
                    "external_id": i.external_id,
                    "linked_at": i.linked_at.isoformat() if i.linked_at else None,
                    "last_sync_at": i.last_sync_at.isoformat() if i.last_sync_at else None,
                }
                for i in integrations
            ],
            memberships=[
                {
                    "group_id": str(m.GroupMembership.group_id),
                    "group_name": m.name,
                    "discord_guild_id": m.discord_guild_id,
                    "role": m.GroupMembership.role,
                    "joined_at": m.GroupMembership.joined_at.isoformat(),
                }
                for m in memberships
            ],
            rsvps=[
                {
                    "session_id": str(r.session_id),
                    "status": r.status,
                    "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                }
                for r in rsvps
            ],
            ballots=[
                {
                    "vote_session_id": str(b.vote_session_id),
                    "stage_id": str(b.stage_id) if b.stage_id else None,
                    "approvals": [str(a) for a in (b.approvals or [])],
                    "submitted_at": b.submitted_at.isoformat() if b.submitted_at else None,
                }
                for b in ballots
            ],
            notifications=[
                {
                    "kind": n.kind,
                    "title": n.title,
                    "body": n.body,
                    "read_at": n.read_at.isoformat() if n.read_at else None,
                    "created_at": n.created_at.isoformat() if n.created_at else None,
                }
                for n in notifs
            ],
            events=[
                {
                    "event_type": e.event_type,
                    "occurred_at": e.occurred_at.isoformat(),
                    "group_id": str(e.group_id) if e.group_id else None,
                    "payload": e.payload or {},
                }
                for e in events
            ],
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
