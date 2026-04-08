from __future__ import annotations

import uuid

from sqlalchemy import delete as sa_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.theme import MonthlyTheme, ThemeCycle, ThemeSuggestion, ThemeVote


class ThemeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_for_month(self, group_id: uuid.UUID, month_year: str) -> MonthlyTheme | None:
        result = await self.db.execute(
            select(MonthlyTheme).where(
                MonthlyTheme.group_id == group_id,
                MonthlyTheme.month_year == month_year,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_group(self, group_id: uuid.UUID) -> list[MonthlyTheme]:
        result = await self.db.execute(
            select(MonthlyTheme)
            .where(MonthlyTheme.group_id == group_id)
            .order_by(MonthlyTheme.month_year.desc())
        )
        return list(result.scalars().all())

    async def add(self, theme: MonthlyTheme) -> MonthlyTheme:
        self.db.add(theme)
        await self.db.commit()
        await self.db.refresh(theme)
        return theme

    async def delete(self, theme: MonthlyTheme) -> None:
        await self.db.delete(theme)
        await self.db.commit()

    # ---- cycles ----

    async def get_cycle(self, cycle_id: uuid.UUID) -> ThemeCycle | None:
        return await self.db.get(ThemeCycle, cycle_id)

    async def get_cycle_for_month(
        self, group_id: uuid.UUID, month_year: str
    ) -> ThemeCycle | None:
        result = await self.db.execute(
            select(ThemeCycle).where(
                ThemeCycle.group_id == group_id,
                ThemeCycle.month_year == month_year,
            )
        )
        return result.scalar_one_or_none()

    async def add_cycle(self, cycle: ThemeCycle) -> ThemeCycle:
        self.db.add(cycle)
        await self.db.commit()
        await self.db.refresh(cycle)
        return cycle

    async def save(self) -> None:
        await self.db.commit()

    async def list_suggestions(self, cycle_id: uuid.UUID) -> list[ThemeSuggestion]:
        result = await self.db.execute(
            select(ThemeSuggestion)
            .where(ThemeSuggestion.cycle_id == cycle_id)
            .order_by(ThemeSuggestion.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_suggestion(self, suggestion_id: uuid.UUID) -> ThemeSuggestion | None:
        return await self.db.get(ThemeSuggestion, suggestion_id)

    async def get_user_suggestion(
        self, cycle_id: uuid.UUID, user_id: uuid.UUID
    ) -> ThemeSuggestion | None:
        result = await self.db.execute(
            select(ThemeSuggestion).where(
                ThemeSuggestion.cycle_id == cycle_id,
                ThemeSuggestion.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def add_suggestion(self, s: ThemeSuggestion) -> ThemeSuggestion:
        self.db.add(s)
        await self.db.commit()
        await self.db.refresh(s)
        return s

    async def delete_suggestion(self, s: ThemeSuggestion) -> None:
        await self.db.delete(s)
        await self.db.commit()

    async def delete_suggestions(self, cycle_id: uuid.UUID) -> None:
        await self.db.execute(sa_delete(ThemeSuggestion).where(ThemeSuggestion.cycle_id == cycle_id))
        await self.db.commit()

    async def delete_votes(self, cycle_id: uuid.UUID) -> None:
        await self.db.execute(sa_delete(ThemeVote).where(ThemeVote.cycle_id == cycle_id))
        await self.db.commit()

    async def list_votes(self, cycle_id: uuid.UUID) -> list[ThemeVote]:
        result = await self.db.execute(
            select(ThemeVote).where(ThemeVote.cycle_id == cycle_id)
        )
        return list(result.scalars().all())

    async def get_user_vote(
        self, cycle_id: uuid.UUID, user_id: uuid.UUID
    ) -> ThemeVote | None:
        result = await self.db.execute(
            select(ThemeVote).where(
                ThemeVote.cycle_id == cycle_id,
                ThemeVote.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def upsert_vote(
        self, cycle_id: uuid.UUID, user_id: uuid.UUID, suggestion_id: uuid.UUID
    ) -> ThemeVote:
        existing = await self.get_user_vote(cycle_id, user_id)
        if existing is None:
            existing = ThemeVote(
                cycle_id=cycle_id, user_id=user_id, suggestion_id=suggestion_id
            )
            self.db.add(existing)
        else:
            existing.suggestion_id = suggestion_id
        await self.db.commit()
        await self.db.refresh(existing)
        return existing
