from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import HardwareTier
from app.models.user import User, UserHardwareProfile
from app.schemas.user import (
    HardwareResponse,
    HardwareUpdate,
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
            onboarding_completed=actor.onboarding_completed,
            settings=actor.settings or {},
        )

    async def update_settings(self, actor: User, data: SettingsUpdate) -> SettingsResponse:
        if data.timezone is not None:
            actor.timezone = data.timezone
        if data.notification_email is not None:
            actor.notification_email = data.notification_email
        if data.onboarding_completed is not None:
            actor.onboarding_completed = data.onboarding_completed
        if data.settings is not None:
            merged = dict(actor.settings or {})
            merged.update(data.settings)
            actor.settings = merged
        await self.db.commit()
        await self.db.refresh(actor)
        return await self.get_settings(actor)
