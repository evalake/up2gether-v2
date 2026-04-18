"""Profile do membro dentro do grupo: stats, top wants, sessions, steam.

Extraido do group_profile_service pra deixar cada arquivo abaixo de 300 linhas.
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
from app.services.auto_resync import maybe_resync_steam


async def _member_stats(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID
) -> dict[str, int]:
    sessions_hosted = int(
        (
            await db.execute(
                select(func.count(PlaySession.id)).where(
                    PlaySession.group_id == group_id,
                    PlaySession.created_by == user_id,
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
                    SessionRsvpRow.user_id == user_id,
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
                    VoteBallot.user_id == user_id,
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
                    SteamGameOwnership.user_id == user_id,
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
                    InterestSignalRow.user_id == user_id,
                    InterestSignalRow.signal == InterestSignal.WANT.value,
                )
            )
        ).scalar_one()
    )
    return {
        "sessions_hosted": sessions_hosted,
        "sessions_rsvp_going": sessions_rsvp_going,
        "votes_cast": votes_cast,
        "games_owned": games_owned,
        "games_wanted": games_wanted,
    }


async def _top_wants(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> list[dict]:
    rows = (
        await db.execute(
            select(Game.id, Game.name, Game.cover_url)
            .join(InterestSignalRow, InterestSignalRow.game_id == Game.id)
            .where(
                Game.group_id == group_id,
                InterestSignalRow.user_id == user_id,
                InterestSignalRow.signal == InterestSignal.WANT.value,
                Game.archived_at.is_(None),
            )
            .order_by(InterestSignalRow.updated_at.desc())
            .limit(5)
        )
    ).all()
    return [{"game_id": str(gid), "name": name, "cover_url": cover} for gid, name, cover in rows]


async def _recent_sessions(db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID) -> list[dict]:
    rows = (
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
                (SessionRsvpRow.session_id == PlaySession.id) & (SessionRsvpRow.user_id == user_id),
            )
            .where(
                PlaySession.group_id == group_id,
                (PlaySession.created_by == user_id) | (SessionRsvpRow.user_id == user_id),
            )
            .order_by(PlaySession.start_at.desc())
            .limit(5)
        )
    ).all()
    return [
        {
            "id": str(sid),
            "title": title,
            "start_at": start.isoformat() if start else None,
            "game_name": gname,
            "game_cover_url": gcover,
            "rsvp_status": rstatus,
            "hosted": created_by == user_id,
        }
        for sid, title, start, gname, gcover, rstatus, created_by in rows
    ]


async def _steam_block(
    db: AsyncSession,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    steam_profile: SteamProfile,
) -> dict:
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
                SteamGameOwnership.user_id == user_id,
                SteamGameOwnership.playtime_forever_minutes > 0,
            )
            .order_by(SteamGameOwnership.playtime_forever_minutes.desc())
            .limit(5)
        )
    ).all()
    total_minutes = (
        await db.execute(
            select(func.coalesce(func.sum(SteamGameOwnership.playtime_forever_minutes), 0))
            .join(Game, Game.id == SteamGameOwnership.game_id)
            .where(
                Game.group_id == group_id,
                SteamGameOwnership.user_id == user_id,
            )
        )
    ).scalar_one() or 0
    minutes_2w = (
        await db.execute(
            select(func.coalesce(func.sum(SteamGameOwnership.playtime_2weeks_minutes), 0))
            .join(Game, Game.id == SteamGameOwnership.game_id)
            .where(
                Game.group_id == group_id,
                SteamGameOwnership.user_id == user_id,
            )
        )
    ).scalar_one() or 0
    return {
        "steam_id": steam_profile.steam_id,
        "persona_name": steam_profile.persona_name,
        "avatar_url": steam_profile.avatar_url,
        "profile_url": steam_profile.profile_url,
        "steam_level": steam_profile.steam_level,
        "country_code": steam_profile.country_code,
        "account_created_at": steam_profile.account_created_at.isoformat()
        if steam_profile.account_created_at
        else None,
        "group_total_hours": int(total_minutes) // 60,
        "group_hours_2weeks": int(minutes_2w) // 60,
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
        "recent_games": steam_profile.recent_games or [],
        "last_synced_at": steam_profile.last_synced_at.isoformat()
        if steam_profile.last_synced_at
        else None,
    }


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

    stats = await _member_stats(db, group_id, target_user_id)
    top_wants = await _top_wants(db, group_id, target_user_id)
    recent_sessions = await _recent_sessions(db, group_id, target_user_id)

    steam_profile_row = (
        await db.execute(select(SteamProfile).where(SteamProfile.user_id == target_user_id))
    ).scalar_one_or_none()
    maybe_resync_steam(
        bg,
        target_user_id,
        steam_profile_row.last_synced_at if steam_profile_row else None,
    )
    steam_block = (
        await _steam_block(db, group_id, target_user_id, steam_profile_row)
        if steam_profile_row
        else None
    )

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
        "stats": stats,
        "top_wants": top_wants,
        "recent_sessions": recent_sessions,
        "steam": steam_block,
    }
