"""SSE realtime endpoint.

EventSource nao manda Authorization header, entao auth e via ?token=<jwt>.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.group import GroupMembership
from app.repositories.user_repo import UserRepository
from app.services.realtime import event_stream, get_broker

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/stream")
async def stream(
    token: Annotated[str, Query(...)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(401, "invalid token")
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
