from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AuthProvider
from app.models.user import IntegrationAccount, User


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    async def get_by_discord_id(self, discord_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.discord_id == discord_id))
        return result.scalar_one_or_none()

    async def upsert_from_discord(
        self,
        *,
        discord_id: str,
        username: str,
        display_name: str | None,
        avatar_url: str | None,
        email: str | None,
        access_token: str,
        refresh_token: str | None,
    ) -> tuple[User, bool]:
        """Cria ou atualiza usuario + sua integration Discord. Retorna (user, is_new)."""
        user = await self.get_by_discord_id(discord_id)
        is_new = user is None

        if user is None:
            user = User(
                discord_id=discord_id,
                discord_username=username,
                discord_display_name=display_name or username,
                discord_avatar=avatar_url,
                discord_email=email,
                settings={},
                onboarding_completed=False,
            )
            # init colecoes explicitamente pra evitar lazy load em instancia fresh
            user.integrations = []
            user.hardware_profile = None
            self.db.add(user)
            await self.db.flush()
        else:
            user.discord_username = username
            user.discord_display_name = display_name or username
            user.discord_avatar = avatar_url
            user.discord_email = email

        existing = next((i for i in user.integrations if i.provider == AuthProvider.DISCORD), None)
        now = datetime.now(UTC)
        if existing is None:
            user.integrations.append(
                IntegrationAccount(
                    provider=AuthProvider.DISCORD,
                    external_id=discord_id,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    linked_at=now,
                )
            )
        else:
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.linked_at = now

        await self.db.commit()
        await self.db.refresh(user)
        return user, is_new
