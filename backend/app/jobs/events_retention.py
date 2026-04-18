"""Cron de retencao LGPD: purge de events.

Eventos sao analytics (group_created, vote_cast, etc). Mantemos 365 dias por
default — janela suficiente pra metricas de retention W4/M3 e pra investigar
incidentes recentes. Acima disso vira ruido.

Roda diario as 03:30 UTC pra nao competir com price_check (xx:30 a cada 3h
nao bate com 03:30 dia 1, mas o overlap mais proximo seria 03:30 e ai nao
queremos: o de price tem prioridade).
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import delete

from app.core.database import SessionLocal
from app.models.event import Event

log = structlog.get_logger()

EVENTS_RETENTION_DAYS = 365


async def purge_old_events() -> None:
    cutoff = datetime.now(UTC) - timedelta(days=EVENTS_RETENTION_DAYS)
    async with SessionLocal() as db:
        result = await db.execute(delete(Event).where(Event.occurred_at < cutoff))
        await db.commit()
        log.info("events_retention.purged", deleted=result.rowcount, cutoff=cutoff.isoformat())
