from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums import HardwareTier
from app.models.user import User


class HardwareUpdate(BaseModel):
    tier: HardwareTier
    notes: str | None = Field(None, max_length=500)


class HardwareResponse(BaseModel):
    user_id: uuid.UUID
    tier: HardwareTier
    notes: str | None = None


class SettingsUpdate(BaseModel):
    # IANA tz: max real-world ~32 chars, 64 e folga
    timezone: str | None = Field(None, max_length=64)
    # email RFC max e 320 mas na pratica 254
    notification_email: str | None = Field(None, max_length=254)
    # BCP47 tag curto (en, pt, pt-BR); so en/pt sao suportados hoje
    locale: str | None = Field(None, max_length=8)
    onboarding_completed: bool | None = None
    # dict pode crescer mt, valida tamanho serializado pra evitar bloat no JSONB
    settings: dict | None = Field(default=None)

    @field_validator("locale")
    @classmethod
    def _norm_locale(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lower()
        if not v:
            return None
        # aceita prefixo (pt-br -> pt)
        base = v.split("-", 1)[0]
        if base not in {"en", "pt"}:
            raise ValueError("locale nao suportado")
        return base

    @field_validator("settings")
    @classmethod
    def _cap_settings(cls, v: dict | None) -> dict | None:
        if v is None:
            return None
        import json

        # 16KB e mt mais do que precisamos pra prefs de UI
        if len(json.dumps(v)) > 16_384:
            raise ValueError("settings excede 16KB")
        return v


class SettingsResponse(BaseModel):
    timezone: str | None
    notification_email: str | None
    locale: str | None
    onboarding_completed: bool
    settings: dict


class OnboardingResponse(BaseModel):
    has_group: bool
    has_games: bool
    has_session: bool
    has_vote: bool
    steps_done: int
    steps_total: int
    complete: bool


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
    locale: str | None = None
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
            locale=user.locale,
            hardware_tier=hw_tier,
            steam_linked=steam is not None,
            steam_id=steam.external_id if steam else None,
            is_new_user=is_new_user,
            is_sys_admin=user.is_sys_admin,
        )
