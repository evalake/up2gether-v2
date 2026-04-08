"""Cliente Google Calendar OAuth2 + events API."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Protocol

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
SCOPES = "https://www.googleapis.com/auth/calendar.events"


class GoogleCalendarClient(Protocol):
    def auth_url(self, state: str) -> str: ...
    async def exchange_code(self, code: str) -> dict: ...
    async def refresh(self, refresh_token: str) -> dict: ...
    async def create_event(
        self,
        access_token: str,
        summary: str,
        start: datetime,
        duration_min: int,
        description: str | None = None,
    ) -> dict: ...


class HttpGoogleCalendarClient:
    def auth_url(self, state: str) -> str:
        s = get_settings()
        if not s.google_client_id or not s.google_redirect_uri:
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "google oauth nao configurado")
        from urllib.parse import urlencode

        q = urlencode(
            {
                "client_id": s.google_client_id,
                "redirect_uri": s.google_redirect_uri,
                "response_type": "code",
                "scope": SCOPES,
                "access_type": "offline",
                "prompt": "consent",
                "state": state,
            }
        )
        return f"{AUTH_URL}?{q}"

    async def exchange_code(self, code: str) -> dict:
        s = get_settings()
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                TOKEN_URL,
                data={
                    "code": code,
                    "client_id": s.google_client_id,
                    "client_secret": s.google_client_secret,
                    "redirect_uri": s.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
        if r.status_code != 200:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"google token exchange: {r.text}")
        return r.json()

    async def refresh(self, refresh_token: str) -> dict:
        s = get_settings()
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                TOKEN_URL,
                data={
                    "refresh_token": refresh_token,
                    "client_id": s.google_client_id,
                    "client_secret": s.google_client_secret,
                    "grant_type": "refresh_token",
                },
            )
        if r.status_code != 200:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "google token refresh failed")
        return r.json()

    async def create_event(
        self,
        access_token: str,
        summary: str,
        start: datetime,
        duration_min: int,
        description: str | None = None,
    ) -> dict:
        end = start + timedelta(minutes=duration_min)
        body = {
            "summary": summary,
            "description": description or "",
            "start": {"dateTime": start.isoformat()},
            "end": {"dateTime": end.isoformat()},
        }
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(
                EVENTS_URL,
                json=body,
                headers={"Authorization": f"Bearer {access_token}"},
            )
        if r.status_code not in (200, 201):
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"google event create: {r.text}")
        return r.json()


def get_google_calendar_client() -> GoogleCalendarClient:
    return HttpGoogleCalendarClient()
