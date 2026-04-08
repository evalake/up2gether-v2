from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import HardwareTier
from app.models.user import User


class HardwareUpdate(BaseModel):
    tier: HardwareTier
    notes: str | None = None


class HardwareResponse(BaseModel):
    user_id: uuid.UUID
    tier: HardwareTier
    notes: str | None = None


class SettingsUpdate(BaseModel):
    timezone: str | None = None
    notification_email: str | None = None
    onboarding_completed: bool | None = None
    settings: dict | None = Field(default=None)


class SettingsResponse(BaseModel):
    timezone: str | None
    notification_email: str | None
    onboarding_completed: bool
    settings: dict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    discord_id: str
    discord_username: str
    discord_display_name: str | None = None
    discord_avatar: str | None = None
    discord_email: str | None = None
    created_at: datetime
    onboarding_completed: bool
    hardware_tier: HardwareTier = HardwareTier.UNKNOWN
    steam_linked: bool = False
    steam_id: str | None = None
    is_new_user: bool = False
    is_sys_admin: bool = False

    @classmethod
    def from_user(cls, user: User, *, is_new_user: bool = False) -> UserResponse:
        from app.domain.enums import AuthProvider

        steam = next((i for i in user.integrations if i.provider == AuthProvider.STEAM), None)
        hw_tier = HardwareTier.UNKNOWN
        if user.hardware_profile is not None:
            try:
                hw_tier = HardwareTier(user.hardware_profile.tier)
            except ValueError:
                hw_tier = HardwareTier.UNKNOWN

        return cls(
            id=user.id,
            discord_id=user.discord_id,
            discord_username=user.discord_username,
            discord_display_name=user.discord_display_name,
            discord_avatar=user.discord_avatar,
            discord_email=user.discord_email,
            created_at=user.created_at,
            onboarding_completed=user.onboarding_completed,
            hardware_tier=hw_tier,
            steam_linked=steam is not None,
            steam_id=steam.external_id if steam else None,
            is_new_user=is_new_user,
            is_sys_admin=user.is_sys_admin,
        )
