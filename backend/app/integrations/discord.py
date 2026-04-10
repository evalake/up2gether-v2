"""Cliente Discord OAuth com Protocol pra ser injetavel/mockavel nos testes."""

from __future__ import annotations

from typing import Protocol

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings


class DiscordProfile(dict):
    """Resposta do GET /users/@me — apenas o subset que usamos."""


class DiscordTokenBundle(dict):
    """Resposta do POST /oauth2/token — apenas o subset que usamos."""


class DiscordClient(Protocol):
    async def exchange_code(self, code: str) -> DiscordTokenBundle: ...
    async def fetch_user(self, access_token: str) -> DiscordProfile: ...
    async def fetch_guilds(self, access_token: str) -> list[dict]: ...
    async def fetch_guild_preview(self, access_token: str, guild_id: str) -> dict | None: ...


class HttpDiscordClient:
    """Implementacao real que bate na API do Discord."""

    TOKEN_URL = "https://discord.com/api/oauth2/token"
    USER_URL = "https://discord.com/api/users/@me"
    GUILDS_URL = "https://discord.com/api/v10/users/@me/guilds?with_counts=true"
    GUILD_URL = "https://discord.com/api/v10/guilds/{guild_id}?with_counts=true"

    async def exchange_code(self, code: str) -> DiscordTokenBundle:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": settings.discord_client_id,
                    "client_secret": settings.discord_client_secret,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.discord_redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        if res.status_code != 200:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"Discord token exchange failed: {res.text}"
            )
        return DiscordTokenBundle(res.json())

    async def fetch_user(self, access_token: str) -> DiscordProfile:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                self.USER_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
        if res.status_code != 200:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Failed to fetch Discord user")
        return DiscordProfile(res.json())

    async def fetch_guilds(self, access_token: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                self.GUILDS_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
        if res.status_code != 200:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Failed to fetch Discord guilds")
        return list(res.json())

    async def fetch_guild_as_bot(self, guild_id: str) -> dict | None:
        """GET /guilds/{id} usando bot token. Retorna name/icon/banner/splash/description.

        Usado pra refresh oportunista em background sem precisar de oauth do user.
        """
        settings = get_settings()
        if not settings.discord_bot_token:
            return None
        url = f"https://discord.com/api/v10/guilds/{guild_id}?with_counts=true"
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                url, headers={"Authorization": f"Bot {settings.discord_bot_token}"}
            )
        if res.status_code != 200:
            return None
        return dict(res.json())

    async def fetch_guild_preview(self, access_token: str, guild_id: str) -> dict | None:
        # /preview funciona pra guilds do user e pra discoveraveis
        # retorna banner, splash, discovery_splash, description, emojis, features
        url = f"https://discord.com/api/v10/guilds/{guild_id}/preview"
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
        if res.status_code != 200:
            return None
        return dict(res.json())


def get_discord_client() -> DiscordClient:
    return HttpDiscordClient()


async def post_webhook_embed(
    webhook_url: str,
    *,
    title: str,
    description: str | None = None,
    color: int = 0xFF6B35,  # laranja nerv padrao
    url: str | None = None,
    image_url: str | None = None,
    thumbnail_url: str | None = None,
    fields: list[dict] | None = None,
    footer: str | None = None,
) -> None:
    """Best-effort POST pro Discord webhook. Silencia falhas — nao quebra o fluxo principal."""
    import logging

    log = logging.getLogger(__name__)
    if not webhook_url:
        return
    embed: dict = {
        "title": title[:256],
        "color": color,
        "timestamp": __import__("datetime").datetime.now(__import__("datetime").UTC).isoformat(),
    }
    if description:
        embed["description"] = description[:4000]
    if url:
        embed["url"] = url
    if image_url:
        embed["image"] = {"url": image_url}
    if thumbnail_url:
        embed["thumbnail"] = {"url": thumbnail_url}
    if fields:
        embed["fields"] = [
            {
                "name": f["name"][:256],
                "value": str(f["value"])[:1024],
                "inline": bool(f.get("inline", True)),
            }
            for f in fields[:25]
        ]
    if footer:
        embed["footer"] = {"text": footer[:2048]}
    payload = {"embeds": [embed]}
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.post(webhook_url, json=payload)
        if res.status_code >= 300:
            log.warning("discord webhook returned %s: %s", res.status_code, res.text[:200])
    except Exception as e:
        log.warning("discord webhook post failed: %s", e)
