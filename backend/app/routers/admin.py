from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.services.metrics import compute_event_metrics

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_sys_admin(actor) -> None:
    if not actor.is_sys_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Sys admin required")


@router.get("/metrics/events")
async def metrics_events(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    _require_sys_admin(actor)
    return await compute_event_metrics(db)
