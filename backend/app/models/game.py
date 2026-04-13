from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, utcnow


class Game(Base, TimestampMixin):
    __tablename__ = "games"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    steam_appid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    price_current: Mapped[float | None] = mapped_column(Float, nullable=True)
    genres: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    player_min: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    player_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_hardware_tier: Mapped[str] = mapped_column(String, default="unknown", nullable=False)
    stage: Mapped[str] = mapped_column(String, default="exploring", nullable=False)
    stage_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    developer: Mapped[str | None] = mapped_column(String, nullable=True)
    release_date: Mapped[str | None] = mapped_column(String, nullable=True)
    metacritic_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_original: Mapped[float | None] = mapped_column(Float, nullable=True)
    discount_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    review_score_desc: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, default="steam", nullable=False)


class InterestSignalRow(Base):
    __tablename__ = "interest_signals"
    __table_args__ = (UniqueConstraint("game_id", "user_id", name="uq_interest_game_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    signal: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )


class GameRosterMembership(Base):
    __tablename__ = "game_roster_memberships"
    __table_args__ = (UniqueConstraint("game_id", "user_id", name="uq_roster_game_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    participation_status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    user: Mapped[User] = relationship(lazy="selectin")  # noqa: F821


class SteamGameOwnership(Base):
    __tablename__ = "steam_game_ownerships"
    __table_args__ = (UniqueConstraint("user_id", "game_id", name="uq_ownership_user_game"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    manual: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    playtime_forever_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    playtime_2weeks_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class SteamProfile(Base):
    """Snapshot do perfil Steam publico de um user. Atualizado via sync."""

    __tablename__ = "steam_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    steam_id: Mapped[str] = mapped_column(String, nullable=False)
    persona_name: Mapped[str | None] = mapped_column(String, nullable=True)
    real_name: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    profile_url: Mapped[str | None] = mapped_column(String, nullable=True)
    country_code: Mapped[str | None] = mapped_column(String, nullable=True)
    steam_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    account_created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # snapshot dos recentes (inclui jogos que nao estao na lib do grupo)
    # [{appid, name, playtime_2weeks_minutes, playtime_forever_minutes, img_icon_url}]
    recent_games: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
