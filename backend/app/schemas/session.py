from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import SessionRsvp


class SessionCreate(BaseModel):
    game_id: uuid.UUID
    title: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
    start_at: datetime
    duration_minutes: int = Field(60, ge=30, le=480)
    max_participants: int | None = Field(None, ge=2, le=100)


class SessionUpdate(BaseModel):
    title: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=500)
    start_at: datetime | None = None
    duration_minutes: int | None = Field(None, ge=30, le=480)
    max_participants: int | None = Field(None, ge=2, le=100)
    status: str | None = None


class RsvpUpdate(BaseModel):
    status: SessionRsvp


class RsvpResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    status: SessionRsvp
    updated_at: datetime


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    game_id: uuid.UUID
    created_by: uuid.UUID | None
    title: str
    description: str | None
    start_at: datetime
    duration_minutes: int
    max_participants: int | None
    status: str
    created_at: datetime
    rsvp_yes: int = 0
    rsvp_no: int = 0
    rsvp_maybe: int = 0
    user_rsvp: SessionRsvp | None = None
    rsvps: list[RsvpResponse] = []
