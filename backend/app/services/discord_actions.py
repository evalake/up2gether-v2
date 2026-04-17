"""Helpers pro bot Discord executar acoes (voto, rsvp, interesse) inline.

Abstrai o mapping discord_user_id -> User e chama os services normais.
Retorna (ok, message) pra quem chama renderizar no Discord.

Mantido fora de discord_commands.py pra poder testar sem mockar Interaction.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Literal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import SessionRsvp
from app.models.game import Game
from app.models.group import Group
from app.models.session import PlaySession
from app.models.user import User
from app.models.vote import VoteSession
from app.repositories.game_repo import GameRepository
from app.repositories.group_repo import GroupRepository
from app.repositories.session_repo import SessionRepository
from app.repositories.vote_repo import VoteRepository
from app.services.game_service import GameService
from app.services.session_service import PlaySessionService
from app.services.vote_service import VoteService

InterestSignal = Literal["want", "ok", "pass"]


@dataclass
class ActionResult:
    ok: bool
    message: str


async def _resolve_user_and_group(
    db: AsyncSession, discord_user_id: str, guild_id: str
) -> tuple[User | None, Group | None]:
    user = (
        await db.execute(select(User).where(User.discord_id == discord_user_id))
    ).scalar_one_or_none()
    group = (
        await db.execute(select(Group).where(Group.discord_guild_id == guild_id))
    ).scalar_one_or_none()
    return user, group


def _app_signup_hint(base_url: str) -> str:
    return f"Faca login em **{base_url}** com Discord pra vincular sua conta."


async def cast_vote(
    db: AsyncSession,
    *,
    discord_user_id: str,
    guild_id: str,
    vote_id: uuid.UUID,
    approvals: list[uuid.UUID],
    base_url: str,
) -> ActionResult:
    user, group = await _resolve_user_and_group(db, discord_user_id, guild_id)
    if user is None:
        return ActionResult(False, _app_signup_hint(base_url))
    if group is None:
        return ActionResult(False, "Servidor nao registrado no Up2Gether.")

    vote = (
        await db.execute(
            select(VoteSession).where(VoteSession.id == vote_id, VoteSession.group_id == group.id)
        )
    ).scalar_one_or_none()
    if vote is None:
        return ActionResult(False, "Votacao nao existe mais.")

    svc = VoteService(VoteRepository(db), GroupRepository(db), GameRepository(db))
    try:
        await svc.submit_ballot(vote_id, approvals, user)
    except HTTPException as e:
        return ActionResult(False, str(e.detail))

    n = len(approvals)
    picked = "selecao registrada" if n == 1 else f"{n} selecoes registradas"
    return ActionResult(True, f"Voto em **{vote.title}**: {picked}.")


async def set_rsvp(
    db: AsyncSession,
    *,
    discord_user_id: str,
    guild_id: str,
    session_id: uuid.UUID,
    status: SessionRsvp,
    base_url: str,
) -> ActionResult:
    user, group = await _resolve_user_and_group(db, discord_user_id, guild_id)
    if user is None:
        return ActionResult(False, _app_signup_hint(base_url))
    if group is None:
        return ActionResult(False, "Servidor nao registrado no Up2Gether.")

    sess = (
        await db.execute(
            select(PlaySession).where(
                PlaySession.id == session_id, PlaySession.group_id == group.id
            )
        )
    ).scalar_one_or_none()
    if sess is None:
        return ActionResult(False, "Sessao nao existe mais.")

    svc = PlaySessionService(SessionRepository(db), GroupRepository(db), GameRepository(db))
    try:
        await svc.rsvp(group.id, session_id, status, user)
    except HTTPException as e:
        return ActionResult(False, str(e.detail))

    label = {
        SessionRsvp.YES: "confirmado",
        SessionRsvp.MAYBE: "talvez",
        SessionRsvp.NO: "nao vai",
    }[status]
    return ActionResult(True, f"RSVP em **{sess.title}**: {label}.")


async def set_interest(
    db: AsyncSession,
    *,
    discord_user_id: str,
    guild_id: str,
    game_id: uuid.UUID,
    signal: InterestSignal,
    base_url: str,
) -> ActionResult:
    user, group = await _resolve_user_and_group(db, discord_user_id, guild_id)
    if user is None:
        return ActionResult(False, _app_signup_hint(base_url))
    if group is None:
        return ActionResult(False, "Servidor nao registrado no Up2Gether.")

    game = (
        await db.execute(select(Game).where(Game.id == game_id, Game.group_id == group.id))
    ).scalar_one_or_none()
    if game is None:
        return ActionResult(False, "Jogo nao existe nesse servidor.")

    svc = GameService(GameRepository(db), GroupRepository(db))
    try:
        await svc.set_interest(game_id, signal, user)
    except HTTPException as e:
        return ActionResult(False, str(e.detail))

    label = {"want": "quero jogar", "ok": "topo", "pass": "passo"}[signal]
    return ActionResult(True, f"Interesse em **{game.name}**: {label}.")


async def list_group_games(
    db: AsyncSession, *, guild_id: str, query: str, limit: int = 25
) -> list[Game]:
    """Autocomplete pra /up2gether-quero: lista jogos do grupo com match por nome."""
    group = (
        await db.execute(select(Group).where(Group.discord_guild_id == guild_id))
    ).scalar_one_or_none()
    if group is None:
        return []
    stmt = (
        select(Game)
        .where(Game.group_id == group.id, Game.archived_at.is_(None))
        .order_by(Game.name.asc())
        .limit(limit)
    )
    if query:
        # escape % e _ pra nao virar wildcard. User colocar %%% force scan caro.
        esc = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        stmt = (
            select(Game)
            .where(
                Game.group_id == group.id,
                Game.archived_at.is_(None),
                Game.name.ilike(f"%{esc}%", escape="\\"),
            )
            .order_by(Game.name.asc())
            .limit(limit)
        )
    return list((await db.execute(stmt)).scalars().all())
