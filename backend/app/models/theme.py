from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.domain.enums import ThemeCyclePhase
from app.models.base import TimestampMixin, utcnow


class MonthlyTheme(Base, TimestampMixin):
    __tablename__ = "monthly_themes"
    __table_args__ = (UniqueConstraint("group_id", "month_year", name="uq_theme_group_month"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month_year: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    theme_name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    decided_by: Mapped[str] = mapped_column(String, nullable=False, default="manual")
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class ThemeCycle(Base, TimestampMixin):
    __tablename__ = "theme_cycles"
    __table_args__ = (UniqueConstraint("group_id", "month_year", name="uq_cycle_group_month"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    month_year: Mapped[str] = mapped_column(String(7), nullable=False)
    phase: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ThemeCyclePhase.SUGGESTING
    )
    opened_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    winner_suggestion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    tiebreak_kind: Mapped[str | None] = mapped_column(String(20), nullable=True)
    tied_suggestion_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ThemeSuggestion(Base, TimestampMixin):
    __tablename__ = "theme_suggestions"
    __table_args__ = (UniqueConstraint("cycle_id", "user_id", name="uq_suggestion_cycle_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("theme_cycles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)


class ThemeVote(Base, TimestampMixin):
    __tablename__ = "theme_votes"
    __table_args__ = (UniqueConstraint("cycle_id", "user_id", name="uq_vote_cycle_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("theme_cycles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    suggestion_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("theme_suggestions.id", ondelete="CASCADE"), nullable=False
    )
