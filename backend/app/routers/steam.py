from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.integrations.steam import HttpSteamClient, SteamClient, get_steam_client
from app.models.game import Game, SteamGameOwnership
from app.models.user import IntegrationAccount

router = APIRouter(tags=["steam"], prefix="/steam")


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
    for g in matches:
        # upsert ownership
        existing_own = (
            await db.execute(
                select(SteamGameOwnership).where(
                    SteamGameOwnership.user_id == actor.id,
                    SteamGameOwnership.game_id == g.id,
                )
            )
        ).scalar_one_or_none()
        if not existing_own:
            db.add(SteamGameOwnership(user_id=actor.id, game_id=g.id, manual=False))
        if g.steam_appid is not None:
            matched_appids.append(g.steam_appid)

    await db.commit()
    return ImportLibraryOut(
        steam_id=steam_id,
        owned_count=len(owned_appids),
        matched_count=len(matched_appids),
        matched_appids=matched_appids,
    )
