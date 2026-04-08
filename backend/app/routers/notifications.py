from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser
from app.models.notification import Notification, PushSubscription
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


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscribeIn(BaseModel):
    endpoint: str
    keys: PushKeys


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
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
        delete(Notification).where(
            Notification.id == nid, Notification.user_id == actor.id
        )
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


@router.get("/push/vapid-public-key")
async def vapid_public_key(_: CurrentUser) -> dict:
    key = get_settings().vapid_public_key
    if not key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "push nao configurado")
    return {"key": key}


@router.post("/push/subscribe")
async def push_subscribe(
    payload: PushSubscribeIn,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    existing = (
        await db.execute(
            select(PushSubscription).where(
                PushSubscription.user_id == actor.id,
                PushSubscription.endpoint == payload.endpoint,
            )
        )
    ).scalar_one_or_none()
    if existing:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    else:
        db.add(
            PushSubscription(
                user_id=actor.id,
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
            )
        )
    await db.commit()
    return {"ok": True}


class PushUnsubscribeIn(BaseModel):
    endpoint: str


@router.post("/push/unsubscribe")
async def push_unsubscribe(
    payload: PushUnsubscribeIn,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    await db.execute(
        delete(PushSubscription).where(
            PushSubscription.user_id == actor.id,
            PushSubscription.endpoint == payload.endpoint,
        )
    )
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
