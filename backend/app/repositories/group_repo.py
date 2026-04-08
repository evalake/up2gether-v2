from __future__ import annotations

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import GroupRole
from app.models.game import Game
from app.models.group import Group, GroupMembership
from app.models.session import PlaySession
from app.models.theme import MonthlyTheme, ThemeCycle
from app.models.vote import VoteSession


class GroupRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, group_id: uuid.UUID) -> Group | None:
        return await self.db.get(Group, group_id)

    async def get_by_discord_guild_id(self, discord_guild_id: str) -> Group | None:
        result = await self.db.execute(
            select(Group).where(Group.discord_guild_id == discord_guild_id)
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: uuid.UUID) -> list[tuple[Group, GroupMembership]]:
        result = await self.db.execute(
            select(Group, GroupMembership)
            .join(GroupMembership, GroupMembership.group_id == Group.id)
            .where(GroupMembership.user_id == user_id)
        )
        return list(result.all())

    async def get_membership(
        self, group_id: uuid.UUID, user_id: uuid.UUID
    ) -> GroupMembership | None:
        result = await self.db.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == group_id,
                GroupMembership.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_members(self, group_id: uuid.UUID) -> list[GroupMembership]:
        result = await self.db.execute(
            select(GroupMembership).where(GroupMembership.group_id == group_id)
        )
        return list(result.scalars().all())

    async def count_members(self, group_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(GroupMembership)
            .where(GroupMembership.group_id == group_id)
        )
        return int(result.scalar_one())

    async def count_admins(self, group_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(GroupMembership)
            .where(
                GroupMembership.group_id == group_id,
                GroupMembership.role == GroupRole.ADMIN,
            )
        )
        return int(result.scalar_one())

    async def create_with_owner(
        self,
        *,
        discord_guild_id: str,
        name: str,
        icon_url: str | None,
        webhook_url: str | None,
        owner_user_id: uuid.UUID,
    ) -> Group:
        group = Group(
            discord_guild_id=discord_guild_id,
            name=name,
            icon_url=icon_url,
            webhook_url=webhook_url,
            owner_user_id=owner_user_id,
        )
        group.memberships = [
            GroupMembership(user_id=owner_user_id, role=GroupRole.ADMIN),
        ]
        self.db.add(group)
        await self.db.commit()
        await self.db.refresh(group)
        return group

    async def add_member(
        self, group: Group, user_id: uuid.UUID, role: GroupRole = GroupRole.MEMBER
    ) -> GroupMembership:
        membership = GroupMembership(group_id=group.id, user_id=user_id, role=role)
        self.db.add(membership)
        await self.db.commit()
        await self.db.refresh(membership)
        return membership

    async def remove_member(self, group_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self.db.execute(
            delete(GroupMembership).where(
                GroupMembership.group_id == group_id,
                GroupMembership.user_id == user_id,
            )
        )
        await self.db.commit()

    async def update_role(
        self, group_id: uuid.UUID, user_id: uuid.UUID, new_role: GroupRole
    ) -> None:
        membership = await self.get_membership(group_id, user_id)
        if membership is None:
            return
        membership.role = new_role
        await self.db.commit()

    async def update_webhook(self, group: Group, webhook_url: str | None) -> None:
        group.webhook_url = webhook_url
        await self.db.commit()

    async def delete_group(self, group: Group) -> None:
        await self.db.delete(group)
        await self.db.commit()

    async def purge_content(self, group_id: uuid.UUID) -> None:
        # zera tudo menos o grupo e os membros
        for model in (PlaySession, VoteSession, ThemeCycle, MonthlyTheme, Game):
            await self.db.execute(delete(model).where(model.group_id == group_id))
        await self.db.commit()
