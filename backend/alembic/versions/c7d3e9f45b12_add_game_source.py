"""add source column to games

Revision ID: c7d3e9f45b12
Revises: b1c4e8f23a56
Create Date: 2026-04-13 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c7d3e9f45b12"
down_revision: str | Sequence[str] | None = "b1c4e8f23a56"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "games",
        sa.Column("source", sa.String(), nullable=False, server_default="steam"),
    )


def downgrade() -> None:
    op.drop_column("games", "source")
