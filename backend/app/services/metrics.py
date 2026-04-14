from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import cast, desc, func, select
from sqlalchemy.dialects.postgresql import DATE
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.group import Group
from app.services.events import EVENT_MEMBER_ACTIVATED


async def compute_event_metrics(db: AsyncSession) -> dict:
    """Agrega eventos pra dashboard de observability.

    Retorna counts por event_type em 7d / 28d / total, seat count, top grupos
    por atividade em 28d e time series diaria em 28d.
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

    # top grupos por atividade em 28d
    top_rows = (
        await db.execute(
            select(
                Event.group_id,
                Group.name,
                func.count().label("n"),
            )
            .join(Group, Group.id == Event.group_id)
            .where(Event.occurred_at >= d28, Event.group_id.isnot(None))
            .group_by(Event.group_id, Group.name)
            .order_by(desc("n"))
            .limit(10)
        )
    ).all()
    top_groups = [{"group_id": str(r[0]), "name": r[1], "events_28d": int(r[2])} for r in top_rows]

    # time series diaria em 28d -- fill de zeros pros dias sem evento
    day_col = cast(Event.occurred_at, DATE).label("d")
    raw_rows = (
        await db.execute(
            select(day_col, func.count().label("n"))
            .where(Event.occurred_at >= d28)
            .group_by(day_col)
            .order_by(day_col)
        )
    ).all()
    counts_by_day = {r[0]: int(r[1]) for r in raw_rows}
    today = now.date()
    daily_28d = []
    for i in range(27, -1, -1):
        d = today - timedelta(days=i)
        daily_28d.append({"date": d.isoformat(), "count": counts_by_day.get(d, 0)})

    return {
        "totals": totals,
        "last_7d": last_7d,
        "last_28d": last_28d,
        "seats_activated": int(seats or 0),
        "top_groups": top_groups,
        "daily_28d": daily_28d,
    }
