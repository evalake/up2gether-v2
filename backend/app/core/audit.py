"""Audit log pra uso de sys_admin override.

Sys admin pode bypassar owner/admin em TODO lugar (legacy_free, purge,
webhook de grupo alheio, etc). Sem trilha ninguem sabe quem fez oq depois.

Emite structlog evento "sys_admin_override" que os sinks de prod (Fly logs,
Datadog) indexam. Chave actor_discord_id pra correlacionar com Discord.
"""

from __future__ import annotations

import uuid
from typing import Any

import structlog

from app.models.user import User

log = structlog.get_logger(__name__)


def log_sys_admin_override(
    actor: User,
    action: str,
    *,
    group_id: uuid.UUID | None = None,
    target_user_id: uuid.UUID | None = None,
    **context: Any,
) -> None:
    """Log quando sys_admin usa privilegio pra fazer algo que nao poderia como user comum."""
    log.warning(
        "sys_admin_override",
        actor_id=str(actor.id),
        actor_discord_id=actor.discord_id,
        action=action,
        group_id=str(group_id) if group_id else None,
        target_user_id=str(target_user_id) if target_user_id else None,
        **context,
    )
