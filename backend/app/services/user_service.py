from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import HardwareTier
from app.models.game import Game
from app.models.group import GroupMembership
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
        # integrations, notifications, hardware). groups onde ele era owner
        # ficam com owner_user_id = NULL (SET NULL). created_by de votes,
        # sessions tambem vai pra NULL -- historico preservado.
        await self.db.delete(actor)
        await self.db.commit()
