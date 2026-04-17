"""Tests do fluxo de link Google Calendar. Foco em CSRF/state do OAuth.

Pos-pentest: state agora e token scoped (scope=google-link, TTL 10min), nao
access token. Fluxo antigo reciclava o access JWT como state, o que deixava
qualquer token vazado virar link arbitrario.
"""

from __future__ import annotations

import pytest

from app.core.security import issue_access_token, issue_scoped_token
from app.integrations.google_calendar import GoogleCalendarClient, get_google_calendar_client

pytestmark = pytest.mark.asyncio


class FakeGoogleClient:
    def __init__(self, tokens: dict | None = None) -> None:
        self.tokens = tokens or {
            "access_token": "ya29.fake",
            "refresh_token": "1//fake",
            "expires_in": 3600,
        }

    def auth_url(self, state: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}"

    async def exchange_code(self, code: str) -> dict:
        return self.tokens

    async def refresh(self, refresh_token: str) -> dict:
        return self.tokens

    async def create_event(self, *a, **k) -> dict:
        return {"id": "evt-fake"}


def _override_google(fake: GoogleCalendarClient):
    def _p() -> GoogleCalendarClient:
        return fake

    return _p


async def test_google_callback_rejects_access_token_as_state(app, client, make_user):
    """Regressao: access JWT nao pode mais passar como state (scope check)."""
    app.dependency_overrides[get_google_calendar_client] = _override_google(FakeGoogleClient())
    user = await make_user(discord_id="g1", username="guser")

    access = issue_access_token(user.id, user.discord_id)
    res = await client.get(f"/api/google/callback?code=ok&state={access}")
    assert res.status_code == 400
    assert "state invalido" in res.text.lower()


async def test_google_callback_accepts_scoped_state(app, client, make_user, db_session):
    from sqlalchemy import select

    from app.domain.enums import AuthProvider
    from app.models.user import IntegrationAccount

    app.dependency_overrides[get_google_calendar_client] = _override_google(FakeGoogleClient())
    user = await make_user(discord_id="g2", username="guser2")

    state = issue_scoped_token(user.id, "google-link", ttl_seconds=60)
    res = await client.get(
        f"/api/google/callback?code=ok&state={state}",
        follow_redirects=False,
    )
    assert res.status_code in (302, 307)
    assert "/settings?google=ok" in res.headers["location"]

    row = (
        await db_session.execute(
            select(IntegrationAccount).where(
                IntegrationAccount.user_id == user.id,
                IntegrationAccount.provider == AuthProvider.GOOGLE,
            )
        )
    ).scalar_one_or_none()
    assert row is not None
    assert row.access_token == "ya29.fake"


async def test_google_callback_rejects_garbage_state(app, client):
    app.dependency_overrides[get_google_calendar_client] = _override_google(FakeGoogleClient())
    res = await client.get("/api/google/callback?code=ok&state=garbage")
    # nao deve virar 500 (era o bug); retorna 400 claro
    assert res.status_code == 400


async def test_google_connect_requires_auth(client):
    res = await client.get("/api/google/connect")
    assert res.status_code == 401
