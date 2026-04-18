"""Servico de notificacoes: cria rows no DB e dispara webhook Discord pro grupo."""

from __future__ import annotations

import logging
import uuid
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification

log = logging.getLogger(__name__)


async def notify(
    db: AsyncSession,
    *,
    user_ids: Iterable[uuid.UUID],
    kind: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    data: dict | None = None,
) -> None:
    """Cria notificacao in-app pra cada user_id."""
    ids = list({u for u in user_ids})
    if not ids:
        return
    rows = [
        Notification(
            user_id=uid,
            kind=kind,
            title=title,
            body=body,
            link=link,
            data=data or {},
        )
        for uid in ids
    ]
    db.add_all(rows)
    try:
        await db.commit()
    except Exception:
        log.exception("failed committing notifications")
        await db.rollback()


# ---- cores por evento pro discord embed ----
_EVENT_COLORS: dict[str, int] = {
    "session.created": 0xFF6B35,  # laranja
    "session.updated": 0xFFA94D,  # ambar
    "session.reminder": 0xFFD93D,  # amarelo
    "session.cancelled": 0xE63946,  # vermelho
    "game_vote.opened": 0xFF6B35,
    "game_vote.closed": 0x06D6A0,
    "game_vote.ballot_cast": 0x4CC9F0,  # ciano
    "current_game.changed": 0x06D6A0,
    "game.added": 0x4CC9F0,
    "game.archived": 0x6C757D,
    "game.price_changed": 0x06D6A0,
}


async def notify_group(
    db: AsyncSession,
    *,
    group_id: uuid.UUID,
    event: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    data: dict | None = None,
    # discord webhook ricos
    webhook_description: str | None = None,
    webhook_fields: list[dict] | None = None,
    webhook_image_url: str | None = None,
    webhook_thumbnail_url: str | None = None,
    webhook_footer: str | None = None,
    exclude_user_ids: Iterable[uuid.UUID] | None = None,
) -> None:
    """Fanout unificado: in-app (Notification rows) + realtime SSE + discord webhook do grupo.

    kind = event. Se o grupo tem webhook_url, posta embed rico.
    """
    from app.core.config import get_settings
    from app.integrations.discord import post_webhook_embed
    from app.models.group import Group, GroupMembership

    # pega grupo + membros
    grp = await db.get(Group, group_id)
    if grp is None:
        return
    excluded = set(exclude_user_ids or [])
    members = (
        (
            await db.execute(
                select(GroupMembership.user_id).where(GroupMembership.group_id == group_id)
            )
        )
        .scalars()
        .all()
    )
    user_ids = [uid for uid in members if uid not in excluded]

    # 0. realtime broadcast (sse) — fire and forget
    try:
        from app.services.realtime import get_broker

        get_broker().publish(group_id, kind=event)
    except Exception as e:
        log.debug("realtime publish skipped: %s", e)

    # 1. in-app
    await notify(
        db,
        user_ids=user_ids,
        kind=event,
        title=title,
        body=body,
        link=link,
        data=data,
    )

    # 2. discord webhook best-effort
    if grp.webhook_url:
        settings = get_settings()
        full_link = None
        if link:
            frontend_base = getattr(settings, "frontend_base_url", None) or ""
            full_link = f"{frontend_base.rstrip('/')}{link}" if frontend_base else None
        color = _EVENT_COLORS.get(event, 0xFF6B35)
        await post_webhook_embed(
            grp.webhook_url,
            title=title,
            description=webhook_description or body,
            color=color,
            url=full_link,
            image_url=webhook_image_url,
            thumbnail_url=webhook_thumbnail_url or grp.icon_url,
            fields=webhook_fields,
            footer=webhook_footer or f"up2gether · {grp.name}",
        )
