"""Pub/sub SSE com Postgres LISTEN/NOTIFY.

Cada instancia escuta no canal 'sse' do Postgres. Quando qualquer
instancia publica, manda NOTIFY pro Postgres que repassa pra todas
as conexoes ouvindo. Resolve o problema de multi-machine no Fly.

Fallback graceful: se a conexao de listen cair, tenta reconectar.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

log = logging.getLogger(__name__)

PG_CHANNEL = "sse"


class Broker:
    def __init__(self) -> None:
        # group_id -> set de filas locais
        self._subs: dict[uuid.UUID, set[asyncio.Queue[dict[str, Any]]]] = {}
        self._lock = asyncio.Lock()
        self._pg_conn: Any = None  # asyncpg raw connection
        self._listen_task: asyncio.Task | None = None

    async def subscribe(
        self, group_ids: list[uuid.UUID]
    ) -> tuple[asyncio.Queue[dict[str, Any]], list[uuid.UUID]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        async with self._lock:
            for gid in group_ids:
                self._subs.setdefault(gid, set()).add(q)
        return q, group_ids

    async def unsubscribe(
        self, q: asyncio.Queue[dict[str, Any]], group_ids: list[uuid.UUID]
    ) -> None:
        async with self._lock:
            for gid in group_ids:
                bucket = self._subs.get(gid)
                if bucket:
                    bucket.discard(q)
                    if not bucket:
                        self._subs.pop(gid, None)

    def _dispatch(self, group_id: uuid.UUID, msg: dict[str, Any]) -> None:
        """Entrega msg pra todos os subscribers locais do group_id."""
        bucket = self._subs.get(group_id)
        if not bucket:
            return
        for q in list(bucket):
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                log.warning("realtime queue full, dropping msg %s", msg.get("kind"))

    def publish(self, group_id: uuid.UUID, kind: str, **data: Any) -> None:
        """Publica via Postgres NOTIFY pra todas as instancias receberem."""
        msg = {"kind": kind, "group_id": str(group_id), **data}
        # manda pro Postgres se tiver conexao, senao dispatch local
        if self._pg_conn is not None:
            try:
                payload = json.dumps(msg)
                loop = asyncio.get_running_loop()
                task = loop.create_task(self._pg_notify(payload))
                task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)
            except Exception:
                log.debug("pg notify failed, local dispatch")
                self._dispatch(group_id, msg)
        else:
            self._dispatch(group_id, msg)

    async def _pg_notify(self, payload: str) -> None:
        try:
            await self._pg_conn.execute(f"NOTIFY {PG_CHANNEL}, '{payload}'")
        except Exception as e:
            log.warning("pg notify error: %s", e)

    def _on_pg_notification(self, conn: Any, pid: int, channel: str, payload: str) -> None:
        """Callback chamado pelo asyncpg quando recebe NOTIFY."""
        try:
            msg = json.loads(payload)
            gid_str = msg.get("group_id")
            if gid_str:
                gid = uuid.UUID(gid_str)
                self._dispatch(gid, msg)
        except Exception as e:
            log.debug("pg notification parse error: %s", e)

    async def start_listening(self) -> None:
        """Conecta ao Postgres e escuta NOTIFY no canal SSE.

        Chamado no lifespan da app. Reconecta automatico em loop.
        """
        self._listen_task = asyncio.create_task(self._listen_loop())

    async def _listen_loop(self) -> None:
        import asyncpg

        from app.core.config import get_settings

        settings = get_settings()
        # asyncpg usa URL formato postgres:// (sem +asyncpg)
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        ssl_ctx: Any = "localhost" not in dsn and "127.0.0.1" not in dsn

        while True:
            try:
                conn = await asyncpg.connect(dsn, ssl=ssl_ctx)
                self._pg_conn = conn
                await conn.add_listener(PG_CHANNEL, self._on_pg_notification)
                log.info("realtime: listening on pg channel '%s'", PG_CHANNEL)
                # poll conexao (asyncpg nao tem event pra connection close)
                while not conn.is_closed():  # noqa: ASYNC110
                    await asyncio.sleep(5)
                log.warning("realtime: pg listen connection closed, reconnecting")
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.warning("realtime: pg listen error: %s, retry in 3s", e)
            finally:
                self._pg_conn = None
            await asyncio.sleep(3)

    async def stop(self) -> None:
        if self._listen_task:
            self._listen_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._listen_task
        if self._pg_conn and not self._pg_conn.is_closed():
            await self._pg_conn.close()


_broker = Broker()


def get_broker() -> Broker:
    return _broker


async def event_stream(
    q: asyncio.Queue[dict[str, Any]],
    heartbeat_seconds: float = 5.0,
) -> AsyncIterator[str]:
    """Yields SSE-formatted strings.

    - Padding inicial de 2KB: alguns proxies (Cloudflare, Fly edge, nginx)
      buffering stream ate encher N bytes. Mandar 2KB de comentario na
      conexao forca o primeiro flush e destrava o pipeline.
    - Heartbeat curto (5s): se o proxy tiver buffer por tempo, mantem dados
      fluindo. Tambem serve pra derrubar conexao morta rapido.
    """
    # padding anti-buffering. SSE comment = linha comecando com ':'
    yield ":" + (" " * 2048) + "\n\n"
    # marca de conexao aberta, confirma pro client que o stream ta ativo
    yield 'data: {"kind":"connected"}\n\n'

    try:
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=heartbeat_seconds)
                yield f"data: {json.dumps(msg)}\n\n"
            except TimeoutError:
                yield ": ping\n\n"
    except asyncio.CancelledError:
        return
