from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.services.events import EVENT_MEMBER_ACTIVATED


async def compute_event_metrics(db: AsyncSession) -> dict:
    """Agrega eventos pra dashboard de observability.

    Retorna counts por event_type em 7d / 28d / total, mais seat count
    (users distintos que tiveram member_activated).
    """
    now = datetime.now(UTC)
    d7 = now - timedelta(days=7)
    d28 = now - timedelta(days=28)

    async def _counts_since(since: datetime | None) -> dict[str, int]:
        stmt = select(Event.event_type, func.count().label("n"))
        if since is not None:
            stmt = stmt.where(Event.occurred_at >= since)
        stmt = stmt.group_by(Event.event_type)
        rows = (await db.execute(stmt)).all()
        return {r[0]: int(r[1]) for r in rows}

    totals = await _counts_since(None)
    last_7d = await _counts_since(d7)
    last_28d = await _counts_since(d28)

    seats = (
        await db.execute(
            select(func.count(func.distinct(Event.user_id))).where(
                Event.event_type == EVENT_MEMBER_ACTIVATED,
                Event.user_id.isnot(None),
            )
        )
    ).scalar_one()

    return {
        "totals": totals,
        "last_7d": last_7d,
        "last_28d": last_28d,
        "seats_activated": int(seats or 0),
    }
