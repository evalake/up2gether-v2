from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import PlaySession, SessionRsvpRow


class SessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, session_id: uuid.UUID) -> PlaySession | None:
        return await self.db.get(PlaySession, session_id)

    async def list_for_group(
        self, group_id: uuid.UUID, limit: int = 50, offset: int = 0
    ) -> list[PlaySession]:
        result = await self.db.execute(
            select(PlaySession)
            .where(PlaySession.group_id == group_id)
            .order_by(PlaySession.start_at.asc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def add(self, session: PlaySession) -> PlaySession:
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def save(self) -> None:
        await self.db.commit()

    async def delete(self, session: PlaySession) -> None:
        await self.db.delete(session)
        await self.db.commit()

    # ---- rsvp ----

    async def upsert_rsvp(
        self, session_id: uuid.UUID, user_id: uuid.UUID, rsvp_status: str
    ) -> None:
        existing = await self.db.execute(
            select(SessionRsvpRow).where(
                SessionRsvpRow.session_id == session_id,
                SessionRsvpRow.user_id == user_id,
            )
        )
        row = existing.scalar_one_or_none()
        if row is None:
            self.db.add(SessionRsvpRow(session_id=session_id, user_id=user_id, status=rsvp_status))
        else:
            row.status = rsvp_status
        await self.db.commit()

    async def list_rsvps(self, session_id: uuid.UUID) -> list[SessionRsvpRow]:
        result = await self.db.execute(
            select(SessionRsvpRow).where(SessionRsvpRow.session_id == session_id)
        )
        return list(result.scalars().all())

    async def remove_rsvp(self, session_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self.db.execute(
            delete(SessionRsvpRow).where(
                SessionRsvpRow.session_id == session_id,
                SessionRsvpRow.user_id == user_id,
            )
        )
        await self.db.commit()
