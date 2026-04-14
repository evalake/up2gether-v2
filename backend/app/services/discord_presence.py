"""Discord bot client que mantem um cache in-memory de presence por guild.

Abre uma conexao gateway persistente e escuta presence_update.
Se DISCORD_BOT_TOKEN nao tiver setado, vira no-op (endpoints retornam vazio).
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import Literal

import discord
from discord import app_commands

from app.services.discord_commands import register_commands

log = logging.getLogger(__name__)

Status = Literal["online", "idle", "dnd", "offline"]


def _map_status(s: discord.Status) -> Status:
    if s == discord.Status.online:
        return "online"
    if s == discord.Status.idle:
        return "idle"
    if s == discord.Status.dnd:
        return "dnd"
    return "offline"


class PresenceBot:
    def __init__(self, token: str) -> None:
        self.token = token
        self._client: discord.Client | None = None
        self._tree: app_commands.CommandTree | None = None
        self._task: asyncio.Task[None] | None = None
        # {guild_id: {user_id: status}}
        self._cache: dict[int, dict[int, Status]] = {}
        self._ready = asyncio.Event()

    def get_status(self, guild_id: int, user_id: int) -> Status:
        return self._cache.get(guild_id, {}).get(user_id, "offline")

    def guild_presences(self, guild_id: int) -> dict[str, Status]:
        return {str(uid): st for uid, st in self._cache.get(guild_id, {}).items()}

    async def start(self) -> None:
        if not self.token:
            log.warning("DISCORD_BOT_TOKEN nao setado, presence desabilitado")
            return

        intents = discord.Intents.none()
        intents.guilds = True
        intents.members = True
        intents.presences = True

        client = discord.Client(intents=intents)
        self._client = client
        self._tree = register_commands(client)

        @client.event
        async def on_ready() -> None:  # type: ignore[misc]
            # snapshot inicial de cada guild que o bot ta
            for g in client.guilds:
                gmap: dict[int, Status] = {}
                for member in g.members:
                    gmap[member.id] = _map_status(member.status)
                self._cache[g.id] = gmap
            log.info(
                "presence bot pronto em %d guilds, %d usuarios totais",
                len(client.guilds),
                sum(len(m) for m in self._cache.values()),
            )
            # sync slash commands. global sync pode levar ate 1h pra propagar
            # mas so precisa rodar uma vez por deploy (discord cacheia).
            if self._tree is not None:
                try:
                    synced = await self._tree.sync()
                    log.info("slash commands sincronizados: %d", len(synced))
                except Exception:
                    log.exception("erro syncando slash commands")
            self._ready.set()

        @client.event
        async def on_presence_update(before: discord.Member, after: discord.Member) -> None:  # type: ignore[misc]
            gmap = self._cache.setdefault(after.guild.id, {})
            gmap[after.id] = _map_status(after.status)

        @client.event
        async def on_member_join(member: discord.Member) -> None:  # type: ignore[misc]
            gmap = self._cache.setdefault(member.guild.id, {})
            gmap[member.id] = _map_status(member.status)

        @client.event
        async def on_member_remove(member: discord.Member) -> None:  # type: ignore[misc]
            self._cache.get(member.guild.id, {}).pop(member.id, None)

        async def runner() -> None:
            try:
                await client.start(self.token)
            except Exception:
                log.exception("presence bot caiu")

        self._task = asyncio.create_task(runner(), name="discord-presence-bot")

    async def stop(self) -> None:
        if self._client:
            try:
                await self._client.close()
            except Exception:
                log.exception("erro fechando client")
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await self._task


_bot: PresenceBot | None = None


def get_bot() -> PresenceBot | None:
    return _bot


def set_bot(b: PresenceBot | None) -> None:
    global _bot
    _bot = b
