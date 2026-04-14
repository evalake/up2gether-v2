"""Tests do observability de eventos."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.models.event import Event
from app.services.events import (
    EVENT_GROUP_CREATED,
    EVENT_GROUP_JOINED,
    EVENT_SESSION_COMPLETED,
    EVENT_SESSION_CREATED,
    EVENT_VOTE_CAST,
    EVENT_VOTE_COMPLETED,
    EVENT_VOTE_CREATED,
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


async def _setup_group_and_game(make_user, auth_headers, client, guild):
    owner = await make_user(username="sowner")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": guild, "name": "Squad"},
            headers=auth_headers(owner),
        )
    ).json()
    game = (
        await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": "GameX"},
            headers=auth_headers(owner),
        )
    ).json()
    return owner, g, game


async def test_session_creation_emits_session_created_event(
    make_user, auth_headers, client, db_session
):
    owner, g, game = await _setup_group_and_game(make_user, auth_headers, client, "ev-s-1")
    start_at = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    res = await client.post(
        f"/api/groups/{g['id']}/sessions",
        json={
            "game_id": game["id"],
            "title": "Raid",
            "start_at": start_at,
            "duration_minutes": 60,
        },
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text
    session_id = res.json()["id"]

    evs = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_SESSION_CREATED)))
        .scalars()
        .all()
    )
    assert len(evs) == 1
    assert evs[0].user_id == owner.id
    assert str(evs[0].group_id) == g["id"]
    assert evs[0].payload["session_id"] == session_id


async def test_session_marked_completed_emits_event(make_user, auth_headers, client, db_session):
    owner, g, game = await _setup_group_and_game(make_user, auth_headers, client, "ev-s-2")
    start_at = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    s = (
        await client.post(
            f"/api/groups/{g['id']}/sessions",
            json={
                "game_id": game["id"],
                "title": "Raid",
                "start_at": start_at,
                "duration_minutes": 60,
            },
            headers=auth_headers(owner),
        )
    ).json()

    # marca como completa via update
    res = await client.patch(
        f"/api/groups/{g['id']}/sessions/{s['id']}",
        json={"status": "completed"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text

    evs = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_SESSION_COMPLETED)))
        .scalars()
        .all()
    )
    assert len(evs) == 1
    assert evs[0].payload["session_id"] == s["id"]


async def test_session_update_without_status_change_does_not_emit_completed(
    make_user, auth_headers, client, db_session
):
    owner, g, game = await _setup_group_and_game(make_user, auth_headers, client, "ev-s-3")
    start_at = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    s = (
        await client.post(
            f"/api/groups/{g['id']}/sessions",
            json={
                "game_id": game["id"],
                "title": "Raid",
                "start_at": start_at,
                "duration_minutes": 60,
            },
            headers=auth_headers(owner),
        )
    ).json()

    # so muda titulo, nao o status
    await client.patch(
        f"/api/groups/{g['id']}/sessions/{s['id']}",
        json={"title": "Raid renamed"},
        headers=auth_headers(owner),
    )
    evs = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_SESSION_COMPLETED)))
        .scalars()
        .all()
    )
    assert len(evs) == 0


async def test_session_double_complete_does_not_duplicate_event(
    make_user, auth_headers, client, db_session
):
    owner, g, game = await _setup_group_and_game(make_user, auth_headers, client, "ev-s-4")
    start_at = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    s = (
        await client.post(
            f"/api/groups/{g['id']}/sessions",
            json={
                "game_id": game["id"],
                "title": "Raid",
                "start_at": start_at,
                "duration_minutes": 60,
            },
            headers=auth_headers(owner),
        )
    ).json()
    # complete duas vezes
    await client.patch(
        f"/api/groups/{g['id']}/sessions/{s['id']}",
        json={"status": "completed"},
        headers=auth_headers(owner),
    )
    await client.patch(
        f"/api/groups/{g['id']}/sessions/{s['id']}",
        json={"status": "completed"},
        headers=auth_headers(owner),
    )
    evs = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_SESSION_COMPLETED)))
        .scalars()
        .all()
    )
    assert len(evs) == 1


async def _setup_group_with_games(make_user, auth_headers, client, guild, n=3):
    owner = await make_user(username="vowner")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": guild, "name": "Squad"},
            headers=auth_headers(owner),
        )
    ).json()
    games = []
    for i in range(n):
        res = await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": f"Game{i}", "is_free": i == 0},
            headers=auth_headers(owner),
        )
        games.append(res.json())
    return owner, g, games


async def test_vote_creation_emits_vote_created_event(make_user, auth_headers, client, db_session):
    owner, g, games = await _setup_group_with_games(make_user, auth_headers, client, "ev-v-1", n=3)
    res = await client.post(
        f"/api/groups/{g['id']}/votes",
        json={"title": "Pick one", "candidate_game_ids": [x["id"] for x in games]},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text
    vote_id = res.json()["id"]

    evs = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_VOTE_CREATED)))
        .scalars()
        .all()
    )
    assert len(evs) == 1
    assert evs[0].user_id == owner.id
    assert str(evs[0].group_id) == g["id"]
    assert evs[0].payload["vote_id"] == vote_id
    assert evs[0].payload["candidates"] == 3


async def test_ballot_submission_emits_vote_cast_event(make_user, auth_headers, client, db_session):
    owner, g, games = await _setup_group_with_games(make_user, auth_headers, client, "ev-v-2", n=3)
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={"title": "Pick", "candidate_game_ids": [x["id"] for x in games]},
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[0]["id"]]},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text

    evs = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_VOTE_CAST)))
        .scalars()
        .all()
    )
    assert len(evs) == 1
    assert evs[0].user_id == owner.id
    assert evs[0].payload["vote_id"] == vote["id"]
    assert evs[0].payload["stage_number"] == 1
    assert evs[0].payload["approvals"] == 1


async def test_vote_auto_close_emits_vote_completed_event(
    make_user, auth_headers, client, db_session
):
    # so um eleitor, ballot dele fecha a votacao direto
    owner, g, games = await _setup_group_with_games(make_user, auth_headers, client, "ev-v-3", n=2)
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={"title": "Pick", "candidate_game_ids": [x["id"] for x in games]},
            headers=auth_headers(owner),
        )
    ).json()
    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[0]["id"]]},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200

    evs = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_VOTE_COMPLETED)))
        .scalars()
        .all()
    )
    assert len(evs) == 1
    assert evs[0].payload["vote_id"] == vote["id"]
    assert evs[0].payload["winner_game_id"] == games[0]["id"]


async def test_vote_force_close_emits_vote_completed_event(
    make_user, auth_headers, client, db_session
):
    owner, g, games = await _setup_group_with_games(make_user, auth_headers, client, "ev-v-4", n=3)
    # adiciona mais um eleitor pra nao fechar auto
    second = await make_user(username="vsecond")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "ev-v-4", "name": "Squad"},
        headers=auth_headers(second),
    )
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={"title": "Pick", "candidate_game_ids": [x["id"] for x in games]},
            headers=auth_headers(owner),
        )
    ).json()
    # owner vota, mas second nao -- nao fecha auto
    await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[0]["id"]]},
        headers=auth_headers(owner),
    )
    # force close
    res = await client.post(
        f"/api/groups/{g['id']}/votes/{vote['id']}/close",
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text

    evs = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_VOTE_COMPLETED)))
        .scalars()
        .all()
    )
    assert len(evs) == 1
    assert evs[0].payload["vote_id"] == vote["id"]
