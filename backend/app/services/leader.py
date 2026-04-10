"""Leader election via Postgres advisory lock.

Apenas a instancia que adquirir o lock roda o bot Discord e o scheduler.
Se a instancia morrer, o Postgres libera o lock e outra instancia assume
no proximo ciclo de tentativa.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging

import asyncpg

from app.core.config import get_settings

log = logging.getLogger(__name__)

# um numero arbitrario fixo, so precisa ser unico por app
LOCK_ID = 20250410


class LeaderElection:
    def __init__(self) -> None:
        self._conn: asyncpg.Connection | None = None
        self._is_leader = False
        self._task: asyncio.Task | None = None
        self._on_promote: list = []
        self._on_demote: list = []
        self._stop_event = asyncio.Event()

    @property
    def is_leader(self) -> bool:
        return self._is_leader

    def on_promote(self, coro_fn) -> None:
        """Registra callback async chamado quando essa instancia vira leader."""
        self._on_promote.append(coro_fn)

    def on_demote(self, coro_fn) -> None:
        """Registra callback async chamado quando perde lideranca."""
        self._on_demote.append(coro_fn)

    async def start(self) -> None:
        self._task = asyncio.create_task(self._election_loop(), name="leader-election")

    async def _election_loop(self) -> None:
        settings = get_settings()
        dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        ssl_ctx = "localhost" not in dsn and "127.0.0.1" not in dsn

        while not self._stop_event.is_set():
            try:
                conn = await asyncpg.connect(dsn, ssl=ssl_ctx)
                self._conn = conn
                # pg_try_advisory_lock retorna true se conseguiu
                acquired = await conn.fetchval("SELECT pg_try_advisory_lock($1)", LOCK_ID)
                if acquired:
                    if not self._is_leader:
                        self._is_leader = True
                        log.info("leader election: sou o lider agora")
                        for fn in self._on_promote:
                            try:
                                await fn()
                            except Exception:
                                log.exception("leader promote callback error")
                    # mantém a conexao viva (lock dura enquanto a sessao existir)
                    while not self._stop_event.is_set() and not conn.is_closed():  # noqa: ASYNC110
                        await asyncio.sleep(10)
                    # perdeu conexao = perdeu lock
                    if self._is_leader:
                        self._is_leader = False
                        log.warning("leader election: perdi a lideranca")
                        for fn in self._on_demote:
                            try:
                                await fn()
                            except Exception:
                                log.exception("leader demote callback error")
                else:
                    # outra instancia e o lider
                    await conn.close()
                    await asyncio.sleep(15)  # tenta de novo em 15s
                    continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.warning("leader election error: %s, retry 5s", e)
            finally:
                self._conn = None
            await asyncio.sleep(5)

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await self._task
        if self._conn and not self._conn.is_closed():
            await self._conn.close()
        if self._is_leader:
            self._is_leader = False
            for fn in self._on_demote:
                try:
                    await fn()
                except Exception:
                    log.exception("leader demote callback error on stop")
