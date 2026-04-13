"""Integration tests pro slice Steam. Cliente fake injetado via dep override."""

from __future__ import annotations

import pytest
from fastapi import HTTPException, status

from app.integrations.steam import SteamClient, get_steam_client

pytestmark = pytest.mark.asyncio


class FakeSteamClient:
    def __init__(self, search_results=None, details=None) -> None:
        self.search_results = search_results or []
        self.details = details or {}

    async def search(self, query: str):
        return self.search_results

    async def get_details(self, appid: int):
        if appid not in self.details:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "not found")
        return self.details[appid]


def _override(fake: SteamClient):
    def _provider() -> SteamClient:
        return fake

    return _provider


async def test_steam_search(app, client, make_user, auth_headers):
    user = await make_user(username="st")
    fake = FakeSteamClient(
        search_results=[
            {"appid": 730, "name": "CS2", "header_image": "x", "price": 0},
            {"appid": 570, "name": "Dota 2", "header_image": "y", "price": 0},
        ]
    )
    app.dependency_overrides[get_steam_client] = _override(fake)

    res = await client.get("/api/steam/search?q=cs", headers=auth_headers(user))
    assert res.status_code == 200, res.text
    body = res.json()
    # builtin catalog pode retornar hits extras, entao checa >= 2
    assert len(body) >= 2
    steam_appids = [r["appid"] for r in body if r["appid"] is not None]
    assert 730 in steam_appids


async def test_steam_search_requires_auth(client):
    res = await client.get("/api/steam/search?q=cs")
    assert res.status_code == 401


async def test_steam_search_min_length(app, client, make_user, auth_headers):
    user = await make_user(username="st2")
    app.dependency_overrides[get_steam_client] = _override(FakeSteamClient())
    res = await client.get("/api/steam/search?q=a", headers=auth_headers(user))
    assert res.status_code == 422


async def test_steam_get_details(app, client, make_user, auth_headers):
    user = await make_user(username="st3")
    fake = FakeSteamClient(
        details={
            730: {
                "appid": 730,
                "name": "Counter-Strike 2",
                "short_description": "shooter",
                "header_image": "img",
                "price": 0,
            }
        }
    )
    app.dependency_overrides[get_steam_client] = _override(fake)

    res = await client.get("/api/steam/game/730", headers=auth_headers(user))
    assert res.status_code == 200
    assert res.json()["name"] == "Counter-Strike 2"


async def test_steam_get_details_not_found(app, client, make_user, auth_headers):
    user = await make_user(username="st4")
    app.dependency_overrides[get_steam_client] = _override(FakeSteamClient())
    res = await client.get("/api/steam/game/9999", headers=auth_headers(user))
    assert res.status_code == 404
