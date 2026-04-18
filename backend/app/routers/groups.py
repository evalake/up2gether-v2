import uuid
from datetime import UTC, datetime
from typing import Annotated

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import rate_limit_mutation
from app.core.security import CurrentUser
from app.domain.enums import AuthProvider
from app.integrations.discord import DiscordClient, get_discord_client
from app.models.game import Game
from app.models.group import Group
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
from app.services.auto_resync import maybe_resync_discord_guild
from app.services.discord_presence import get_bot
from app.services.group_service import GroupService

log = structlog.get_logger()

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


@router.post("/auto-discover")
async def auto_discover_groups(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    discord: Annotated[DiscordClient, Depends(get_discord_client)],
) -> dict:
    """busca guilds do discord do user e faz join automatico nos que ja existem."""
    integ = next(
        (i for i in actor.integrations if i.provider == AuthProvider.DISCORD),
        None,
    )
    if integ is None or not integ.access_token:
        return {"joined": [], "available": []}
    try:
        raw_guilds = await discord.fetch_guilds(integ.access_token)
    except Exception as e:
        log.warning("groups.fetch_guilds_failed", user_id=str(actor.id), err=str(e))
        return {"joined": [], "available": []}
    guild_ids = [str(g["id"]) for g in raw_guilds]
    if not guild_ids:
        return {"joined": [], "available": []}
    # acha quais desses guilds ja existem no up2gether
    from sqlalchemy import select as sa_select

    rows = (
        (await db.execute(sa_select(Group).where(Group.discord_guild_id.in_(guild_ids))))
        .scalars()
        .all()
    )
    repo = GroupRepository(db)
    joined = []
    for grp in rows:
        membership = await repo.get_membership(grp.id, actor.id)
        if membership is None:
            await repo.add_member(grp, actor.id, "member")
            joined.append({"id": str(grp.id), "name": grp.name, "icon_url": grp.icon_url})
    if joined:
        await db.commit()
    # tambem retorna guilds do discord que nao estao no up2gether (pra sugerir criar)
    existing_ids = {grp.discord_guild_id for grp in rows}
    available = []
    for g in raw_guilds:
        if str(g["id"]) not in existing_ids:
            icon_hash = g.get("icon")
            icon_url = (
                f"https://cdn.discordapp.com/icons/{g['id']}/{icon_hash}.png?size=128"
                if icon_hash
                else None
            )
            available.append(
                {"discord_guild_id": str(g["id"]), "name": g["name"], "icon_url": icon_url}
            )
    return {"joined": joined, "available": available}


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
    bg: BackgroundTasks,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> GroupWithStats:
    out = await service.get_for_user(group_id, actor)
    # refresh oportunista do guild visual em background
    maybe_resync_discord_guild(bg, group_id)
    return out


@router.get("/{group_id}/members", response_model=list[GroupMembershipResponse])
async def list_members(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> list[GroupMembershipResponse]:
    return await service.list_members(group_id, actor)


@router.get("/{group_id}/presence")
async def get_group_presence(
    group_id: uuid.UUID,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Retorna {discord_user_id: status} pros membros online do guild.

    Vazio se o bot nao tiver conectado ou se o guild nao tiver o bot.
    Membros nao listados sao considerados offline no frontend.
    """
    repo = GroupRepository(db)
    group = await repo.get_by_id(group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="grupo nao encontrado")
    membership = await repo.get_membership(group_id, actor.id)
    if membership is None and not actor.is_sys_admin:
        raise HTTPException(status_code=403, detail="nao e membro do grupo")
    bot = get_bot()
    if bot is None:
        return {}
    try:
        guild_id = int(group.discord_guild_id)
    except (TypeError, ValueError):
        return {}
    return bot.guild_presences(guild_id)


@router.get("/{group_id}/members/{target_user_id}/profile")
async def get_member_profile_endpoint(
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    actor: CurrentUser,
    bg: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    from app.services.group_member_profile import get_member_profile

    return await get_member_profile(db, group_id, target_user_id, actor, bg)


@router.put("/{group_id}/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def update_webhook(
    group_id: uuid.UUID,
    payload: WebhookUpdate,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    rate_limit_mutation(str(actor.id), str(group_id))
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
    rate_limit_mutation(str(actor.id), str(group_id))
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
        # "cleared" = unlock explicito, audit nao re-deriva do ultimo vote.
        # so volta ao automatico quando um proximo vote fechar (vira "vote").
        grp.current_game_source = "cleared"
        grp.current_game_set_at = datetime.now(UTC)
        grp.current_game_set_by = actor.id
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
    from app.services.group_current_game_audit import get_current_game_audit

    return await get_current_game_audit(db, group_id, actor)


def _apply_guild_visuals(grp: Group, data: dict) -> None:
    """Aplica dados visuais do Discord (qualquer fonte) no model do grupo."""
    gid = grp.discord_guild_id
    if data.get("name"):
        grp.name = data["name"]
    icon_hash = data.get("icon")
    if icon_hash:
        ext = "gif" if str(icon_hash).startswith("a_") else "png"
        grp.icon_url = f"https://cdn.discordapp.com/icons/{gid}/{icon_hash}.{ext}?size=512"
    banner_hash = data.get("banner")
    if banner_hash:
        ext = "gif" if str(banner_hash).startswith("a_") else "png"
        grp.banner_url = f"https://cdn.discordapp.com/banners/{gid}/{banner_hash}.{ext}?size=1024"
    splash_hash = data.get("splash") or data.get("discovery_splash")
    if splash_hash:
        grp.splash_url = f"https://cdn.discordapp.com/splashes/{gid}/{splash_hash}.png?size=1024"
    if data.get("description"):
        grp.description = data["description"]


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
    # tenta bot token primeiro (GET /guilds/{id} retorna banner/icon/splash/desc completos)
    # /preview via OAuth do user NAO retorna banner, so funciona em guilds discoveraveis
    guild_data = await discord.fetch_guild_as_bot(grp.discord_guild_id)
    if not guild_data:
        # fallback: user OAuth (guilds list + preview)
        integ = next(
            (i for i in actor.integrations if i.provider == AuthProvider.DISCORD),
            None,
        )
        if integ and integ.access_token:
            guilds = await discord.fetch_guilds(integ.access_token)
            match = next((g for g in guilds if str(g.get("id")) == grp.discord_guild_id), None)
            if match:
                guild_data = match
            preview = await discord.fetch_guild_preview(integ.access_token, grp.discord_guild_id)
            if preview:
                guild_data = {**(guild_data or {}), **preview}
    if not guild_data:
        raise HTTPException(400, "nao conseguiu puxar dados do discord")
    _apply_guild_visuals(grp, guild_data)
    await db.commit()
    await db.refresh(grp)
    # notifica clients SSE
    from app.services.realtime import get_broker

    get_broker().publish(group_id, kind="group.visuals_updated")
    return grp


@router.delete("/{group_id}/members/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def kick_member(
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> None:
    await service.kick(group_id, target_user_id, actor)
