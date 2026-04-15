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
async def test_discord_callback_records_referrer_on_new_signup(app, client, db_session):
    """Ref vindo de ?ref=X na landing deve cair no payload do event de signup."""
    from sqlalchemy import select

    from app.models.event import Event
    from app.services.events import EVENT_MEMBER_ACTIVATED

    fake = FakeDiscordClient(
        profile={"id": "777", "username": "ref-user", "global_name": "Ref", "avatar": None}
    )
    app.dependency_overrides[get_discord_client] = _override_discord(fake)

    res = await client.post(
        "/api/auth/discord/callback",
        json={"code": "any", "ref": "streamer-foo"},
    )
    assert res.status_code == 200
    assert res.json()["user"]["is_new_user"] is True

    # confere que o event foi gravado com ref
    rows = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_MEMBER_ACTIVATED)))
        .scalars()
        .all()
    )
    # pode ter varios events (existing users do conftest), filtra o do ref-user
    user_events = [e for e in rows if e.payload and e.payload.get("discord_id") == "777"]
    assert len(user_events) == 1
    assert user_events[0].payload["ref"] == "streamer-foo"


@pytest.mark.asyncio
async def test_discord_callback_ref_truncated_to_64(app, client, db_session):
    from sqlalchemy import select

    from app.models.event import Event
    from app.services.events import EVENT_MEMBER_ACTIVATED

    fake = FakeDiscordClient(
        profile={"id": "778", "username": "long-ref", "global_name": "L", "avatar": None}
    )
    app.dependency_overrides[get_discord_client] = _override_discord(fake)

    long_ref = "x" * 200
    res = await client.post(
        "/api/auth/discord/callback",
        json={"code": "any", "ref": long_ref},
    )
    assert res.status_code == 200

    rows = (
        (await db_session.execute(select(Event).where(Event.event_type == EVENT_MEMBER_ACTIVATED)))
        .scalars()
        .all()
    )
    ev = next(e for e in rows if e.payload and e.payload.get("discord_id") == "778")
    assert len(ev.payload["ref"]) == 64


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


@pytest.mark.asyncio
async def test_discord_callback_rate_limited(app, client):
    """Bruteforce no /discord/callback eventualmente retorna 429.
    Capacity e 10, entao a 11a chamada no mesmo burst deve bloquear.
    """
    fake = FakeDiscordClient(profile={"id": "rl", "username": "rl"})
    app.dependency_overrides[get_discord_client] = _override_discord(fake)
    # consome o burst inteiro (10 requests ok)
    for _ in range(10):
        r = await client.post("/api/auth/discord/callback", json={"code": "x"})
        assert r.status_code == 200
    r = await client.post("/api/auth/discord/callback", json={"code": "x"})
    assert r.status_code == 429
