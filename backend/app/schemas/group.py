from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums import GroupRole
from app.schemas.user import UserResponse

# whitelist SSRF: webhook tem que ser Discord de verdade (prefixos oficiais apenas).
# se um dia precisar de outros providers, adiciona explicito; default e negar.
_DISCORD_WEBHOOK_RE = re.compile(
    r"^https://(?:ptb\.|canary\.)?discord(?:app)?\.com/api/webhooks/\d+/[\w-]+$"
)


def _validate_webhook_url(v: str | None) -> str | None:
    if v is None or v == "":
        return None
    if not _DISCORD_WEBHOOK_RE.match(v):
        raise ValueError("webhook_url precisa ser url oficial do Discord")
    return v


class GroupCreate(BaseModel):
    discord_guild_id: str = Field(max_length=64)
    name: str = Field(max_length=120)
    icon_url: str | None = Field(None, max_length=512)
    webhook_url: str | None = Field(None, max_length=512)
    discord_permissions: str | None = Field(None, max_length=32)

    @field_validator("webhook_url")
    @classmethod
    def _webhook(cls, v: str | None) -> str | None:
        return _validate_webhook_url(v)


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    discord_guild_id: str
    icon_url: str | None = None
    banner_url: str | None = None
    splash_url: str | None = None
    accent_color: int | None = None
    description: str | None = None
    current_game_id: uuid.UUID | None = None
    current_game_source: str | None = None
    current_game_set_at: datetime | None = None
    current_game_set_by: uuid.UUID | None = None
    current_game_vote_id: uuid.UUID | None = None
    owner_user_id: uuid.UUID | None = None
    webhook_url: str | None = None
    budget_max: float | None = None
    typical_party_size: int = 4
    created_at: datetime


class GroupWithStats(GroupResponse):
    member_count: int = 0
    game_count: int = 0
    active_vote_sessions: int = 0
    user_role: GroupRole = GroupRole.MEMBER
    # seat model (BUSINESS.md): seat_count = membros com activated_at (primeiro
    # login via discord). tier e seat_limit derivados. legacy_free grandfathering.
    seat_count: int = 0
    tier: str = "free"
    seat_limit: int | None = 10
    legacy_free: bool = False


class GroupMembershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    group_id: uuid.UUID
    role: GroupRole
    joined_at: datetime
    user: UserResponse | None = None


class WebhookUpdate(BaseModel):
    webhook_url: str | None = Field(None, max_length=512)

    @field_validator("webhook_url")
    @classmethod
    def _webhook(cls, v: str | None) -> str | None:
        return _validate_webhook_url(v)


class CurrentGameUpdate(BaseModel):
    game_id: uuid.UUID | None = None  # null = destravar manual + limpar
    lock_manual: bool = True  # true = source vira 'manual', vote nao sobrescreve


class CurrentGameAudit(BaseModel):
    game_id: uuid.UUID
    name: str
    cover_url: str | None = None
    source: str | None = None  # 'vote' | 'manual'
    set_at: datetime | None = None
    set_by_user_id: uuid.UUID | None = None
    set_by_user_name: str | None = None
    vote_id: uuid.UUID | None = None
    vote_title: str | None = None
    vote_ballots_count: int | None = None
    vote_eligible_count: int | None = None
    vote_winner_approvals: int | None = None
    vote_was_tiebreak: bool = False
    vote_runner_ups: list[dict] = []
    added_by_user_id: uuid.UUID | None = None
    added_by_user_name: str | None = None
    added_at: datetime | None = None
    interest_want_count: int = 0
    interest_meh_count: int = 0
    interest_nope_count: int = 0
    owners_count: int = 0
    sessions_count: int = 0
    playtime_leaderboard: list[dict] = []  # [{user_id, name, hours, hours_2weeks, avatar}]


class PromoteRequest(BaseModel):
    new_role: GroupRole  # admin ou mod (member nao faz sentido em promote)
