"""Member profile + current game audit queries.

Extraido do groups router pra manter o arquivo <300 linhas.
"""

from __future__ import annotations

import uuid

from fastapi import BackgroundTasks, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import InterestSignal
from app.models.game import Game, InterestSignalRow, SteamGameOwnership, SteamProfile
from app.models.group import GroupMembership
from app.models.session import PlaySession, SessionRsvpRow
from app.models.user import User
from app.models.vote import VoteBallot, VoteSession
from app.repositories.group_repo import GroupRepository
from app.schemas.group import CurrentGameAudit
from app.services.auto_resync import maybe_resync_steam


async def get_member_profile(
    db: AsyncSession,
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    actor: User,
    bg: BackgroundTasks,
) -> dict:
    actor_mem = (
        await db.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == group_id,
                GroupMembership.user_id == actor.id,
            )
        )
    ).scalar_one_or_none()
    if actor_mem is None and not actor.is_sys_admin:
        raise HTTPException(status_code=403, detail="nao e membro do grupo")

    target_mem = (
        await db.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == group_id,
                GroupMembership.user_id == target_user_id,
            )
        )
    ).scalar_one_or_none()
    if target_mem is None:
        raise HTTPException(status_code=404, detail="membro nao encontrado")

    user = (await db.execute(select(User).where(User.id == target_user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="usuario nao encontrado")

    # stats -- 5 counts em paralelo (mesmo db session, nao da pra paralelizar de vdd)
    sessions_hosted = int(
        (
            await db.execute(
                select(func.count(PlaySession.id)).where(
                    PlaySession.group_id == group_id,
                    PlaySession.created_by == target_user_id,
                )
            )
        ).scalar_one()
    )
    sessions_rsvp_going = int(
        (
            await db.execute(
                select(func.count(SessionRsvpRow.id))
                .join(PlaySession, PlaySession.id == SessionRsvpRow.session_id)
                .where(
                    PlaySession.group_id == group_id,
                    SessionRsvpRow.user_id == target_user_id,
                    SessionRsvpRow.status == "going",
                )
            )
        ).scalar_one()
    )
    votes_cast = int(
        (
            await db.execute(
                select(func.count(func.distinct(VoteBallot.vote_session_id)))
                .join(VoteSession, VoteSession.id == VoteBallot.vote_session_id)
                .where(
                    VoteSession.group_id == group_id,
                    VoteBallot.user_id == target_user_id,
                )
            )
        ).scalar_one()
    )
    games_owned = int(
        (
            await db.execute(
                select(func.count(SteamGameOwnership.id))
                .join(Game, Game.id == SteamGameOwnership.game_id)
                .where(
                    Game.group_id == group_id,
                    SteamGameOwnership.user_id == target_user_id,
                )
            )
        ).scalar_one()
    )
    games_wanted = int(
        (
            await db.execute(
                select(func.count(InterestSignalRow.id))
                .join(Game, Game.id == InterestSignalRow.game_id)
                .where(
                    Game.group_id == group_id,
                    InterestSignalRow.user_id == target_user_id,
                    InterestSignalRow.signal == InterestSignal.WANT.value,
                )
            )
        ).scalar_one()
    )

    # top 5 wants
    want_rows = (
        await db.execute(
            select(Game.id, Game.name, Game.cover_url)
            .join(InterestSignalRow, InterestSignalRow.game_id == Game.id)
            .where(
                Game.group_id == group_id,
                InterestSignalRow.user_id == target_user_id,
                InterestSignalRow.signal == InterestSignal.WANT.value,
                Game.archived_at.is_(None),
            )
            .order_by(InterestSignalRow.updated_at.desc())
            .limit(5)
        )
    ).all()
    top_wants = [
        {"game_id": str(gid), "name": name, "cover_url": cover} for gid, name, cover in want_rows
    ]

    # ultimas 5 sessoes
    recent_rows = (
        await db.execute(
            select(
                PlaySession.id,
                PlaySession.title,
                PlaySession.start_at,
                Game.name,
                Game.cover_url,
                SessionRsvpRow.status,
                PlaySession.created_by,
            )
            .join(Game, Game.id == PlaySession.game_id)
            .outerjoin(
                SessionRsvpRow,
                (SessionRsvpRow.session_id == PlaySession.id)
                & (SessionRsvpRow.user_id == target_user_id),
            )
            .where(
                PlaySession.group_id == group_id,
                (PlaySession.created_by == target_user_id)
                | (SessionRsvpRow.user_id == target_user_id),
            )
            .order_by(PlaySession.start_at.desc())
            .limit(5)
        )
    ).all()
    recent_sessions = [
        {
            "id": str(sid),
            "title": title,
            "start_at": start.isoformat() if start else None,
            "game_name": gname,
            "game_cover_url": gcover,
            "rsvp_status": rstatus,
            "hosted": created_by == target_user_id,
        }
        for sid, title, start, gname, gcover, rstatus, created_by in recent_rows
    ]

    # steam
    steam_profile_row = (
        await db.execute(select(SteamProfile).where(SteamProfile.user_id == target_user_id))
    ).scalar_one_or_none()
    maybe_resync_steam(
        bg,
        target_user_id,
        steam_profile_row.last_synced_at if steam_profile_row else None,
    )
    steam_block: dict | None = None
    if steam_profile_row:
        top_played_rows = (
            await db.execute(
                select(
                    Game.id,
                    Game.name,
                    Game.cover_url,
                    SteamGameOwnership.playtime_forever_minutes,
                    SteamGameOwnership.playtime_2weeks_minutes,
                )
                .join(SteamGameOwnership, SteamGameOwnership.game_id == Game.id)
                .where(
                    Game.group_id == group_id,
                    SteamGameOwnership.user_id == target_user_id,
                    SteamGameOwnership.playtime_forever_minutes > 0,
                )
                .order_by(SteamGameOwnership.playtime_forever_minutes.desc())
                .limit(5)
            )
        ).all()
        total_hours = (
            int(
                (
                    await db.execute(
                        select(
                            func.coalesce(func.sum(SteamGameOwnership.playtime_forever_minutes), 0)
                        )
                        .join(Game, Game.id == SteamGameOwnership.game_id)
                        .where(
                            Game.group_id == group_id,
                            SteamGameOwnership.user_id == target_user_id,
                        )
                    )
                ).scalar_one()
                or 0
            )
            // 60
        )
        hours_2w = (
            int(
                (
                    await db.execute(
                        select(
                            func.coalesce(func.sum(SteamGameOwnership.playtime_2weeks_minutes), 0)
                        )
                        .join(Game, Game.id == SteamGameOwnership.game_id)
                        .where(
                            Game.group_id == group_id,
                            SteamGameOwnership.user_id == target_user_id,
                        )
                    )
                ).scalar_one()
                or 0
            )
            // 60
        )
        steam_block = {
            "steam_id": steam_profile_row.steam_id,
            "persona_name": steam_profile_row.persona_name,
            "avatar_url": steam_profile_row.avatar_url,
            "profile_url": steam_profile_row.profile_url,
            "steam_level": steam_profile_row.steam_level,
            "country_code": steam_profile_row.country_code,
            "account_created_at": steam_profile_row.account_created_at.isoformat()
            if steam_profile_row.account_created_at
            else None,
            "group_total_hours": total_hours,
            "group_hours_2weeks": hours_2w,
            "top_played": [
                {
                    "game_id": str(gid),
                    "name": name,
                    "cover_url": cover,
                    "hours": int(pt_forever // 60),
                    "hours_2weeks": round(pt_2w / 60, 1),
                }
                for gid, name, cover, pt_forever, pt_2w in top_played_rows
            ],
            "recent_games": steam_profile_row.recent_games or [],
            "last_synced_at": steam_profile_row.last_synced_at.isoformat()
            if steam_profile_row.last_synced_at
            else None,
        }

    return {
        "user": {
            "id": str(user.id),
            "discord_id": user.discord_id,
            "discord_username": user.discord_username,
            "discord_display_name": user.discord_display_name,
            "discord_avatar": user.discord_avatar,
        },
        "role": target_mem.role,
        "joined_at": target_mem.joined_at.isoformat() if target_mem.joined_at else None,
        "is_sys_admin": user.is_sys_admin,
        "stats": {
            "sessions_hosted": sessions_hosted,
            "sessions_rsvp_going": sessions_rsvp_going,
            "votes_cast": votes_cast,
            "games_owned": games_owned,
            "games_wanted": games_wanted,
        },
        "top_wants": top_wants,
        "recent_sessions": recent_sessions,
        "steam": steam_block,
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

    current_game_id = grp.current_game_id
    derived_vote_id = grp.current_game_vote_id
    derived_set_at = grp.current_game_set_at
    derived_source = grp.current_game_source

    if grp.current_game_source == "cleared":
        return None

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
            current_game_id = newer_vote.winner_game_id
            derived_vote_id = newer_vote.id
            derived_set_at = newer_vote.closed_at
            derived_source = "vote"

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
            return None
        current_game_id = last_vote.winner_game_id
        derived_vote_id = last_vote.id
        derived_set_at = last_vote.closed_at
        derived_source = "vote"

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

    vote_title = None
    vote_ballots = None
    vote_eligible = None
    vote_winner_approvals = None
    vote_runner_ups: list[dict] = []
    vote_was_tiebreak = False

    if derived_vote_id:
        vote = await db.get(VoteSession, derived_vote_id)
        if vote:
            vote_title = vote.title
            vote_eligible = vote.eligible_voter_count
            vote_ballots = int(
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
            tally_map: dict[uuid.UUID, int] = {}
            for cid in vote.candidate_game_ids:
                tally_map[cid] = 0
            for b in ballots_rows:
                for a in b.approvals or []:
                    tally_map[a] = tally_map.get(a, 0) + 1
            vote_winner_approvals = tally_map.get(game.id, 0)
            # runner ups top 3
            others = sorted(
                ((cid, c) for cid, c in tally_map.items() if cid != game.id),
                key=lambda x: -x[1],
            )[:3]
            other_ids = [cid for cid, _ in others]
            if other_ids:
                other_games = {
                    g.id: g
                    for g in (await db.execute(select(Game).where(Game.id.in_(other_ids))))
                    .scalars()
                    .all()
                }
                for cid, c in others:
                    og = other_games.get(cid)
                    if og:
                        vote_runner_ups.append(
                            {
                                "game_id": str(cid),
                                "name": og.name,
                                "cover_url": og.cover_url,
                                "approvals": c,
                            }
                        )
            top_approvals = max((c for _, c in tally_map.items()), default=0)
            tied = [cid for cid, c in tally_map.items() if c == top_approvals]
            vote_was_tiebreak = len(tied) > 1

    # interest signals
    interest_rows = (
        await db.execute(
            select(InterestSignalRow.signal, func.count())
            .where(InterestSignalRow.game_id == game.id)
            .group_by(InterestSignalRow.signal)
        )
    ).all()
    interest_map = {s: int(c) for s, c in interest_rows}
    owners = int(
        (
            await db.execute(
                select(func.count())
                .select_from(SteamGameOwnership)
                .where(SteamGameOwnership.game_id == game.id)
            )
        ).scalar_one()
    )
    sessions = int(
        (
            await db.execute(
                select(func.count()).select_from(PlaySession).where(PlaySession.game_id == game.id)
            )
        ).scalar_one()
    )
    # playtime leaderboard
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
                SteamGameOwnership.game_id == game.id,
                GroupMembership.group_id == group_id,
                SteamGameOwnership.playtime_forever_minutes > 0,
            )
            .order_by(SteamGameOwnership.playtime_forever_minutes.desc())
            .limit(10)
        )
    ).all()
    playtime_lb = [
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

    return CurrentGameAudit(
        game_id=game.id,
        name=game.name,
        cover_url=game.cover_url,
        source=derived_source,
        set_at=derived_set_at,
        set_by_user_id=grp.current_game_set_by,
        set_by_user_name=set_by_name,
        vote_id=derived_vote_id,
        vote_title=vote_title,
        vote_ballots_count=vote_ballots,
        vote_eligible_count=vote_eligible,
        vote_winner_approvals=vote_winner_approvals,
        vote_was_tiebreak=vote_was_tiebreak,
        vote_runner_ups=vote_runner_ups,
        added_by_user_id=game.created_by,
        added_by_user_name=added_by_name,
        added_at=game.created_at,
        interest_want_count=interest_map.get(InterestSignal.WANT.value, 0),
        interest_meh_count=interest_map.get(InterestSignal.OK.value, 0),
        interest_nope_count=interest_map.get(InterestSignal.PASS.value, 0),
        owners_count=owners,
        sessions_count=sessions,
        playtime_leaderboard=playtime_lb,
    )
