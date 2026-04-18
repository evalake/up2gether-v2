from __future__ import annotations

from app.core.security import issue_access_token
from app.integrations.discord import DiscordClient
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import AuthTokenResponse
from app.schemas.user import UserResponse
from app.services.events import EVENT_MEMBER_ACTIVATED, track_event

# nota: discord_avatar guarda apenas o hash retornado pela api do discord.
# o frontend constroi a URL final via cdn.discordapp.com/avatars/{discord_id}/{hash}.png


class AuthService:
    def __init__(self, repo: UserRepository, discord: DiscordClient) -> None:
        self.repo = repo
        self.discord = discord

    async def login_with_discord(self, code: str, ref: str | None = None) -> AuthTokenResponse:
        token_bundle = await self.discord.exchange_code(code)
        access_token = token_bundle.get("access_token")
        refresh_token = token_bundle.get("refresh_token")
        if not access_token:
            raise ValueError("Discord did not return an access_token")

        profile = await self.discord.fetch_user(access_token)
        discord_id = profile["id"]

        user, is_new = await self.repo.upsert_from_discord(
            discord_id=discord_id,
            username=profile.get("username", discord_id),
            display_name=profile.get("global_name"),
            avatar_url=profile.get("avatar"),
            email=profile.get("email"),
            access_token=access_token,
            refresh_token=refresh_token,
        )
        if is_new:
            # seat ativado: primeira vez que o user loga via discord
            payload: dict = {"discord_id": discord_id, "source": "oauth"}
            if ref:
                # trunca pra nao encher o banco com lixo
                payload["ref"] = ref[:64]
            await track_event(
                self.repo.db,
                EVENT_MEMBER_ACTIVATED,
                user_id=user.id,
                payload=payload,
            )

        jwt_token = issue_access_token(user.id, user.discord_id, user.token_generation)
        return AuthTokenResponse(
            access_token=jwt_token,
            user=UserResponse.from_user(user, is_new_user=is_new),
        )

    @staticmethod
    def to_response(user: User) -> UserResponse:
        return UserResponse.from_user(user)
