"""steam deep integration: playtime em ownership + tabela steam_profiles

Revision ID: a3c5f1e90211
Revises: 4b1f2808576b
Create Date: 2026-04-10 02:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "a3c5f1e90211"
down_revision: str | Sequence[str] | None = "4b1f2808576b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "steam_game_ownerships",
        sa.Column("playtime_forever_minutes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "steam_game_ownerships",
        sa.Column("playtime_2weeks_minutes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "steam_game_ownerships",
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "steam_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("steam_id", sa.String(), nullable=False),
        sa.Column("persona_name", sa.String(), nullable=True),
        sa.Column("real_name", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("profile_url", sa.String(), nullable=True),
        sa.Column("country_code", sa.String(), nullable=True),
        sa.Column("steam_level", sa.Integer(), nullable=True),
        sa.Column("account_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recent_games", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_steam_profiles_user_id", "steam_profiles", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_steam_profiles_user_id", table_name="steam_profiles")
    op.drop_table("steam_profiles")
    op.drop_column("steam_game_ownerships", "last_synced_at")
    op.drop_column("steam_game_ownerships", "playtime_2weeks_minutes")
    op.drop_column("steam_game_ownerships", "playtime_forever_minutes")
