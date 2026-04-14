from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, issue_access_token
from app.integrations.discord import DiscordClient, get_discord_client
from app.repositories.user_repo import UserRepository
from app.schemas.auth import AuthTokenResponse, DiscordCallbackRequest
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService
from app.services.events import EVENT_MEMBER_ACTIVATED, track_event

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    discord: Annotated[DiscordClient, Depends(get_discord_client)],
) -> AuthService:
    return AuthService(UserRepository(db), discord)


@router.post("/discord/callback", response_model=AuthTokenResponse)
async def discord_callback(
    payload: DiscordCallbackRequest,
    service: Annotated[AuthService, Depends(get_auth_service)],
) -> AuthTokenResponse:
    return await service.login_with_discord(payload.code)


@router.get("/me", response_model=UserResponse)
async def me(
    current: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    discord: Annotated[DiscordClient, Depends(get_discord_client)],
) -> UserResponse:
    # best-effort refresh do perfil do discord se o registro ta velho (>6h).
    # usa o access_token salvo (vale ~7 dias). se falhar, silencia e retorna o cached.
    import logging
    from datetime import UTC, datetime, timedelta

    from app.domain.enums import AuthProvider

    integ = next(
        (i for i in current.integrations if i.provider == AuthProvider.DISCORD),
        None,
    )
    if integ and integ.access_token:
        stale = integ.linked_at is None or integ.linked_at < datetime.now(UTC) - timedelta(hours=6)
        if stale:
            try:
                profile = await discord.fetch_user(integ.access_token)
                current.discord_username = profile.get("username", current.discord_username)
                current.discord_display_name = (
                    profile.get("global_name") or current.discord_username
                )
                current.discord_avatar = profile.get("avatar")
                current.discord_email = profile.get("email") or current.discord_email
                integ.linked_at = datetime.now(UTC)
                await db.commit()
                await db.refresh(current)
            except Exception as e:
                logging.getLogger(__name__).info("discord profile refresh skipped: %s", e)
    return AuthService.to_response(current)


class DiscordGuild(BaseModel):
    id: str
    name: str
    icon: str | None = None
    owner: bool = False
    permissions: str | None = None


@router.get("/discord/guilds", response_model=list[DiscordGuild])
async def my_discord_guilds(
    current: CurrentUser,
    discord: Annotated[DiscordClient, Depends(get_discord_client)],
) -> list[DiscordGuild]:
    from app.domain.enums import AuthProvider

    integ = next(
        (i for i in current.integrations if i.provider == AuthProvider.DISCORD),
        None,
    )
    if integ is None or not integ.access_token:
        raise HTTPException(status_code=400, detail="discord not linked")
    raw = await discord.fetch_guilds(integ.access_token)
    return [
        DiscordGuild(
            id=g["id"],
            name=g["name"],
            icon=g.get("icon"),
            owner=bool(g.get("owner", False)),
            permissions=str(g["permissions"]) if g.get("permissions") is not None else None,
        )
        for g in raw
    ]


class DevLoginRequest(BaseModel):
    discord_id: str = "e2e-user"
    username: str = "e2e"


@router.post("/dev-login", response_model=AuthTokenResponse)
async def dev_login(
    payload: DevLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthTokenResponse:
    if not get_settings().dev_login_enabled:
        raise HTTPException(status_code=404, detail="not found")
    repo = UserRepository(db)
    user, is_new = await repo.upsert_from_discord(
        discord_id=payload.discord_id,
        username=payload.username,
        display_name=payload.username,
        avatar_url=None,
        email=f"{payload.username}@e2e.local",
        access_token="dev",
        refresh_token=None,
    )
    if is_new:
        await track_event(
            db,
            EVENT_MEMBER_ACTIVATED,
            user_id=user.id,
            payload={"discord_id": payload.discord_id, "source": "dev"},
        )
    token = issue_access_token(user.id, user.discord_id)
    return AuthTokenResponse(
        access_token=token,
        user=UserResponse.from_user(user, is_new_user=is_new),
    )
