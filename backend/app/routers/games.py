import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.repositories.game_repo import GameRepository
from app.repositories.group_repo import GroupRepository
from app.schemas.game import (
    GameCreate,
    GameUpdate,
    GameWithViability,
    InterestSignalUpdate,
    OwnershipToggle,
)
from app.services.game_service import GameService

router = APIRouter(tags=["games"])


def get_game_service(db: Annotated[AsyncSession, Depends(get_db)]) -> GameService:
    return GameService(GameRepository(db), GroupRepository(db))


@router.post("/groups/{group_id}/games", response_model=GameWithViability)
async def create_game(
    group_id: uuid.UUID,
    payload: GameCreate,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
) -> GameWithViability:
    return await service.create(group_id, payload, actor)


@router.get("/groups/{group_id}/games", response_model=list[GameWithViability])
async def list_games(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
    include_archived: bool = False,
) -> list[GameWithViability]:
    return await service.list_for_group(group_id, actor, include_archived)


@router.get("/groups/{group_id}/games/{game_id}", response_model=GameWithViability)
async def get_game(
    group_id: uuid.UUID,
    game_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
) -> GameWithViability:
    return await service.get(group_id, game_id, actor)


@router.patch("/groups/{group_id}/games/{game_id}", response_model=GameWithViability)
async def update_game(
    group_id: uuid.UUID,
    game_id: uuid.UUID,
    payload: GameUpdate,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
) -> GameWithViability:
    return await service.update(group_id, game_id, payload, actor)


@router.delete("/groups/{group_id}/games/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_game(
    group_id: uuid.UUID,
    game_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
) -> None:
    await service.archive(group_id, game_id, actor)


@router.put("/games/{game_id}/interest", response_model=GameWithViability)
async def set_interest(
    game_id: uuid.UUID,
    payload: InterestSignalUpdate,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
):
    return await service.set_interest(game_id, payload.signal, actor)


@router.post("/games/{game_id}/roster", response_model=GameWithViability)
async def join_roster(
    game_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
):
    return await service.join_roster(game_id, actor, "active", None)


@router.delete("/games/{game_id}/roster", response_model=GameWithViability)
async def leave_roster(
    game_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
):
    return await service.leave_roster(game_id, actor)


@router.get("/games/{game_id}/owners")
async def list_game_owners(
    game_id: uuid.UUID,
    _: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    repo = GameRepository(db)
    owners = await repo.list_owners(game_id)
    return [
        {
            "id": str(u.id),
            "discord_id": u.discord_id,
            "discord_username": u.discord_username,
            "discord_display_name": u.discord_display_name,
            "discord_avatar": u.discord_avatar,
        }
        for u in owners
    ]


@router.put("/games/{game_id}/ownership", response_model=GameWithViability)
async def toggle_ownership(
    game_id: uuid.UUID,
    payload: OwnershipToggle,
    actor: CurrentUser,
    service: Annotated[GameService, Depends(get_game_service)],
):
    return await service.toggle_ownership(game_id, payload.owns, actor)
