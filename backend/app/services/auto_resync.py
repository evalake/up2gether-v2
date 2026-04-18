"""Refresh oportunista de dados de integracoes (steam, discord).

Quando alguem abre uma tela que mostra dados importados, agendamos um refresh
em background se o snapshot tiver mais que TTL. Throttle in-memory pra evitar
N requests do mesmo recurso disparando a mesma sync simultaneamente.
"""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime, timedelta

import structlog
from fastapi import BackgroundTasks
from sqlalchemy import select

from app.core.database import SessionLocal
from app.integrations.discord import HttpDiscordClient
from app.integrations.steam import HttpSteamClient
from app.models.game import Game, SteamGameOwnership
from app.models.group import Group
from app.models.user import IntegrationAccount

log = structlog.get_logger()

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
            except Exception as e:
                log.warning("auto_resync.steam.owned_failed", user_id=str(user_id), err=str(e))
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
    except Exception as e:
        # best effort, nao pode quebrar a request principal
        log.warning("auto_resync.steam.failed", user_id=str(user_id), err=str(e))


async def _resync_discord_guild(group_id: uuid.UUID) -> None:
    """Refresh visual do guild (icon/banner/splash/name/description) usando bot token."""
    try:
        async with SessionLocal() as db:
            grp = (await db.execute(select(Group).where(Group.id == group_id))).scalar_one_or_none()
            if not grp or not grp.discord_guild_id:
                return
            from app.routers.groups import _apply_guild_visuals

            client = HttpDiscordClient()
            try:
                data = await client.fetch_guild_as_bot(grp.discord_guild_id)
            except Exception as e:
                log.warning("auto_resync.guild.fetch_failed", group_id=str(group_id), err=str(e))
                data = None
            if data:
                _apply_guild_visuals(grp, data)
                await db.commit()
                # notifica clients conectados via SSE
                from app.services.realtime import get_broker

                get_broker().publish(group_id, kind="group.visuals_updated")
    except Exception as e:
        log.warning("auto_resync.guild.failed", group_id=str(group_id), err=str(e))


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
