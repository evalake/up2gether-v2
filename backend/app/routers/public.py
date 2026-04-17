from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import RateLimitTelemetry
from app.domain.enums import SessionRsvp
from app.models.game import Game
from app.models.group import Group
from app.models.session import PlaySession, SessionRsvpRow
from app.services.events import EVENT_LANDING_VISIT, track_event

router = APIRouter(tags=["public"])


class VisitPayload(BaseModel):
    # ref capturado da query ?ref=. max_length limita body antes do bucket gastar
    # token em payload inflado. truncado de novo na escrita pra 64.
    ref: str | None = Field(None, max_length=200)


@router.post("/telemetry/visit", status_code=status.HTTP_204_NO_CONTENT)
async def track_visit(
    payload: VisitPayload,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rl: RateLimitTelemetry,
) -> None:
    body: dict = {}
    if payload.ref:
        body["ref"] = payload.ref[:64]
    await track_event(db, EVENT_LANDING_VISIT, payload=body)
    await db.commit()


class PublicSessionCard(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    title: str
    start_at: str
    duration_minutes: int
    game_name: str | None
    group_name: str
    rsvp_yes: int
    rsvp_maybe: int


@router.get("/public/sessions/{session_id}", response_model=PublicSessionCard)
async def public_session(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rl: RateLimitTelemetry,
) -> PublicSessionCard:
    s = await db.get(PlaySession, session_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    g = await db.get(Group, s.group_id)
    game = await db.get(Game, s.game_id) if s.game_id else None
    rows = (
        (await db.execute(select(SessionRsvpRow).where(SessionRsvpRow.session_id == s.id)))
        .scalars()
        .all()
    )
    yes = sum(1 for r in rows if r.status == SessionRsvp.YES)
    maybe = sum(1 for r in rows if r.status == SessionRsvp.MAYBE)
    return PublicSessionCard(
        id=s.id,
        group_id=s.group_id,
        title=s.title,
        start_at=s.start_at.isoformat(),
        duration_minutes=s.duration_minutes,
        game_name=game.name if game else None,
        group_name=g.name if g else "",
        rsvp_yes=yes,
        rsvp_maybe=maybe,
    )
