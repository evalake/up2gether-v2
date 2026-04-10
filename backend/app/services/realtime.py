"""In-memory pub/sub para SSE.

Single-process. Se escalar horizontal vai precisar Redis pubsub.
Cada subscriber tem uma fila propria. publish() envia pra todas as filas
inscritas no group_id.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

log = logging.getLogger(__name__)


class Broker:
    def __init__(self) -> None:
        # group_id -> set de filas
        self._subs: dict[uuid.UUID, set[asyncio.Queue[dict[str, Any]]]] = {}
        self._lock = asyncio.Lock()

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

    def publish(self, group_id: uuid.UUID, kind: str, **data: Any) -> None:
        """Fire-and-forget. Filas cheias dropam (subscriber lento)."""
        bucket = self._subs.get(group_id)
        if not bucket:
            return
        msg = {"kind": kind, "group_id": str(group_id), **data}
        for q in list(bucket):
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                log.warning("realtime queue full, dropping msg %s", kind)


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
    import json

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
