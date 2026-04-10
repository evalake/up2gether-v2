from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.integrations.steam import HttpSteamClient, SteamClient, get_steam_client
from app.models.game import Game, SteamGameOwnership, SteamProfile
from app.models.user import IntegrationAccount

router = APIRouter(tags=["steam"], prefix="/steam")


async def _upsert_steam_profile(
    db: AsyncSession, user_id, steam_id: str, client: HttpSteamClient
) -> None:
    """Busca summary/level/recent e upserta o SteamProfile snapshot. Best-effort."""
    try:
        summary = await client.get_player_summary(steam_id)
    except Exception:
        summary = None
    try:
        level = await client.get_steam_level(steam_id)
    except Exception:
        level = None
    try:
        recent = await client.get_recently_played(steam_id)
    except Exception:
        recent = []

    row = (
        await db.execute(select(SteamProfile).where(SteamProfile.user_id == user_id))
    ).scalar_one_or_none()
    now = datetime.now(UTC)
    recent_payload = [
        {
            "appid": r.get("appid"),
            "name": r.get("name"),
            "playtime_2weeks_minutes": r.get("playtime_2weeks", 0),
            "playtime_forever_minutes": r.get("playtime_forever", 0),
            "img_icon_url": r.get("img_icon_url"),
        }
        for r in recent
    ]
    account_created = None
    if summary and summary.get("time_created"):
        try:
            account_created = datetime.fromtimestamp(int(summary["time_created"]), tz=UTC)
        except (ValueError, TypeError):
            account_created = None

    if row:
        row.steam_id = steam_id
        if summary:
            row.persona_name = summary.get("persona_name")
            row.real_name = summary.get("real_name")
            row.avatar_url = summary.get("avatar_url")
            row.profile_url = summary.get("profile_url")
            row.country_code = summary.get("country_code")
        if account_created:
            row.account_created_at = account_created
        if level is not None:
            row.steam_level = level
        row.recent_games = recent_payload
        row.last_synced_at = now
    else:
        db.add(
            SteamProfile(
                user_id=user_id,
                steam_id=steam_id,
                persona_name=summary.get("persona_name") if summary else None,
                real_name=summary.get("real_name") if summary else None,
                avatar_url=summary.get("avatar_url") if summary else None,
                profile_url=summary.get("profile_url") if summary else None,
                country_code=summary.get("country_code") if summary else None,
                steam_level=level,
                account_created_at=account_created,
                recent_games=recent_payload,
                last_synced_at=now,
            )
        )


@router.get("/search")
async def steam_search(
    q: Annotated[str, Query(min_length=2)],
    _: CurrentUser,
    client: Annotated[SteamClient, Depends(get_steam_client)],
) -> list[dict]:
    return await client.search(q)


@router.get("/game/{appid}")
async def steam_game(
    appid: int,
    _: CurrentUser,
    client: Annotated[SteamClient, Depends(get_steam_client)],
) -> dict:
    return await client.get_details(appid)


class ImportLibraryIn(BaseModel):
    steam_id_or_vanity: str


class ImportLibraryOut(BaseModel):
    steam_id: str
    owned_count: int
    matched_count: int
    matched_appids: list[int]


@router.post("/library/import", response_model=ImportLibraryOut)
async def import_library(
    payload: ImportLibraryIn,
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    client: Annotated[SteamClient, Depends(get_steam_client)],
) -> ImportLibraryOut:
    raw = payload.steam_id_or_vanity.strip()
    # aceita url completa colada direto: extrai o nick ou id numerico
    import re as _re

    m = _re.search(r"steamcommunity\.com/(?:id|profiles)/([^/?#\s]+)", raw, _re.I)
    if m:
        raw = m.group(1)
    steam_id = raw
    if not raw.isdigit():
        if isinstance(client, HttpSteamClient):
            resolved = await client.resolve_vanity(raw)
            if resolved is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "vanity url nao encontrada")
            steam_id = resolved
        else:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "use o steam id numerico")

    owned = await client.get_owned_games(steam_id)
    owned_appids = {int(g["appid"]) for g in owned if g.get("appid")}
    # index pra lookup rapido de playtime por appid
    owned_by_appid = {int(g["appid"]): g for g in owned if g.get("appid")}

    # salva/atualiza integration account
    existing_int = (
        await db.execute(
            select(IntegrationAccount).where(
                IntegrationAccount.user_id == actor.id,
                IntegrationAccount.provider == "steam",
            )
        )
    ).scalar_one_or_none()
    if existing_int:
        existing_int.external_id = steam_id
    else:
        db.add(IntegrationAccount(user_id=actor.id, provider="steam", external_id=steam_id))

    # persiste a lista de owned_appids no settings do user pra auto-match em jogos
    # que forem criados depois. sem isso so casaria com jogos ja existentes no momento
    # do import.
    new_settings = dict(actor.settings or {})
    new_settings["steam_owned_appids"] = sorted(owned_appids)
    actor.settings = new_settings
    from sqlalchemy.orm.attributes import flag_modified as _fm

    _fm(actor, "settings")

    # marca ownership pra todo Game cujo steam_appid esta na biblioteca
    matches = (
        (
            await db.execute(
                select(Game).where(Game.steam_appid.in_(owned_appids))
                if owned_appids
                else select(Game).where(Game.id == None)  # noqa: E711
            )
        )
        .scalars()
        .all()
    )
    matched_appids: list[int] = []
    now = datetime.now(UTC)
    for g in matches:
        data = owned_by_appid.get(g.steam_appid or -1, {})
        pt_forever = int(data.get("playtime_forever", 0) or 0)
        pt_2w = int(data.get("playtime_2weeks", 0) or 0)
        existing_own = (
            await db.execute(
                select(SteamGameOwnership).where(
                    SteamGameOwnership.user_id == actor.id,
                    SteamGameOwnership.game_id == g.id,
                )
            )
        ).scalar_one_or_none()
        if existing_own:
            existing_own.playtime_forever_minutes = pt_forever
            existing_own.playtime_2weeks_minutes = pt_2w
            existing_own.last_synced_at = now
        else:
            db.add(
                SteamGameOwnership(
                    user_id=actor.id,
                    game_id=g.id,
                    manual=False,
                    playtime_forever_minutes=pt_forever,
                    playtime_2weeks_minutes=pt_2w,
                    last_synced_at=now,
                )
            )
        if g.steam_appid is not None:
            matched_appids.append(g.steam_appid)

    # sync do profile snapshot (summary + level + recently played)
    if isinstance(client, HttpSteamClient):
        await _upsert_steam_profile(db, actor.id, steam_id, client)

    await db.commit()
    return ImportLibraryOut(
        steam_id=steam_id,
        owned_count=len(owned_appids),
        matched_count=len(matched_appids),
        matched_appids=matched_appids,
    )


@router.post("/sync")
async def sync_steam(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    client: Annotated[SteamClient, Depends(get_steam_client)],
) -> dict:
    """Resync da biblioteca + perfil usando o steam_id ja cadastrado.

    Reaproveita import_library mas sem precisar informar o id de novo.
    """
    existing_int = (
        await db.execute(
            select(IntegrationAccount).where(
                IntegrationAccount.user_id == actor.id,
                IntegrationAccount.provider == "steam",
            )
        )
    ).scalar_one_or_none()
    if not existing_int or not existing_int.external_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "steam nao conectado")
    if not isinstance(client, HttpSteamClient):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "steam client indisponivel")

    steam_id = existing_int.external_id
    owned = await client.get_owned_games(steam_id)
    owned_by_appid = {int(g["appid"]): g for g in owned if g.get("appid")}
    owned_appids = set(owned_by_appid.keys())

    new_settings = dict(actor.settings or {})
    new_settings["steam_owned_appids"] = sorted(owned_appids)
    actor.settings = new_settings
    from sqlalchemy.orm.attributes import flag_modified as _fm

    _fm(actor, "settings")

    matches = (
        (
            await db.execute(
                select(Game).where(Game.steam_appid.in_(owned_appids))
                if owned_appids
                else select(Game).where(Game.id == None)  # noqa: E711
            )
        )
        .scalars()
        .all()
    )
    now = datetime.now(UTC)
    for g in matches:
        data = owned_by_appid.get(g.steam_appid or -1, {})
        pt_forever = int(data.get("playtime_forever", 0) or 0)
        pt_2w = int(data.get("playtime_2weeks", 0) or 0)
        existing_own = (
            await db.execute(
                select(SteamGameOwnership).where(
                    SteamGameOwnership.user_id == actor.id,
                    SteamGameOwnership.game_id == g.id,
                )
            )
        ).scalar_one_or_none()
        if existing_own:
            existing_own.playtime_forever_minutes = pt_forever
            existing_own.playtime_2weeks_minutes = pt_2w
            existing_own.last_synced_at = now
        else:
            db.add(
                SteamGameOwnership(
                    user_id=actor.id,
                    game_id=g.id,
                    manual=False,
                    playtime_forever_minutes=pt_forever,
                    playtime_2weeks_minutes=pt_2w,
                    last_synced_at=now,
                )
            )

    await _upsert_steam_profile(db, actor.id, steam_id, client)
    await db.commit()
    return {"ok": True, "owned_count": len(owned_appids), "matched_count": len(matches)}


@router.get("/profile")
async def get_my_steam_profile(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict | None:
    row = (
        await db.execute(select(SteamProfile).where(SteamProfile.user_id == actor.id))
    ).scalar_one_or_none()
    if not row:
        return None
    return {
        "steam_id": row.steam_id,
        "persona_name": row.persona_name,
        "real_name": row.real_name,
        "avatar_url": row.avatar_url,
        "profile_url": row.profile_url,
        "country_code": row.country_code,
        "steam_level": row.steam_level,
        "account_created_at": row.account_created_at.isoformat()
        if row.account_created_at
        else None,
        "recent_games": row.recent_games or [],
        "last_synced_at": row.last_synced_at.isoformat() if row.last_synced_at else None,
    }
