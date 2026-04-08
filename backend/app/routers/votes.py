import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.repositories.game_repo import GameRepository
from app.repositories.group_repo import GroupRepository
from app.repositories.vote_repo import VoteRepository
from app.schemas.vote import BallotSubmit, VoteSessionCreate, VoteSessionResponse
from app.services.vote_service import VoteService

router = APIRouter(tags=["votes"])


def get_vote_service(db: Annotated[AsyncSession, Depends(get_db)]) -> VoteService:
    return VoteService(VoteRepository(db), GroupRepository(db), GameRepository(db))


@router.post("/groups/{group_id}/votes", response_model=VoteSessionResponse)
async def create_vote(
    group_id: uuid.UUID,
    payload: VoteSessionCreate,
    actor: CurrentUser,
    service: Annotated[VoteService, Depends(get_vote_service)],
) -> VoteSessionResponse:
    return await service.create(group_id, payload, actor)


@router.get("/groups/{group_id}/votes", response_model=list[VoteSessionResponse])
async def list_votes(
    group_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[VoteService, Depends(get_vote_service)],
) -> list[VoteSessionResponse]:
    return await service.list_for_group(group_id, actor)


@router.get("/groups/{group_id}/votes/{vote_id}", response_model=VoteSessionResponse)
async def get_vote(
    group_id: uuid.UUID,
    vote_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[VoteService, Depends(get_vote_service)],
) -> VoteSessionResponse:
    return await service.get(group_id, vote_id, actor)


@router.put("/votes/{vote_id}/ballot", response_model=VoteSessionResponse)
async def submit_ballot(
    vote_id: uuid.UUID,
    payload: BallotSubmit,
    actor: CurrentUser,
    service: Annotated[VoteService, Depends(get_vote_service)],
) -> VoteSessionResponse:
    return await service.submit_ballot(vote_id, payload.approvals, actor)


@router.post("/groups/{group_id}/votes/{vote_id}/close", response_model=VoteSessionResponse)
async def close_vote(
    group_id: uuid.UUID,
    vote_id: uuid.UUID,
    actor: CurrentUser,
    service: Annotated[VoteService, Depends(get_vote_service)],
) -> VoteSessionResponse:
    return await service.close(group_id, vote_id, actor)
