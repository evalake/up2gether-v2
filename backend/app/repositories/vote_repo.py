from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vote import VoteBallot, VoteSession, VoteStage


class VoteRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, vote_id: uuid.UUID) -> VoteSession | None:
        return await self.db.get(VoteSession, vote_id)

    async def list_for_group(self, group_id: uuid.UUID) -> list[VoteSession]:
        result = await self.db.execute(
            select(VoteSession)
            .where(VoteSession.group_id == group_id)
            .order_by(VoteSession.created_at.desc())
        )
        return list(result.scalars().all())

    async def add(self, session: VoteSession) -> VoteSession:
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def save(self) -> None:
        await self.db.commit()

    # ---- ballots ----

    async def upsert_ballot(
        self,
        vote_id: uuid.UUID,
        user_id: uuid.UUID,
        approvals: list[uuid.UUID],
        stage_id: uuid.UUID | None = None,
    ) -> None:
        q = select(VoteBallot).where(
            VoteBallot.vote_session_id == vote_id,
            VoteBallot.user_id == user_id,
        )
        if stage_id is None:
            q = q.where(VoteBallot.stage_id.is_(None))
        else:
            q = q.where(VoteBallot.stage_id == stage_id)
        existing = await self.db.execute(q)
        row = existing.scalar_one_or_none()
        if row is None:
            self.db.add(
                VoteBallot(
                    vote_session_id=vote_id,
                    user_id=user_id,
                    approvals=approvals,
                    stage_id=stage_id,
                )
            )
        else:
            row.approvals = approvals
        await self.db.commit()

    async def list_ballots(
        self, vote_id: uuid.UUID, stage_id: uuid.UUID | None = None
    ) -> list[VoteBallot]:
        q = select(VoteBallot).where(VoteBallot.vote_session_id == vote_id)
        if stage_id is not None:
            q = q.where(VoteBallot.stage_id == stage_id)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def count_ballots(self, vote_id: uuid.UUID, stage_id: uuid.UUID | None = None) -> int:
        q = (
            select(func.count())
            .select_from(VoteBallot)
            .where(VoteBallot.vote_session_id == vote_id)
        )
        if stage_id is not None:
            q = q.where(VoteBallot.stage_id == stage_id)
        result = await self.db.execute(q)
        return int(result.scalar_one())

    # ---- stages ----

    async def add_stage(self, stage: VoteStage) -> VoteStage:
        self.db.add(stage)
        await self.db.commit()
        await self.db.refresh(stage)
        return stage

    async def list_stages(self, vote_id: uuid.UUID) -> list[VoteStage]:
        result = await self.db.execute(
            select(VoteStage)
            .where(VoteStage.vote_session_id == vote_id)
            .order_by(VoteStage.stage_number.asc())
        )
        return list(result.scalars().all())

    async def get_stage(self, vote_id: uuid.UUID, stage_number: int) -> VoteStage | None:
        result = await self.db.execute(
            select(VoteStage).where(
                VoteStage.vote_session_id == vote_id,
                VoteStage.stage_number == stage_number,
            )
        )
        return result.scalar_one_or_none()
