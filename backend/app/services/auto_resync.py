"""Refresh oportunista de dados de integracoes (steam, discord).

Quando alguem abre uma tela que mostra dados importados, agendamos um refresh
em background se o snapshot tiver mais que TTL. Throttle in-memory pra evitar
N requests do mesmo recurso disparando a mesma sync simultaneamente.
"""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import BackgroundTasks
from sqlalchemy import select

from app.core.database import SessionLocal
from app.integrations.discord import HttpDiscordClient
from app.integrations.steam import HttpSteamClient
from app.models.game import Game, SteamGameOwnership
from app.models.group import Group
from app.models.user import IntegrationAccount

# (kind, key) -> last_attempt_ts. processo unico, perde no restart, tudo bem.
_inflight: dict[tuple[str, str], float] = {}
_THROTTLE_SECONDS = 5 * 60  # nao retentar a mesma sync em < 5min

STEAM_TTL = timedelta(hours=6)
DISCORD_GUILD_TTL = timedelta(hours=6)


def _claim(kind: str, key: str) -> bool:
    now = time.time()
    last = _inflight.get((kind, key), 0)
    if now - last < _THROTTLE_SECONDS:
        return False
    _inflight[(kind, key)] = now
    return True


async def _resync_steam_user(user_id: uuid.UUID) -> None:
    """Roda refresh completo da steam pra um user (lib + profile snapshot)."""
    from app.routers.steam import _upsert_steam_profile  # avoid cycle

    client = HttpSteamClient()
    try:
        async with SessionLocal() as db:
            integ = (
                await db.execute(
                    select(IntegrationAccount).where(
                        IntegrationAccount.user_id == user_id,
                        IntegrationAccount.provider == "steam",
                    )
                )
            ).scalar_one_or_none()
            if not integ or not integ.external_id:
                return
            steam_id = integ.external_id

            try:
                owned = await client.get_owned_games(steam_id)
            except Exception:
                owned = []
            owned_by_appid = {int(g["appid"]): g for g in owned if g.get("appid")}
            owned_appids = set(owned_by_appid.keys())

            if owned_appids:
                matches = (
                    (await db.execute(select(Game).where(Game.steam_appid.in_(owned_appids))))
                    .scalars()
                    .all()
                )
                now = datetime.now(UTC)
                for g in matches:
                    data = owned_by_appid.get(g.steam_appid or -1, {})
                    pt_forever = int(data.get("playtime_forever", 0) or 0)
                    pt_2w = int(data.get("playtime_2weeks", 0) or 0)
                    existing_own = (
                        await db.execute(
                            select(SteamGameOwnership).where(
                                SteamGameOwnership.user_id == user_id,
                                SteamGameOwnership.game_id == g.id,
                            )
                        )
                    ).scalar_one_or_none()
                    if existing_own:
                        existing_own.playtime_forever_minutes = pt_forever
                        existing_own.playtime_2weeks_minutes = pt_2w
                        existing_own.last_synced_at = now
                    else:
                        db.add(
                            SteamGameOwnership(
                                user_id=user_id,
                                game_id=g.id,
                                manual=False,
                                playtime_forever_minutes=pt_forever,
                                playtime_2weeks_minutes=pt_2w,
                                last_synced_at=now,
                            )
                        )

            await _upsert_steam_profile(db, user_id, steam_id, client)
            await db.commit()
    except Exception:
        # best effort, nao pode quebrar a request principal
        pass


async def _resync_discord_guild(group_id: uuid.UUID) -> None:
    """Refresh visual do guild (icon/banner/splash/name/description) usando bot token."""
    try:
        async with SessionLocal() as db:
            grp = (await db.execute(select(Group).where(Group.id == group_id))).scalar_one_or_none()
            if not grp or not grp.discord_guild_id:
                return
            client = HttpDiscordClient()
            try:
                preview = await client.fetch_guild_as_bot(grp.discord_guild_id)
            except Exception:
                preview = None
            if preview:
                if preview.get("name"):
                    grp.name = preview["name"]
                icon_hash = preview.get("icon")
                if icon_hash:
                    ext = "gif" if str(icon_hash).startswith("a_") else "png"
                    grp.icon_url = f"https://cdn.discordapp.com/icons/{grp.discord_guild_id}/{icon_hash}.{ext}?size=512"
                banner_hash = preview.get("banner")
                if banner_hash:
                    ext = "gif" if str(banner_hash).startswith("a_") else "png"
                    grp.banner_url = f"https://cdn.discordapp.com/banners/{grp.discord_guild_id}/{banner_hash}.{ext}?size=1024"
                splash_hash = preview.get("splash") or preview.get("discovery_splash")
                if splash_hash:
                    grp.splash_url = f"https://cdn.discordapp.com/splashes/{grp.discord_guild_id}/{splash_hash}.png?size=1024"
                if preview.get("description"):
                    grp.description = preview["description"]
                await db.commit()
    except Exception:
        pass


def maybe_resync_steam(
    bg: BackgroundTasks,
    user_id: uuid.UUID,
    last_synced_at: datetime | None,
) -> None:
    """Agenda refresh steam se snapshot stale (ou inexistente)."""
    if last_synced_at is not None:
        # garante tz-aware
        ref = last_synced_at if last_synced_at.tzinfo else last_synced_at.replace(tzinfo=UTC)
        if datetime.now(UTC) - ref < STEAM_TTL:
            return
    if not _claim("steam_user", str(user_id)):
        return
    bg.add_task(_resync_steam_user, user_id)


def maybe_resync_discord_guild(bg: BackgroundTasks, group_id: uuid.UUID) -> None:
    """Agenda refresh visual do guild (throttle de 5min, TTL impl pelo claim)."""
    if not _claim("discord_guild", str(group_id)):
        return
    bg.add_task(_resync_discord_guild, group_id)
