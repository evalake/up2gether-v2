"""Audit do current_game do grupo: source resolution, vote breakdown, leaderboard.

Extraido do group_profile_service pra deixar cada arquivo abaixo de 300 linhas.
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import InterestSignal
from app.models.game import Game, InterestSignalRow, SteamGameOwnership
from app.models.group import GroupMembership
from app.models.session import PlaySession
from app.models.user import User
from app.models.vote import VoteBallot, VoteSession
from app.repositories.group_repo import GroupRepository
from app.schemas.group import CurrentGameAudit


async def _resolve_source(
    db: AsyncSession, group_id: uuid.UUID, grp
) -> tuple[uuid.UUID | None, uuid.UUID | None, object, str | None]:
    """Resolve current_game effective: pode vir de grp.current_game_id ou
    de uma vote mais recente que sobrescreve o manual.
    Retorna (game_id, vote_id, set_at, source) ou (None, None, None, None) se cleared.
    """
    if grp.current_game_source == "cleared":
        return None, None, None, None

    current_game_id = grp.current_game_id
    derived_vote_id = grp.current_game_vote_id
    derived_set_at = grp.current_game_set_at
    derived_source = grp.current_game_source

    if grp.current_game_source == "manual" and grp.current_game_set_at is not None:
        newer_vote = (
            await db.execute(
                select(VoteSession)
                .where(
                    VoteSession.group_id == group_id,
                    VoteSession.status == "closed",
                    VoteSession.winner_game_id.is_not(None),
                    VoteSession.closed_at > grp.current_game_set_at,
                )
                .order_by(VoteSession.closed_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if newer_vote is not None:
            return newer_vote.winner_game_id, newer_vote.id, newer_vote.closed_at, "vote"

    if grp.current_game_source in (None, "vote"):
        last_vote = (
            await db.execute(
                select(VoteSession)
                .where(
                    VoteSession.group_id == group_id,
                    VoteSession.status == "closed",
                    VoteSession.winner_game_id.is_not(None),
                )
                .order_by(VoteSession.closed_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if last_vote is None:
            return None, None, None, None
        return last_vote.winner_game_id, last_vote.id, last_vote.closed_at, "vote"

    return current_game_id, derived_vote_id, derived_set_at, derived_source


async def _vote_breakdown(db: AsyncSession, vote_id: uuid.UUID, winner_game_id: uuid.UUID) -> dict:
    vote = await db.get(VoteSession, vote_id)
    if vote is None:
        return {}
    ballots_count = int(
        (
            await db.execute(
                select(func.count(func.distinct(VoteBallot.user_id))).where(
                    VoteBallot.vote_session_id == vote.id
                )
            )
        ).scalar_one()
    )
    ballots_rows = (
        (await db.execute(select(VoteBallot).where(VoteBallot.vote_session_id == vote.id)))
        .scalars()
        .all()
    )
    tally_map: dict[uuid.UUID, int] = {cid: 0 for cid in vote.candidate_game_ids}
    for b in ballots_rows:
        for a in b.approvals or []:
            tally_map[a] = tally_map.get(a, 0) + 1
    winner_approvals = tally_map.get(winner_game_id, 0)
    others = sorted(
        ((cid, c) for cid, c in tally_map.items() if cid != winner_game_id),
        key=lambda x: -x[1],
    )[:3]
    other_ids = [cid for cid, _ in others]
    runner_ups: list[dict] = []
    if other_ids:
        other_games = {
            g.id: g
            for g in (await db.execute(select(Game).where(Game.id.in_(other_ids)))).scalars().all()
        }
        for cid, c in others:
            og = other_games.get(cid)
            if og:
                runner_ups.append(
                    {
                        "game_id": str(cid),
                        "name": og.name,
                        "cover_url": og.cover_url,
                        "approvals": c,
                    }
                )
    top_approvals = max((c for _, c in tally_map.items()), default=0)
    tied = [cid for cid, c in tally_map.items() if c == top_approvals]
    return {
        "title": vote.title,
        "ballots_count": ballots_count,
        "eligible_count": vote.eligible_voter_count,
        "winner_approvals": winner_approvals,
        "was_tiebreak": len(tied) > 1,
        "runner_ups": runner_ups,
    }


async def _game_engagement(db: AsyncSession, game_id: uuid.UUID, group_id: uuid.UUID) -> dict:
    interest_rows = (
        await db.execute(
            select(InterestSignalRow.signal, func.count())
            .where(InterestSignalRow.game_id == game_id)
            .group_by(InterestSignalRow.signal)
        )
    ).all()
    interest_map = {s: int(c) for s, c in interest_rows}
    owners = int(
        (
            await db.execute(
                select(func.count())
                .select_from(SteamGameOwnership)
                .where(SteamGameOwnership.game_id == game_id)
            )
        ).scalar_one()
    )
    sessions = int(
        (
            await db.execute(
                select(func.count()).select_from(PlaySession).where(PlaySession.game_id == game_id)
            )
        ).scalar_one()
    )
    lb_rows = (
        await db.execute(
            select(
                User.id,
                User.discord_id,
                User.discord_display_name,
                User.discord_username,
                User.discord_avatar,
                SteamGameOwnership.playtime_forever_minutes,
                SteamGameOwnership.playtime_2weeks_minutes,
            )
            .join(SteamGameOwnership, SteamGameOwnership.user_id == User.id)
            .join(GroupMembership, GroupMembership.user_id == User.id)
            .where(
                SteamGameOwnership.game_id == game_id,
                GroupMembership.group_id == group_id,
                SteamGameOwnership.playtime_forever_minutes > 0,
            )
            .order_by(SteamGameOwnership.playtime_forever_minutes.desc())
            .limit(10)
        )
    ).all()
    leaderboard = [
        {
            "user_id": str(uid),
            "discord_id": did,
            "name": dname or dusr,
            "avatar": davatar,
            "hours": int(pt // 60),
            "hours_2weeks": round(pt2w / 60, 1),
        }
        for uid, did, dname, dusr, davatar, pt, pt2w in lb_rows
    ]
    return {
        "want": interest_map.get(InterestSignal.WANT.value, 0),
        "meh": interest_map.get(InterestSignal.OK.value, 0),
        "nope": interest_map.get(InterestSignal.PASS.value, 0),
        "owners": owners,
        "sessions": sessions,
        "leaderboard": leaderboard,
    }


async def get_current_game_audit(
    db: AsyncSession,
    group_id: uuid.UUID,
    actor: User,
) -> CurrentGameAudit | None:
    repo = GroupRepository(db)
    grp = await repo.get_by_id(group_id)
    if grp is None:
        raise HTTPException(404, "group not found")
    membership = await repo.get_membership(group_id, actor.id)
    if membership is None and not actor.is_sys_admin:
        raise HTTPException(403, "not a member")

    current_game_id, derived_vote_id, derived_set_at, derived_source = await _resolve_source(
        db, group_id, grp
    )
    if current_game_id is None:
        return None

    game = await db.get(Game, current_game_id)
    if game is None:
        return None

    added_by_name = None
    if game.created_by:
        u = await db.get(User, game.created_by)
        added_by_name = (u.discord_display_name or u.discord_username) if u else None
    set_by_name = None
    if grp.current_game_set_by:
        u = await db.get(User, grp.current_game_set_by)
        set_by_name = (u.discord_display_name or u.discord_username) if u else None

    vote_block: dict = {}
    if derived_vote_id:
        vote_block = await _vote_breakdown(db, derived_vote_id, game.id)

    eng = await _game_engagement(db, game.id, group_id)

    return CurrentGameAudit(
        game_id=game.id,
        name=game.name,
        cover_url=game.cover_url,
        source=derived_source,
        set_at=derived_set_at,
        set_by_user_id=grp.current_game_set_by,
        set_by_user_name=set_by_name,
        vote_id=derived_vote_id,
        vote_title=vote_block.get("title"),
        vote_ballots_count=vote_block.get("ballots_count"),
        vote_eligible_count=vote_block.get("eligible_count"),
        vote_winner_approvals=vote_block.get("winner_approvals"),
        vote_was_tiebreak=vote_block.get("was_tiebreak", False),
        vote_runner_ups=vote_block.get("runner_ups", []),
        added_by_user_id=game.created_by,
        added_by_user_name=added_by_name,
        added_at=game.created_at,
        interest_want_count=eng["want"],
        interest_meh_count=eng["meh"],
        interest_nope_count=eng["nope"],
        owners_count=eng["owners"],
        sessions_count=eng["sessions"],
        playtime_leaderboard=eng["leaderboard"],
    )
