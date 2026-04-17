from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.models.notification import Notification
from app.services.notifications import notify

router = APIRouter(tags=["notifications"], prefix="/notifications")


class NotificationOut(BaseModel):
    id: uuid.UUID
    kind: str
    title: str
    body: str | None
    link: str | None
    data: dict
    read_at: datetime | None
    created_at: datetime


class MarkReadIn(BaseModel):
    ids: list[uuid.UUID] | None = None  # None = mark all


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[NotificationOut]:
    rows = (
        (
            await db.execute(
                select(Notification)
                .where(Notification.user_id == actor.id)
                .order_by(Notification.created_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return [
        NotificationOut(
            id=n.id,
            kind=n.kind,
            title=n.title,
            body=n.body,
            link=n.link,
            data=n.data or {},
            read_at=n.read_at,
            created_at=n.created_at,
        )
        for n in rows
    ]


@router.post("/mark-read")
async def mark_read(
    payload: MarkReadIn,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    from datetime import UTC

    now = datetime.now(UTC)
    stmt = update(Notification).where(
        Notification.user_id == actor.id,
        Notification.read_at.is_(None),
    )
    if payload.ids:
        stmt = stmt.where(Notification.id.in_(payload.ids))
    stmt = stmt.values(read_at=now)
    result = await db.execute(stmt)
    await db.commit()
    return {"marked": result.rowcount or 0}


@router.delete("/{nid}")
async def delete_notification(
    nid: uuid.UUID,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    await db.execute(
        delete(Notification).where(Notification.id == nid, Notification.user_id == actor.id)
    )
    await db.commit()
    return {"ok": True}


@router.delete("")
async def clear_notifications(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    await db.execute(delete(Notification).where(Notification.user_id == actor.id))
    await db.commit()
    return {"ok": True}


@router.post("/test")
async def send_test(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    await notify(
        db,
        user_ids=[actor.id],
        kind="test",
        title="teste",
        body="notificacao de teste funcionando",
        link="/",
    )
    await db.commit()
    return {"ok": True}
