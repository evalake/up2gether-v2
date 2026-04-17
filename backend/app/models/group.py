from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, utcnow


class Group(Base, TimestampMixin):
    __tablename__ = "groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    discord_guild_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String, nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String, nullable=True)
    splash_url: Mapped[str | None] = mapped_column(String, nullable=True)
    accent_color: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    current_game_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "games.id", ondelete="SET NULL", use_alter=True, name="fk_groups_current_game_id"
        ),
        nullable=True,
    )
    current_game_source: Mapped[str | None] = mapped_column(
        String, nullable=True
    )  # 'vote' | 'manual'
    current_game_set_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_game_set_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    current_game_vote_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey(
            "vote_sessions.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_groups_current_game_vote_id",
        ),
        nullable=True,
    )
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    webhook_url: Mapped[str | None] = mapped_column(String, nullable=True)
    budget_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    typical_party_size: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    # grandfathering: grupos criados ate o cutoff do paid launch ficam free pra sempre.
    # checar isso em qualquer gate de entitlement antes de aplicar limite de tier.
    legacy_free: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )

    memberships: Mapped[list[GroupMembership]] = relationship(
        back_populates="group", cascade="all, delete-orphan", lazy="selectin"
    )


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_membership_group_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String, nullable=False, default="member")
    is_eligible_for_votes: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    # seat counter: populado no primeiro login via Discord no grupo.
    # convite pendente ou admin-add sem login nao conta ate user logar.
    # default None porque a regra de negocio diz "so conta seat quem logou".
    # callers (add_member) setam explicito quando e auto-join via OAuth Discord.
    activated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, nullable=True
    )

    group: Mapped[Group] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(lazy="selectin")  # noqa: F821
