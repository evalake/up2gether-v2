import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.repositories.game_repo import GameRepository
from app.repositories.group_repo import GroupRepository
from app.repositories.session_repo import SessionRepository
from app.schemas.session import (
    RsvpUpdate,
    SessionAuditResponse,
    SessionCreate,
    SessionResponse,
    SessionUpdate,
)
from app.services.session_service import PlaySessionService

router = APIRouter(tags=["sessions"])


def get_session_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PlaySessionService:
    return PlaySessionService(SessionRepository(db), GroupRepository(db), GameRepository(db))


@router.post("/groups/{group_id}/sessions", response_model=SessionResponse)
async def create_session(
    group_id: uuid.UUID,
    payload: SessionCreate,
    actor: CurrentUser,
    service: Annotated[PlaySessionService, Depends(get_session_service)],
) -> SessionResponse:
    return await service.create(group_id, payload, actor)


@router.get("/groups/{group_id}/sessions", response_model=list[SessionResponse])
async def list_sessions(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[PlaySessionService, Depends(get_session_service)],
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[SessionResponse]:
    return await service.list_for_group(group_id, actor, limit, offset)


@router.get(
    "/groups/{group_id}/sessions/{session_id}/audit",
    response_model=SessionAuditResponse,
)
async def session_audit(
    group_id: uuid.UUID,
    session_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[PlaySessionService, Depends(get_session_service)],
) -> SessionAuditResponse:
    return await service.audit(group_id, session_id, actor)


@router.get("/groups/{group_id}/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    group_id: uuid.UUID,
    session_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[PlaySessionService, Depends(get_session_service)],
) -> SessionResponse:
    return await service.get(group_id, session_id, actor)


@router.patch("/groups/{group_id}/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    group_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: SessionUpdate,
    actor: CurrentUser,
    service: Annotated[PlaySessionService, Depends(get_session_service)],
) -> SessionResponse:
    return await service.update(group_id, session_id, payload, actor)


@router.delete(
    "/groups/{group_id}/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_session(
    group_id: uuid.UUID,
    session_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[PlaySessionService, Depends(get_session_service)],
) -> None:
    await service.delete(group_id, session_id, actor)


@router.put("/groups/{group_id}/sessions/{session_id}/rsvp", response_model=SessionResponse)
async def rsvp_session(
    group_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: RsvpUpdate,
    actor: CurrentUser,
    service: Annotated[PlaySessionService, Depends(get_session_service)],
) -> SessionResponse:
    return await service.rsvp(group_id, session_id, payload.status, actor)

