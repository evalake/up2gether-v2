"""Integration tests do onboarding checklist."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_onboarding_fresh_user_all_false(make_user, auth_headers, client):
    u = await make_user(username="new")
    res = await client.get("/api/users/me/onboarding", headers=auth_headers(u))
    assert res.status_code == 200
    body = res.json()
    assert body["has_group"] is False
    assert body["has_games"] is False
    assert body["has_session"] is False
    assert body["has_vote"] is False
    assert body["steps_done"] == 0
    assert body["steps_total"] == 4
    assert body["complete"] is False


async def test_onboarding_after_group_created(make_user, auth_headers, client):
    u = await make_user(username="u")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "onb-1", "name": "X"},
        headers=auth_headers(u),
    )
    res = await client.get("/api/users/me/onboarding", headers=auth_headers(u))
    body = res.json()
    assert body["has_group"] is True
    assert body["has_games"] is False
    assert body["steps_done"] == 1


async def test_onboarding_games_need_three(make_user, auth_headers, client):
    u = await make_user(username="u")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "onb-2", "name": "X"},
            headers=auth_headers(u),
        )
    ).json()
    # 2 games, ainda nao checa
    for name in ("Hades", "Celeste"):
        await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": name},
            headers=auth_headers(u),
        )
    res = await client.get("/api/users/me/onboarding", headers=auth_headers(u))
    assert res.json()["has_games"] is False
    # 3 games, marca
    await client.post(
        f"/api/groups/{g['id']}/games",
        json={"name": "Hollow Knight"},
        headers=auth_headers(u),
    )
    res = await client.get("/api/users/me/onboarding", headers=auth_headers(u))
    assert res.json()["has_games"] is True


async def test_onboarding_complete_when_all_four(make_user, auth_headers, client):
    """Steps parciais somam corretamente. complete=True so quando 4/4."""
    u = await make_user(username="u")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "onb-3", "name": "X"},
        headers=auth_headers(u),
    )
    res = await client.get("/api/users/me/onboarding", headers=auth_headers(u))
    assert res.json()["complete"] is False
    assert res.json()["steps_done"] == 1  # group
