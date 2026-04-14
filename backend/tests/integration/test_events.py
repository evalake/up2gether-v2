"""Tests do observability de eventos."""

from __future__ import annotations

import pytest
from sqlalchemy import select

from app.models.event import Event
from app.services.events import (
    EVENT_GROUP_CREATED,
    EVENT_GROUP_JOINED,
    track_event,
)

pytestmark = pytest.mark.asyncio


async def test_track_event_persists_row(db_session, make_user):
    user = await make_user(username="tracker")
    await track_event(db_session, "custom_test", user_id=user.id, payload={"k": "v"})
    await db_session.commit()

    rows = (await db_session.execute(select(Event))).scalars().all()
    assert len(rows) == 1
    assert rows[0].event_type == "custom_test"
    assert rows[0].user_id == user.id
    assert rows[0].payload == {"k": "v"}
    assert rows[0].occurred_at is not None


async def test_track_event_defaults(db_session):
    await track_event(db_session, "boot")
    await db_session.commit()

    row = (await db_session.execute(select(Event))).scalar_one()
    assert row.user_id is None
    assert row.group_id is None
    assert row.payload == {}


async def test_group_creation_emits_group_created_event(
    make_user, auth_headers, client, db_session
):
    user = await make_user(username="creator")
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": "ev-g-1", "name": "Squad"},
        headers=auth_headers(user),
    )
    assert res.status_code == 200
    group_id = res.json()["id"]

    events = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_GROUP_CREATED)))
        .scalars()
        .all()
    )
    assert len(events) == 1
    ev = events[0]
    assert str(ev.group_id) == group_id
    assert ev.user_id == user.id
    assert ev.payload.get("discord_guild_id") == "ev-g-1"


async def test_joining_existing_group_emits_group_joined_not_created(
    make_user, auth_headers, client, db_session
):
    owner = await make_user(username="owner")
    joiner = await make_user(username="joiner")

    await client.post(
        "/api/groups",
        json={"discord_guild_id": "ev-g-2", "name": "Squad"},
        headers=auth_headers(owner),
    )
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": "ev-g-2", "name": "Squad"},
        headers=auth_headers(joiner),
    )
    assert res.status_code == 200

    created = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_GROUP_CREATED)))
        .scalars()
        .all()
    )
    joined = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_GROUP_JOINED)))
        .scalars()
        .all()
    )
    assert len(created) == 1
    assert len(joined) == 1
    assert joined[0].user_id == joiner.id


async def test_rejoining_existing_group_does_not_emit_duplicate_joined(
    make_user, auth_headers, client, db_session
):
    owner = await make_user(username="owner")

    await client.post(
        "/api/groups",
        json={"discord_guild_id": "ev-g-3", "name": "Squad"},
        headers=auth_headers(owner),
    )
    # mesmo user chama de novo -- ja e membro, nao deve emitir joined
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "ev-g-3", "name": "Squad"},
        headers=auth_headers(owner),
    )

    joined = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_GROUP_JOINED)))
        .scalars()
        .all()
    )
    assert len(joined) == 0
