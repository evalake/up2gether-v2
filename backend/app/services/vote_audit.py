"""Montagem da resposta de audit duma VoteSession.

Extraido de vote_service pra reduzir LOC e isolar leitura pura (sem side effects).
"""

from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models.game import Game
from app.models.user import User
from app.models.vote import VoteSession
from app.repositories.group_repo import GroupRepository
from app.repositories.vote_repo import VoteRepository
from app.schemas.vote import (
    VoteAuditCreator,
    VoteAuditGame,
    VoteAuditResponse,
    VoteAuditVoter,
    VoteSessionResponse,
)


async def build_audit(
    votes: VoteRepository,
    groups: GroupRepository,
    session: VoteSession,
    session_resp: VoteSessionResponse,
) -> VoteAuditResponse:
    ballots = await votes.list_ballots(session.id)
    stages = await votes.list_stages(session.id)
    stage_num_by_id = {s.id: s.stage_number for s in stages}

    user_ids: set[uuid.UUID] = {b.user_id for b in ballots}
    if session.created_by:
        user_ids.add(session.created_by)

    members = await groups.list_members(session.group_id)
    member_user_ids = [m.user_id for m in members]
    user_ids.update(member_user_ids)

    users_by_id: dict[uuid.UUID, User] = {}
    if user_ids:
        rows = await votes.db.execute(select(User).where(User.id.in_(list(user_ids))))
        for u in rows.scalars().all():
            users_by_id[u.id] = u

    def _creator(uid: uuid.UUID | None) -> VoteAuditCreator:
        if uid is None or uid not in users_by_id:
            return VoteAuditCreator(id=uid, discord_id=None, display_name=None, avatar_url=None)
        u = users_by_id[uid]
        return VoteAuditCreator(
            id=u.id,
            discord_id=u.discord_id,
            display_name=u.discord_display_name or u.discord_username,
            avatar_url=u.discord_avatar,
        )

    # candidatos de todos os stages + iniciais + vencedor
    cand_ids: set[uuid.UUID] = set()
    for s in stages:
        cand_ids.update(s.candidate_game_ids)
    cand_ids.update(session.candidate_game_ids)
    if session.winner_game_id:
        cand_ids.add(session.winner_game_id)

    games_list: list[VoteAuditGame] = []
    if cand_ids:
        grows = await votes.db.execute(select(Game).where(Game.id.in_(list(cand_ids))))
        for g in grows.scalars().all():
            games_list.append(VoteAuditGame(id=g.id, name=g.name, cover_url=g.cover_url))

    voters: list[VoteAuditVoter] = []
    voted_user_ids: set[uuid.UUID] = set()
    for b in sorted(ballots, key=lambda x: x.submitted_at, reverse=True):
        u = users_by_id.get(b.user_id)
        voted_user_ids.add(b.user_id)
        voters.append(
            VoteAuditVoter(
                user_id=b.user_id,
                discord_id=u.discord_id if u else None,
                display_name=(u.discord_display_name or u.discord_username) if u else "(removido)",
                avatar_url=u.discord_avatar if u else None,
                approvals=list(b.approvals),
                stage_id=b.stage_id,
                stage_number=stage_num_by_id.get(b.stage_id) if b.stage_id else None,
                submitted_at=b.submitted_at,
            )
        )

    non_voters = [_creator(uid) for uid in member_user_ids if uid not in voted_user_ids]

    return VoteAuditResponse(
        session=session_resp,
        creator=_creator(session.created_by),
        games=games_list,
        voters=voters,
        non_voters=non_voters,
    )
