"""Integration tests pro slice de users (hardware + settings)."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_set_hardware_creates_profile(make_user, auth_headers, client):
    user = await make_user(username="hw")
    res = await client.put(
        "/api/users/hardware",
        json={"tier": "high", "notes": "rtx 4080"},
        headers=auth_headers(user),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["tier"] == "high"
    assert body["notes"] == "rtx 4080"


async def test_set_hardware_updates_existing(make_user, auth_headers, client):
    user = await make_user(username="hw2")
    await client.put(
        "/api/users/hardware",
        json={"tier": "low"},
        headers=auth_headers(user),
    )
    res = await client.put(
        "/api/users/hardware",
        json={"tier": "mid", "notes": "upgrade"},
        headers=auth_headers(user),
    )
    assert res.status_code == 200
    assert res.json()["tier"] == "mid"
    assert res.json()["notes"] == "upgrade"


async def test_get_settings_defaults(make_user, auth_headers, client):
    user = await make_user(username="s")
    res = await client.get("/api/users/me/settings", headers=auth_headers(user))
    assert res.status_code == 200
    body = res.json()
    assert body["onboarding_completed"] is False
    assert body["settings"] == {}


async def test_patch_settings_merges(make_user, auth_headers, client):
    user = await make_user(username="s2")
    res = await client.patch(
        "/api/users/me/settings",
        json={
            "timezone": "America/Sao_Paulo",
            "onboarding_completed": True,
            "settings": {"theme": "dark"},
        },
        headers=auth_headers(user),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["timezone"] == "America/Sao_Paulo"
    assert body["onboarding_completed"] is True
    assert body["settings"] == {"theme": "dark"}

    res = await client.patch(
        "/api/users/me/settings",
        json={"settings": {"lang": "pt"}},
        headers=auth_headers(user),
    )
    assert res.json()["settings"] == {"theme": "dark", "lang": "pt"}


async def test_settings_requires_auth(client):
    res = await client.get("/api/users/me/settings")
    assert res.status_code == 401


async def test_delete_account_removes_user(make_user, auth_headers, client):
    user = await make_user(username="del")
    headers = auth_headers(user)

    res = await client.delete("/api/users/me", headers=headers)
    assert res.status_code == 204

    # token antigo nao resolve mais (user nao existe)
    res2 = await client.get("/api/users/me/settings", headers=headers)
    assert res2.status_code == 401


async def test_delete_account_requires_auth(client):
    res = await client.delete("/api/users/me")
    assert res.status_code == 401
