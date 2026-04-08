"""Integration tests do slice Sessions."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

pytestmark = pytest.mark.asyncio


async def _setup(make_user, auth_headers, client, guild):
    owner = await make_user(username="owner")
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
            json={"name": "Game"},
            headers=auth_headers(owner),
        )
    ).json()
    return owner, g, game


def _start():
    return (datetime.now(UTC) + timedelta(days=1)).isoformat()


async def test_create_session_member_allowed(make_user, auth_headers, client):
    _owner, g, game = await _setup(make_user, auth_headers, client, "g-sess-1")
    member = await make_user(username="m")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-sess-1", "name": "Squad"},
        headers=auth_headers(member),
    )

    payload = {
        "game_id": game["id"],
        "title": "Friday raid",
        "start_at": _start(),
        "duration_minutes": 120,
    }
    # member pode criar sessao
    res = await client.post(
        f"/api/groups/{g['id']}/sessions",
        json=payload,
        headers=auth_headers(member),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["title"] == "Friday raid"
    assert body["status"] == "scheduled"
    assert body["rsvp_yes"] == 0


async def test_rsvp_and_counts(make_user, auth_headers, client):
    owner, g, game = await _setup(make_user, auth_headers, client, "g-sess-2")
    member = await make_user(username="m")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-sess-2", "name": "Squad"},
        headers=auth_headers(member),
    )
    s = (
        await client.post(
            f"/api/groups/{g['id']}/sessions",
            json={
                "game_id": game["id"],
                "title": "Run",
                "start_at": _start(),
                "duration_minutes": 60,
            },
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.put(
        f"/api/groups/{g['id']}/sessions/{s['id']}/rsvp",
        json={"status": "yes"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200
    assert res.json()["rsvp_yes"] == 1

    res = await client.put(
        f"/api/groups/{g['id']}/sessions/{s['id']}/rsvp",
        json={"status": "maybe"},
        headers=auth_headers(member),
    )
    body = res.json()
    assert body["rsvp_yes"] == 1
    assert body["rsvp_maybe"] == 1
    assert body["user_rsvp"] == "maybe"

    # update do mesmo user nao duplica
    res = await client.put(
        f"/api/groups/{g['id']}/sessions/{s['id']}/rsvp",
        json={"status": "no"},
        headers=auth_headers(member),
    )
    body = res.json()
    assert body["rsvp_maybe"] == 0
    assert body["rsvp_no"] == 1


async def test_update_and_delete_session(make_user, auth_headers, client):
    owner, g, game = await _setup(make_user, auth_headers, client, "g-sess-3")
    s = (
        await client.post(
            f"/api/groups/{g['id']}/sessions",
            json={
                "game_id": game["id"],
                "title": "Old",
                "start_at": _start(),
            },
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.patch(
        f"/api/groups/{g['id']}/sessions/{s['id']}",
        json={"title": "New", "status": "cancelled"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200
    assert res.json()["title"] == "New"
    assert res.json()["status"] == "cancelled"

    res = await client.delete(
        f"/api/groups/{g['id']}/sessions/{s['id']}",
        headers=auth_headers(owner),
    )
    assert res.status_code == 204
    res = await client.get(
        f"/api/groups/{g['id']}/sessions/{s['id']}",
        headers=auth_headers(owner),
    )
    assert res.status_code == 404


async def test_ics_export(make_user, auth_headers, client):
    owner, g, game = await _setup(make_user, auth_headers, client, "g-sess-4")
    s = (
        await client.post(
            f"/api/groups/{g['id']}/sessions",
            json={
                "game_id": game["id"],
                "title": "Calendar event",
                "start_at": _start(),
            },
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.get(
        f"/api/groups/{g['id']}/sessions/{s['id']}/calendar.ics",
        headers=auth_headers(owner),
    )
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/calendar")
    body = res.text
    assert "BEGIN:VCALENDAR" in body
    assert "Calendar event" in body
    assert "END:VCALENDAR" in body


async def test_session_403_for_non_member(make_user, auth_headers, client):
    owner, g, game = await _setup(make_user, auth_headers, client, "g-sess-5")
    s = (
        await client.post(
            f"/api/groups/{g['id']}/sessions",
            json={
                "game_id": game["id"],
                "title": "Secret",
                "start_at": _start(),
            },
            headers=auth_headers(owner),
        )
    ).json()
    intruder = await make_user(username="x")
    res = await client.get(
        f"/api/groups/{g['id']}/sessions/{s['id']}",
        headers=auth_headers(intruder),
    )
    assert res.status_code == 403
