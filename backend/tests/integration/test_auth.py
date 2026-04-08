"""Tests de integration pro auth slice. Discord client mockado via dep override."""

from __future__ import annotations

import uuid

import pytest

from app.core.security import issue_access_token
from app.integrations.discord import DiscordClient, get_discord_client
from app.models.user import User


class FakeDiscordClient:
    """Fake injetavel — controla resposta do Discord no teste."""

    def __init__(self, profile: dict, token_bundle: dict | None = None) -> None:
        self.profile = profile
        self.token_bundle = token_bundle or {
            "access_token": "fake-access",
            "refresh_token": "fake-refresh",
            "token_type": "Bearer",
            "expires_in": 604800,
        }

    async def exchange_code(self, code: str) -> dict:
        return self.token_bundle

    async def fetch_user(self, access_token: str) -> dict:
        return self.profile

    async def fetch_guilds(self, access_token: str) -> list[dict]:
        return []


def _override_discord(fake: DiscordClient):
    def _provider() -> DiscordClient:
        return fake

    return _provider


@pytest.mark.asyncio
async def test_discord_callback_creates_new_user(app, client):
    fake = FakeDiscordClient(
        profile={
            "id": "111222333",
            "username": "yuri",
            "global_name": "Yuri",
            "avatar": "abc123",
            "email": "y@example.com",
        }
    )
    app.dependency_overrides[get_discord_client] = _override_discord(fake)

    res = await client.post("/api/auth/discord/callback", json={"code": "any"})
    assert res.status_code == 200, res.text

    body = res.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["discord_id"] == "111222333"
    assert body["user"]["discord_username"] == "yuri"
    assert body["user"]["discord_display_name"] == "Yuri"
    assert body["user"]["discord_avatar"] == "abc123"
    assert body["user"]["is_new_user"] is True
    assert body["user"]["onboarding_completed"] is False


@pytest.mark.asyncio
async def test_discord_callback_updates_existing_user(app, client, db_session):
    existing = User(discord_id="999", discord_username="old", settings={})
    db_session.add(existing)
    await db_session.commit()

    fake = FakeDiscordClient(
        profile={"id": "999", "username": "new", "global_name": "New", "avatar": None}
    )
    app.dependency_overrides[get_discord_client] = _override_discord(fake)

    res = await client.post("/api/auth/discord/callback", json={"code": "any"})
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["is_new_user"] is False
    assert body["user"]["discord_username"] == "new"


@pytest.mark.asyncio
async def test_me_with_valid_token(app, client, db_session):
    user = User(discord_id="42", discord_username="bob", settings={})
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = issue_access_token(user.id, user.discord_id)
    res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 200, res.text
    assert res.json()["discord_id"] == "42"
    assert res.json()["discord_username"] == "bob"


@pytest.mark.asyncio
async def test_me_without_token_returns_401(client):
    res = await client.get("/api/auth/me")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_with_garbage_token_returns_401(client):
    res = await client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_me_with_unknown_user_returns_401(client):
    """Token valido mas user nao existe no banco."""
    token = issue_access_token(uuid.uuid4(), discord_id="ghost")
    res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
