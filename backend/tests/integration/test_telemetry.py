"""Tests do endpoint publico de telemetria (landing visit).

Fecha o topo do funil: visita -> signup. Sem auth, com rate limit, so armazena ref.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models.event import Event
from app.services.events import EVENT_LANDING_VISIT

pytestmark = pytest.mark.asyncio


async def test_visit_stores_event_with_ref(client, db_session):
    res = await client.post("/api/telemetry/visit", json={"ref": "streamerX"})
    assert res.status_code == 204

    rows = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_LANDING_VISIT)))
        .scalars()
        .all()
    )
    assert len(rows) == 1
    assert rows[0].payload.get("ref") == "streamerX"
    assert rows[0].user_id is None
    assert rows[0].group_id is None


async def test_visit_no_ref_still_tracked(client, db_session):
    res = await client.post("/api/telemetry/visit", json={})
    assert res.status_code == 204

    rows = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_LANDING_VISIT)))
        .scalars()
        .all()
    )
    assert len(rows) == 1
    assert "ref" not in rows[0].payload


async def test_visit_truncates_long_ref(client, db_session):
    long_ref = "x" * 200
    res = await client.post("/api/telemetry/visit", json={"ref": long_ref})
    assert res.status_code == 204

    row = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_LANDING_VISIT)))
        .scalars()
        .one()
    )
    assert len(row.payload["ref"]) == 64


async def test_visit_is_rate_limited(client):
    # bucket dedicado pra telemetry: 3/burst, refill 3/min. 4a deve 429.
    for _ in range(3):
        r = await client.post("/api/telemetry/visit", json={})
        assert r.status_code == 204
    r = await client.post("/api/telemetry/visit", json={})
    assert r.status_code == 429
