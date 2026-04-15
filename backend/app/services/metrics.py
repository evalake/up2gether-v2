from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import cast, desc, func, select
from sqlalchemy.dialects.postgresql import DATE
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.group import Group, GroupMembership
from app.services.events import (
    EVENT_MEMBER_ACTIVATED,
    EVENT_SESSION_COMPLETED,
    EVENT_SESSION_CREATED,
)

# tiers do BUSINESS.md. bucketizacao por count(activated_at) de cada grupo.
# preco em BRL/mes. free e over geram 0 MRR (sem tier publico acima de 500).
TIER_PRICE_BRL = {"free": 0, "pro": 29, "community": 89, "creator": 249, "over": 0}


def _tier_for_seats(seats: int) -> str:
    if seats <= 10:
        return "free"
    if seats <= 30:
        return "pro"
    if seats <= 100:
        return "community"
    if seats <= 500:
        return "creator"
    return "over"


async def compute_event_metrics(db: AsyncSession) -> dict:
    """Agrega eventos pra dashboard de observability.

    Retorna counts por event_type em 7d / 28d / total, seat count, top grupos
    por atividade em 28d e time series diaria em 28d.
    """
    now = datetime.now(UTC)
    d1 = now - timedelta(days=1)
    d7 = now - timedelta(days=7)
    d28 = now - timedelta(days=28)

    async def _active_groups(since: datetime) -> int:
        return int(
            (
                await db.execute(
                    select(func.count(func.distinct(Event.group_id))).where(
                        Event.occurred_at >= since,
                        Event.group_id.isnot(None),
                    )
                )
            ).scalar_one()
            or 0
        )

    active_groups_1d = await _active_groups(d1)
    active_groups_7d = await _active_groups(d7)
    active_groups_28d = await _active_groups(d28)

    active_users_7d = int(
        (
            await db.execute(
                select(func.count(func.distinct(Event.user_id))).where(
                    Event.occurred_at >= d7,
                    Event.user_id.isnot(None),
                )
            )
        ).scalar_one()
        or 0
    )

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

    # health KPIs: activation e completion
    groups_created_total = (
        await db.execute(select(func.count()).select_from(Group))
    ).scalar_one() or 0

    groups_with_session = (
        await db.execute(
            select(func.count(func.distinct(Event.group_id))).where(
                Event.event_type == EVENT_SESSION_CREATED,
                Event.group_id.isnot(None),
            )
        )
    ).scalar_one() or 0

    activation_rate = (
        round(groups_with_session / groups_created_total, 4) if groups_created_total else 0
    )

    sessions_created_28d = int(last_28d.get(EVENT_SESSION_CREATED, 0))
    sessions_completed_28d = int(last_28d.get(EVENT_SESSION_COMPLETED, 0))
    session_completion_rate_28d = (
        round(sessions_completed_28d / sessions_created_28d, 4) if sessions_created_28d else 0
    )

    # top referrers: agrega payload->>'ref' dos events de signup.
    # so aparece se ref nao for null. preserva nao-ativos pra futuro funnel.
    ref_col = Event.payload["ref"].astext.label("ref")
    ref_rows = (
        await db.execute(
            select(ref_col, func.count().label("n"))
            .where(
                Event.event_type == EVENT_MEMBER_ACTIVATED,
                Event.payload["ref"].astext.isnot(None),
            )
            .group_by(ref_col)
            .order_by(desc("n"))
            .limit(10)
        )
    ).all()
    top_referrers = [{"ref": r[0], "count": int(r[1])} for r in ref_rows]

    # tier breakdown + MRR potencial se todos pagassem (ignora legacy_free).
    # util pra validar pricing antes de ligar cobranca: onde a distribuicao
    # real dos grupos cai hoje, e quanto seria o MRR teorico.
    seats_stmt = (
        select(
            Group.id,
            func.count(GroupMembership.id)
            .filter(GroupMembership.activated_at.isnot(None))
            .label("seats"),
            Group.legacy_free,
        )
        .outerjoin(GroupMembership, GroupMembership.group_id == Group.id)
        .group_by(Group.id, Group.legacy_free)
    )
    seats_rows = (await db.execute(seats_stmt)).all()
    tiers = {"free": 0, "pro": 0, "community": 0, "creator": 0, "over": 0}
    mrr_if_all_paid = 0
    legacy_groups = 0
    for _gid, seats, legacy in seats_rows:
        t = _tier_for_seats(int(seats or 0))
        tiers[t] += 1
        mrr_if_all_paid += TIER_PRICE_BRL[t]
        if legacy:
            legacy_groups += 1

    return {
        "totals": totals,
        "last_7d": last_7d,
        "last_28d": last_28d,
        "seats_activated": int(seats or 0),
        "top_groups": top_groups,
        "daily_28d": daily_28d,
        "groups_created_total": int(groups_created_total),
        "groups_with_session": int(groups_with_session),
        "activation_rate": activation_rate,
        "sessions_created_28d": sessions_created_28d,
        "sessions_completed_28d": sessions_completed_28d,
        "session_completion_rate_28d": session_completion_rate_28d,
        "groups_by_tier": tiers,
        "mrr_if_all_paid_brl": mrr_if_all_paid,
        "legacy_groups": legacy_groups,
        "active_groups_1d": active_groups_1d,
        "active_groups_7d": active_groups_7d,
        "active_groups_28d": active_groups_28d,
        "active_users_7d": active_users_7d,
        "top_referrers": top_referrers,
    }
