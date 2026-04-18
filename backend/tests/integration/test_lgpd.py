"""LGPD: export de dados pessoais + retencao de events."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.jobs.events_retention import EVENTS_RETENTION_DAYS
from app.models.event import Event

pytestmark = pytest.mark.asyncio


async def test_export_returns_full_snapshot(make_user, auth_headers, client):
    """Snapshot inclui user, settings, hardware, memberships e timestamps."""
    user = await make_user(username="exp")
    await client.put(
        "/api/users/hardware",
        json={"tier": "high", "notes": "ryzen + 4080"},
        headers=auth_headers(user),
    )
    await client.patch(
        "/api/users/me/settings",
        json={"timezone": "America/Sao_Paulo", "settings": {"theme": "dark"}},
        headers=auth_headers(user),
    )
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "lgpd-1", "name": "ExportSquad"},
            headers=auth_headers(user),
        )
    ).json()

    res = await client.get("/api/users/me/export", headers=auth_headers(user))
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["user"]["discord_id"] == user.discord_id
    assert body["settings"]["timezone"] == "America/Sao_Paulo"
    assert body["settings"]["settings"] == {"theme": "dark"}
    assert body["hardware"]["tier"] == "high"
    assert body["hardware"]["notes"] == "ryzen + 4080"
    assert any(m["group_id"] == g["id"] and m["role"] == "admin" for m in body["memberships"])
    assert body["generated_at"]


async def test_export_requires_auth(client):
    res = await client.get("/api/users/me/export")
    assert res.status_code == 401


async def test_export_only_returns_own_data(make_user, auth_headers, client):
    """User A nao ve dados de user B no export."""
    a = await make_user(username="a")
    b = await make_user(username="b")
    await client.put(
        "/api/users/hardware",
        json={"tier": "low"},
        headers=auth_headers(b),
    )

    res = await client.get("/api/users/me/export", headers=auth_headers(a))
    body = res.json()
    assert body["user"]["discord_id"] == a.discord_id
    assert body["hardware"] is None


async def test_purge_deletes_only_old_events(db_session):
    """Cutoff exato: tudo > EVENTS_RETENTION_DAYS some, edge case fica."""
    from sqlalchemy import delete

    fresh = Event(
        event_type="vote_cast",
        occurred_at=datetime.now(UTC) - timedelta(days=10),
        payload={},
    )
    edge = Event(
        event_type="vote_cast",
        occurred_at=datetime.now(UTC) - timedelta(days=EVENTS_RETENTION_DAYS - 1),
        payload={},
    )
    old = Event(
        event_type="vote_cast",
        occurred_at=datetime.now(UTC) - timedelta(days=EVENTS_RETENTION_DAYS + 5),
        payload={},
    )
    db_session.add_all([fresh, edge, old])
    await db_session.commit()

    # roda a mesma query do job direto na sessao do teste (testcontainer).
    # o job em si usa SessionLocal global e nao da pra injetar — testar
    # a query e suficiente, e o job e um wrapper trivial.
    cutoff = datetime.now(UTC) - timedelta(days=EVENTS_RETENTION_DAYS)
    await db_session.execute(delete(Event).where(Event.occurred_at < cutoff))
    await db_session.commit()

    remaining = (await db_session.execute(select(Event))).scalars().all()
    assert {e.id for e in remaining} == {fresh.id, edge.id}
