from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ThemeCreate(BaseModel):
    theme_name: str
    description: str | None = None
    image_url: str | None = None
    month_year: str | None = Field(
        None, pattern=r"^\d{4}-\d{2}$", description="YYYY-MM, default: mes atual"
    )


class ThemeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    month_year: str
    theme_name: str
    description: str | None
    image_url: str | None = None
    decided_by: str
    decided_at: datetime
    created_by: uuid.UUID | None


# ---- cycles ----


class SuggestionCreate(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None


class SuggestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cycle_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    user_avatar: str | None = None
    user_discord_id: str | None = None
    name: str
    description: str | None
    image_url: str | None
    vote_count: int = 0


class VoteCast(BaseModel):
    suggestion_id: uuid.UUID


class CycleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    month_year: str
    phase: str
    opened_by: uuid.UUID | None
    winner_suggestion_id: uuid.UUID | None
    tiebreak_kind: str | None
    tied_suggestion_ids: list[uuid.UUID] | None
    decided_at: datetime | None
    suggestions: list[SuggestionResponse] = []
    user_suggestion_id: uuid.UUID | None = None
    user_vote_suggestion_id: uuid.UUID | None = None
    total_votes: int = 0
