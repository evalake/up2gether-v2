import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.repositories.group_repo import GroupRepository
from app.repositories.theme_repo import ThemeRepository
from app.schemas.theme import (
    CycleResponse,
    SuggestionCreate,
    ThemeAuditResponse,
    ThemeCreate,
    ThemeResponse,
    VoteCast,
)
from app.services.theme_service import ThemeService

router = APIRouter(tags=["themes"])


def get_theme_service(db: Annotated[AsyncSession, Depends(get_db)]) -> ThemeService:
    return ThemeService(ThemeRepository(db), GroupRepository(db))


@router.post("/groups/{group_id}/themes", response_model=ThemeResponse)
async def set_theme(
    group_id: uuid.UUID,
    payload: ThemeCreate,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> ThemeResponse:
    return await service.set_theme(group_id, payload, actor)


@router.get("/groups/{group_id}/themes/current", response_model=ThemeResponse | None)
async def get_current_theme(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> ThemeResponse | None:
    return await service.get_current(group_id, actor)


@router.get("/groups/{group_id}/themes", response_model=list[ThemeResponse])
async def list_themes(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> list[ThemeResponse]:
    return await service.list_history(group_id, actor)


@router.get("/groups/{group_id}/themes/{theme_id}/audit", response_model=ThemeAuditResponse)
async def theme_audit(
    group_id: uuid.UUID,
    theme_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> ThemeAuditResponse:
    return await service.audit(group_id, actor, theme_id=theme_id)


@router.get(
    "/groups/{group_id}/themes/cycle/{cycle_id}/audit",
    response_model=ThemeAuditResponse,
)
async def theme_cycle_audit(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> ThemeAuditResponse:
    return await service.audit(group_id, actor, cycle_id=cycle_id)


@router.delete("/groups/{group_id}/themes/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theme(
    group_id: uuid.UUID,
    theme_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> None:
    await service.delete(group_id, theme_id, actor)


# ---- cycles ----


@router.get("/groups/{group_id}/themes/cycle", response_model=CycleResponse | None)
async def get_current_cycle(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse | None:
    return await service.get_or_none_current_cycle(group_id, actor)


@router.post("/groups/{group_id}/themes/cycle", response_model=CycleResponse)
async def open_cycle(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.open_cycle(group_id, actor)


@router.put("/groups/{group_id}/themes/cycle/{cycle_id}/suggestion", response_model=CycleResponse)
async def upsert_suggestion(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    payload: SuggestionCreate,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.upsert_suggestion(group_id, cycle_id, payload, actor)


@router.delete(
    "/groups/{group_id}/themes/cycle/{cycle_id}/suggestion", response_model=CycleResponse
)
async def delete_suggestion(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.delete_suggestion(group_id, cycle_id, actor)


@router.delete(
    "/groups/{group_id}/themes/cycle/{cycle_id}/suggestion/{suggestion_id}",
    response_model=CycleResponse,
)
async def delete_suggestion_by_id(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.delete_suggestion(group_id, cycle_id, actor, suggestion_id)


@router.post(
    "/groups/{group_id}/themes/cycle/{cycle_id}/start-voting", response_model=CycleResponse
)
async def start_voting(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.start_voting(group_id, cycle_id, actor)


@router.put("/groups/{group_id}/themes/cycle/{cycle_id}/vote", response_model=CycleResponse)
async def cast_vote(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    payload: VoteCast,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.cast_vote(group_id, cycle_id, payload.suggestion_id, actor)


@router.post("/groups/{group_id}/themes/cycle/{cycle_id}/close", response_model=CycleResponse)
async def close_cycle(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.close_cycle(group_id, cycle_id, actor)


@router.post(
    "/groups/{group_id}/themes/cycle/{cycle_id}/force/{suggestion_id}", response_model=CycleResponse
)
async def force_decide(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.force_decide(group_id, cycle_id, suggestion_id, actor)


@router.post("/groups/{group_id}/themes/cycle/{cycle_id}/cancel", response_model=CycleResponse)
async def cancel_cycle(
    group_id: uuid.UUID,
    cycle_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[ThemeService, Depends(get_theme_service)],
) -> CycleResponse:
    return await service.cancel_cycle(group_id, cycle_id, actor)
