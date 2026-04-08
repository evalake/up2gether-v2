from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, utcnow


class VoteSession(Base, TimestampMixin):
    __tablename__ = "vote_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="open")
    candidate_game_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    eligible_voter_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    quorum_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    max_selections: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    opens_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    winner_game_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("games.id", ondelete="SET NULL"), nullable=True
    )
    # ---- multi-stage ----
    # seed persistido pra desempate intermediario deterministico
    tiebreak_seed: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    # numero do stage atualmente ativo (1-indexed). None = legacy single-stage
    current_stage_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # total de stages previsto na criacao (pode encerrar antes por consensus)
    total_stages: Mapped[int | None] = mapped_column(Integer, nullable=True)


class VoteStage(Base):
    """Uma etapa dentro de uma VoteSession.

    Stage 1 sempre comeca com todos os candidatos iniciais. Stages seguintes
    herdam os top-M do stage anterior.
    """

    __tablename__ = "vote_stages"
    __table_args__ = (
        UniqueConstraint("vote_session_id", "stage_number", name="uq_stage_session_number"),
        Index("ix_stage_session_status", "vote_session_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vote_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vote_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stage_number: Mapped[int] = mapped_column(Integer, nullable=False)
    candidate_game_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    max_selections: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String, nullable=False, default="open")
    opens_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class VoteBallot(Base):
    __tablename__ = "vote_ballots"
    __table_args__ = (
        # unique permite um ballot por (session, user, stage). stage_id
        # e nullable pra ballots legacy (single stage).
        UniqueConstraint(
            "vote_session_id", "user_id", "stage_id", name="uq_ballot_session_user_stage"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vote_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vote_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stage_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("vote_stages.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    approvals: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
