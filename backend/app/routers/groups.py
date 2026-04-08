import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.repositories.group_repo import GroupRepository
from app.schemas.group import (
    CurrentGameAudit,
    CurrentGameUpdate,
    GroupCreate,
    GroupMembershipResponse,
    GroupResponse,
    GroupWithStats,
    PromoteRequest,
    WebhookUpdate,
)
from app.repositories.game_repo import GameRepository
from app.models.vote import VoteSession
from app.models.user import User
from app.models.game import Game
from app.models.session import PlaySession
from sqlalchemy import select, func
from datetime import datetime, UTC
from app.domain.enums import InterestSignal
from app.services.group_service import GroupService
from app.integrations.discord import DiscordClient, get_discord_client
from app.domain.enums import AuthProvider
from fastapi import HTTPException

router = APIRouter(prefix="/groups", tags=["groups"])


def get_group_service(db: Annotated[AsyncSession, Depends(get_db)]) -> GroupService:
    return GroupService(GroupRepository(db))


@router.post("", response_model=GroupResponse)
async def create_or_join_group(
    payload: GroupCreate,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> GroupResponse:
    return await service.create_or_join_from_discord(
        discord_guild_id=payload.discord_guild_id,
        name=payload.name,
        icon_url=payload.icon_url,
        webhook_url=payload.webhook_url,
        actor=actor,
        discord_permissions=payload.discord_permissions,
    )


@router.get("", response_model=list[GroupWithStats])
async def list_groups(
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> list[GroupWithStats]:
    return await service.list_for_user(actor)


@router.get("/{group_id}", response_model=GroupWithStats)
async def get_group(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> GroupWithStats:
    return await service.get_for_user(group_id, actor)


@router.get("/{group_id}/members", response_model=list[GroupMembershipResponse])
async def list_members(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> list[GroupMembershipResponse]:
    return await service.list_members(group_id, actor)


@router.put("/{group_id}/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def update_webhook(
    group_id: uuid.UUID,
    payload: WebhookUpdate,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    await service.update_webhook(group_id, actor, payload.webhook_url)


@router.delete("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_group(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    await service.leave(group_id, actor)


@router.post("/{group_id}/purge", status_code=status.HTTP_204_NO_CONTENT)
async def purge_group(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    await service.purge(group_id, actor)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    await service.delete(group_id, actor)


@router.post("/{group_id}/members/{target_user_id}/promote", status_code=status.HTTP_204_NO_CONTENT)
async def promote_member(
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    payload: PromoteRequest,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    await service.promote(group_id, target_user_id, payload.new_role, actor)


@router.post("/{group_id}/members/{target_user_id}/demote", status_code=status.HTTP_204_NO_CONTENT)
async def demote_member(
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    await service.demote(group_id, target_user_id, actor)


@router.patch("/{group_id}/current-game", response_model=GroupResponse)
async def set_current_game(
    group_id: uuid.UUID,
    payload: CurrentGameUpdate,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GroupResponse:
    repo = GroupRepository(db)
    grp = await repo.get_by_id(group_id)
    if grp is None:
        raise HTTPException(404, "group not found")
    membership = await repo.get_membership(group_id, actor.id)
    role = membership.role if membership else None
    if role not in ("admin", "mod") and not actor.is_sys_admin:
        raise HTTPException(403, "precisa ser admin ou mod")
    if payload.game_id is not None:
        g = await db.get(Game, payload.game_id)
        if g is None or g.group_id != group_id:
            raise HTTPException(404, "game not found")
        grp.current_game_id = payload.game_id
        grp.current_game_source = "manual" if payload.lock_manual else "vote"
        grp.current_game_set_at = datetime.now(UTC)
        grp.current_game_set_by = actor.id
        grp.current_game_vote_id = None
    else:
        grp.current_game_id = None
        grp.current_game_source = None
        grp.current_game_set_at = None
        grp.current_game_set_by = None
        grp.current_game_vote_id = None
    await db.commit()
    await db.refresh(grp)
    from app.services.notifications import notify_group
    if payload.game_id is not None:
        g2 = await db.get(Game, payload.game_id)
        await notify_group(
            db,
            group_id=group_id,
            event="current_game.changed",
            title=f"Game atual: {g2.name if g2 else ''}",
            body="Definido manualmente pelo admin" if payload.lock_manual else "Atualizado",
            link=f"/groups/{group_id}",
            data={"group_id": str(group_id), "game_id": str(payload.game_id)},
            exclude_user_ids=[actor.id],
            webhook_description=(
                f"**{g2.name if g2 else 'jogo'}** agora é o game da vez"
                + (" (travado manualmente pelo admin)." if payload.lock_manual else ".")
            ),
            webhook_image_url=g2.cover_url if g2 else None,
        )
    else:
        await notify_group(
            db,
            group_id=group_id,
            event="current_game.changed",
            title="Game atual destravado",
            body="O highlight foi limpo",
            link=f"/groups/{group_id}",
            data={"group_id": str(group_id)},
            exclude_user_ids=[actor.id],
            webhook_description="O game da vez foi destravado. A próxima votação volta a definir automaticamente.",
        )
    return grp


@router.get("/{group_id}/current-game/audit", response_model=CurrentGameAudit | None)
async def current_game_audit(
    group_id: uuid.UUID,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentGameAudit | None:
    repo = GroupRepository(db)
    grp = await repo.get_by_id(group_id)
    if grp is None:
        raise HTTPException(404, "group not found")
    membership = await repo.get_membership(group_id, actor.id)
    if membership is None and not actor.is_sys_admin:
        raise HTTPException(403, "not a member")
    # fallback: se nao foi setado ainda (votacoes antigas), pega o vencedor do
    # ultimo vote fechado do grupo e usa como current_game derivado
    current_game_id = grp.current_game_id
    derived_vote_id = grp.current_game_vote_id
    derived_set_at = grp.current_game_set_at
    derived_source = grp.current_game_source
    if current_game_id is None:
        last_vote = (await db.execute(
            select(VoteSession)
            .where(
                VoteSession.group_id == group_id,
                VoteSession.status == "closed",
                VoteSession.winner_game_id.is_not(None),
            )
            .order_by(VoteSession.closed_at.desc())
            .limit(1)
        )).scalar_one_or_none()
        if last_vote is None:
            return None
        current_game_id = last_vote.winner_game_id
        derived_vote_id = last_vote.id
        derived_set_at = last_vote.closed_at
        derived_source = "vote"
    game = await db.get(Game, current_game_id)
    if game is None:
        return None
    # added_by
    added_by_name = None
    if game.created_by:
        u = await db.get(User, game.created_by)
        added_by_name = (u.discord_display_name or u.discord_username) if u else None
    set_by_name = None
    if grp.current_game_set_by:
        u = await db.get(User, grp.current_game_set_by)
        set_by_name = (u.discord_display_name or u.discord_username) if u else None
    # vote context
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
            vote_ballots = vote.ballots_count
            vote_eligible = vote.eligible_voter_count
            # conta approvals por candidate
            from app.models.vote import VoteBallot
            ballots_rows = (await db.execute(
                select(VoteBallot).where(VoteBallot.vote_session_id == vote.id)
            )).scalars().all()
            tally_map: dict[uuid.UUID, int] = {}
            for cid in vote.candidate_game_ids:
                tally_map[cid] = 0
            for b in ballots_rows:
                for a in (b.approvals or []):
                    tally_map[a] = tally_map.get(a, 0) + 1
            vote_winner_approvals = tally_map.get(game.id, 0)
            # runner ups top 3 sem vencedor
            others = sorted(
                ((cid, c) for cid, c in tally_map.items() if cid != game.id),
                key=lambda x: -x[1],
            )[:3]
            for cid, c in others:
                og = await db.get(Game, cid)
                if og:
                    vote_runner_ups.append({
                        "game_id": str(cid),
                        "name": og.name,
                        "cover_url": og.cover_url,
                        "approvals": c,
                    })
            # empate se top2 = top1 (ignorando vencedor)
            top_approvals = max((c for _, c in tally_map.items()), default=0)
            tied = [cid for cid, c in tally_map.items() if c == top_approvals]
            vote_was_tiebreak = len(tied) > 1
    # interest signals
    from app.models.game import InterestSignalRow, SteamGameOwnership
    interest_rows = (await db.execute(
        select(InterestSignalRow.signal, func.count())
        .where(InterestSignalRow.game_id == game.id)
        .group_by(InterestSignalRow.signal)
    )).all()
    interest_map = {s: int(c) for s, c in interest_rows}
    owners = int((await db.execute(
        select(func.count()).select_from(SteamGameOwnership).where(SteamGameOwnership.game_id == game.id)
    )).scalar_one())
    sessions = int((await db.execute(
        select(func.count()).select_from(PlaySession).where(PlaySession.game_id == game.id)
    )).scalar_one())
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
    )


@router.post("/{group_id}/sync-discord", response_model=GroupResponse)
async def sync_discord_visuals(
    group_id: uuid.UUID,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    discord: Annotated[DiscordClient, Depends(get_discord_client)],
) -> GroupResponse:
    # pega dados visuais frescos do discord e atualiza icon/banner/splash/description
    repo = GroupRepository(db)
    grp = await repo.get_by_id(group_id)
    if grp is None:
        raise HTTPException(404, "group not found")
    membership = await repo.get_membership(group_id, actor.id)
    if membership is None and not actor.is_sys_admin:
        raise HTTPException(403, "not a member")
    integ = next(
        (i for i in actor.integrations if i.provider == AuthProvider.DISCORD),
        None,
    )
    if integ is None or not integ.access_token:
        raise HTTPException(400, "discord not linked")
    # re-fetch lista de guilds pra pegar icon atualizado
    guilds = await discord.fetch_guilds(integ.access_token)
    match = next((g for g in guilds if str(g.get("id")) == grp.discord_guild_id), None)
    if match:
        icon_hash = match.get("icon")
        if icon_hash:
            ext = "gif" if str(icon_hash).startswith("a_") else "png"
            grp.icon_url = f"https://cdn.discordapp.com/icons/{grp.discord_guild_id}/{icon_hash}.{ext}?size=512"
        if match.get("name"):
            grp.name = match["name"]
    # tenta /preview pra banner/splash/description (so funciona em guilds discoveraveis ou com bot)
    preview = await discord.fetch_guild_preview(integ.access_token, grp.discord_guild_id)
    if preview:
        banner_hash = preview.get("banner")
        splash_hash = preview.get("splash") or preview.get("discovery_splash")
        if banner_hash:
            ext = "gif" if str(banner_hash).startswith("a_") else "png"
            grp.banner_url = f"https://cdn.discordapp.com/banners/{grp.discord_guild_id}/{banner_hash}.{ext}?size=1024"
        if splash_hash:
            grp.splash_url = f"https://cdn.discordapp.com/splashes/{grp.discord_guild_id}/{splash_hash}.png?size=1024"
        if preview.get("description"):
            grp.description = preview["description"]
    await db.commit()
    await db.refresh(grp)
    return grp


@router.delete("/{group_id}/members/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def kick_member(
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    await service.kick(group_id, target_user_id, actor)
