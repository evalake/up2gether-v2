"""add events table

Revision ID: d8a4f1c09b27
Revises: c7d3e9f45b12
Create Date: 2026-04-14 15:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "d8a4f1c09b27"
down_revision: str | Sequence[str] | None = "c7d3e9f45b12"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "group_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("groups.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.create_index("ix_events_type_time", "events", ["event_type", "occurred_at"])
    op.create_index("ix_events_group_time", "events", ["group_id", "occurred_at"])
    op.create_index("ix_events_user_time", "events", ["user_id", "occurred_at"])


def downgrade() -> None:
    op.drop_index("ix_events_user_time", table_name="events")
    op.drop_index("ix_events_group_time", table_name="events")
    op.drop_index("ix_events_type_time", table_name="events")
    op.drop_table("events")
