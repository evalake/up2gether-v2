"""Integration tests do slice Games."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def _create_group(client, headers, guild="g-game-1"):
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": guild, "name": "Squad"},
        headers=headers,
    )
    return res.json()


async def test_create_game_admin_only(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    member = await make_user(username="m")
    g = await _create_group(client, auth_headers(owner))
    # member entra
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-game-1", "name": "Squad"},
        headers=auth_headers(member),
    )

    # member (role=member) nao consegue criar
    res = await client.post(
        f"/api/groups/{g['id']}/games",
        json={"name": "Hades", "is_free": False, "price_current": 30},
        headers=auth_headers(member),
    )
    assert res.status_code == 403

    # owner (admin) consegue
    res = await client.post(
        f"/api/groups/{g['id']}/games",
        json={"name": "Hades", "price_current": 30},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["name"] == "Hades"
    # 30 -> 85.0 com formula linear
    assert body["viability"]["price_score"] == pytest.approx(85.0)


async def test_create_game_dedup_by_name(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-game-2")
    await client.post(
        f"/api/groups/{g['id']}/games",
        json={"name": "Hollow Knight"},
        headers=auth_headers(owner),
    )
    res = await client.post(
        f"/api/groups/{g['id']}/games",
        json={"name": "hollow knight"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 400


async def test_list_games_sorted_by_viability(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-game-3")
    await client.post(
        f"/api/groups/{g['id']}/games",
        json={"name": "Cheap", "is_free": True},
        headers=auth_headers(owner),
    )
    await client.post(
        f"/api/groups/{g['id']}/games",
        json={"name": "Expensive", "price_current": 250},
        headers=auth_headers(owner),
    )
    res = await client.get(f"/api/groups/{g['id']}/games", headers=auth_headers(owner))
    assert res.status_code == 200
    names = [x["name"] for x in res.json()]
    assert names[0] == "Cheap"


async def test_interest_signal_changes_score(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-game-4")
    created = (
        await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": "Indie"},
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.put(
        f"/api/games/{created['id']}/interest",
        json={"signal": "want"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200

    res = await client.get(
        f"/api/groups/{g['id']}/games/{created['id']}",
        headers=auth_headers(owner),
    )
    body = res.json()
    assert body["viability"]["interest_want_count"] == 1
    assert body["user_interest"] == "want"


async def test_archive_game_admin_only(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    member = await make_user(username="m")
    g = await _create_group(client, auth_headers(owner), guild="g-game-5")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-game-5", "name": "Squad"},
        headers=auth_headers(member),
    )
    created = (
        await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": "ToArchive"},
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.delete(
        f"/api/groups/{g['id']}/games/{created['id']}",
        headers=auth_headers(member),
    )
    assert res.status_code == 403

    res = await client.delete(
        f"/api/groups/{g['id']}/games/{created['id']}",
        headers=auth_headers(owner),
    )
    assert res.status_code == 204

    # nao aparece mais na listagem default
    res = await client.get(f"/api/groups/{g['id']}/games", headers=auth_headers(owner))
    assert all(x["name"] != "ToArchive" for x in res.json())


async def test_get_game_403_for_non_member(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    intruder = await make_user(username="x")
    g = await _create_group(client, auth_headers(owner), guild="g-game-6")
    created = (
        await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": "Secret"},
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.get(
        f"/api/groups/{g['id']}/games/{created['id']}",
        headers=auth_headers(intruder),
    )
    assert res.status_code == 403


async def test_ownership_toggle(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-game-7")
    created = (
        await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": "Owned"},
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.put(
        f"/api/games/{created['id']}/ownership",
        json={"owns": True},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200

    res = await client.get(
        f"/api/groups/{g['id']}/games/{created['id']}",
        headers=auth_headers(owner),
    )
    body = res.json()
    assert body["user_owns_game"] is True
    assert body["viability"]["ownership_count"] == 1
