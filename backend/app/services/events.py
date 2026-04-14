"""Observability de eventos de produto.

Escreve direto na tabela `events`, controle total, sem servico externo.
Motivado pelo BUSINESS.md: medir W4 retention, conversao, e as 5 metricas que
importam. LGPD-friendly (dado fica em Postgres BR).

Nao faz commit. Caller controla a transacao -- se o fluxo principal comitar,
o evento persiste junto. Se rollback, some junto. Coerente com o resto do request.
"""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event

# event types como constantes pra evitar typo e facilitar grep
EVENT_GROUP_CREATED = "group_created"
EVENT_GROUP_JOINED = "group_joined"
EVENT_MEMBER_ACTIVATED = "member_activated"
EVENT_SESSION_CREATED = "session_created"
EVENT_SESSION_COMPLETED = "session_completed"
EVENT_VOTE_CREATED = "vote_created"
EVENT_VOTE_CAST = "vote_cast"
EVENT_VOTE_COMPLETED = "vote_completed"


async def track_event(
    db: AsyncSession,
    event_type: str,
    *,
    user_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
    payload: dict | None = None,
) -> None:
    db.add(
        Event(
            event_type=event_type,
            user_id=user_id,
            group_id=group_id,
            payload=payload or {},
        )
    )
    await db.flush()
