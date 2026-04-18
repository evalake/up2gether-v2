from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.enums import VoteStatus


class VoteSessionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str | None = Field(None, max_length=1000)
    candidate_game_ids: list[uuid.UUID] = Field(..., min_length=2, max_length=20)
    duration_hours: int = Field(24, ge=1, le=720)


class VoteStageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    stage_number: int
    candidate_game_ids: list[uuid.UUID]
    max_selections: int
    status: VoteStatus
    opens_at: datetime
    closes_at: datetime | None
    closed_at: datetime | None


class VoteSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    created_by: uuid.UUID | None
    title: str
    description: str | None
    status: VoteStatus
    candidate_game_ids: list[uuid.UUID]
    eligible_voter_count: int
    quorum_count: int
    max_selections: int
    opens_at: datetime
    closes_at: datetime | None
    closed_at: datetime | None
    winner_game_id: uuid.UUID | None
    created_at: datetime
    ballots_count: int = 0
    tallies: dict[uuid.UUID, int] = Field(default_factory=dict)
    your_approvals: list[uuid.UUID] = Field(default_factory=list)
    current_stage_number: int | None = None
    total_stages: int | None = None
    stages: list[VoteStageResponse] = Field(default_factory=list)


class BallotSubmit(BaseModel):
    # cap = max candidate_game_ids permitidos numa vote session
    approvals: list[uuid.UUID] = Field(..., max_length=20)


class VoteAuditVoter(BaseModel):
    user_id: uuid.UUID
    discord_id: str | None
    display_name: str
    avatar_url: str | None
    approvals: list[uuid.UUID]
    stage_id: uuid.UUID | None
    stage_number: int | None
    submitted_at: datetime


class VoteAuditGame(BaseModel):
    id: uuid.UUID
    name: str
    cover_url: str | None


class VoteAuditCreator(BaseModel):
    id: uuid.UUID | None
    discord_id: str | None = None
    display_name: str | None
    avatar_url: str | None


class VoteAuditResponse(BaseModel):
    session: VoteSessionResponse
    creator: VoteAuditCreator
    games: list[VoteAuditGame]
    voters: list[VoteAuditVoter]
    non_voters: list[VoteAuditCreator]  # mesmo shape, reaproveita
