"""SSE realtime endpoint.

EventSource nao manda Authorization header. Antes mandava o access_token em
?token=<jwt>, o que vaza em logs de proxy (Fly/Cloudflare). Agora o cliente
pega um ticket efemero (30s, scope sse) em POST /events/ticket autenticado
com Bearer, e conecta no stream com ?ticket=<efemero>. Access_token nunca
entra em URL.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, decode_access_token
from app.models.group import GroupMembership
from app.repositories.user_repo import UserRepository
from app.services.realtime import event_stream, get_broker

router = APIRouter(prefix="/events", tags=["events"])

_TICKET_SCOPE = "sse-stream"
_TICKET_TTL_SECONDS = 30


def _issue_ticket(user_id: uuid.UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "scope": _TICKET_SCOPE,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=_TICKET_TTL_SECONDS)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_ticket(ticket: str) -> dict | None:
    payload = decode_access_token(ticket)
    if not payload or payload.get("scope") != _TICKET_SCOPE:
        return None
    return payload


class SseTicketResponse(BaseModel):
    ticket: str
    expires_in: int


@router.post("/ticket", response_model=SseTicketResponse)
async def issue_ticket(current: CurrentUser) -> SseTicketResponse:
    return SseTicketResponse(
        ticket=_issue_ticket(current.id),
        expires_in=_TICKET_TTL_SECONDS,
    )


@router.get("/stream")
async def stream(
    ticket: Annotated[str, Query(...)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    payload = _decode_ticket(ticket)
    if not payload or "sub" not in payload:
        raise HTTPException(401, "invalid ticket")
    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError as exc:
        raise HTTPException(401, "invalid token subject") from exc
    user = await UserRepository(db).get_by_id(user_id)
    if user is None:
        raise HTTPException(401, "user not found")

    rows = (
        (
            await db.execute(
                select(GroupMembership.group_id).where(GroupMembership.user_id == user.id)
            )
        )
        .scalars()
        .all()
    )
    group_ids = list(rows)

    broker = get_broker()
    q, subscribed = await broker.subscribe(group_ids)

    async def gen():
        try:
            async for chunk in event_stream(q):
                yield chunk
        finally:
            await broker.unsubscribe(q, subscribed)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
