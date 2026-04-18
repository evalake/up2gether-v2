from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser
from app.schemas.user import (
    DataExportResponse,
    HardwareResponse,
    HardwareUpdate,
    OnboardingResponse,
    SettingsResponse,
    SettingsUpdate,
)
from app.services.user_service import UserService

router = APIRouter(tags=["users"])


def get_user_service(db: Annotated[AsyncSession, Depends(get_db)]) -> UserService:
    return UserService(db)


@router.put("/users/hardware", response_model=HardwareResponse)
async def update_hardware(
    payload: HardwareUpdate,
    actor: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> HardwareResponse:
    return await service.set_hardware(actor, payload)


@router.get("/users/me/onboarding", response_model=OnboardingResponse)
async def get_onboarding(
    actor: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> OnboardingResponse:
    return await service.onboarding(actor)


@router.get("/users/me/settings", response_model=SettingsResponse)
async def get_my_settings(
    actor: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> SettingsResponse:
    return await service.get_settings(actor)


@router.patch("/users/me/settings", response_model=SettingsResponse)
async def patch_my_settings(
    payload: SettingsUpdate,
    actor: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> SettingsResponse:
    return await service.update_settings(actor, payload)


@router.get("/users/me/export", response_model=DataExportResponse)
async def export_my_data(
    actor: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> DataExportResponse:
    """LGPD: snapshot completo dos dados pessoais do user."""
    return await service.export_data(actor)


@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    actor: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> None:
    await service.delete_account(actor)
