"""billing foundation: activated_at em group_memberships, legacy_free em groups

Revision ID: 358242a31020
Revises: d8a4f1c09b27
Create Date: 2026-04-14 18:00:00.000000

Campos pra suportar o modelo seat-based definido em BUSINESS.md:
- group_memberships.activated_at: popula no primeiro login via Discord no grupo.
  convite pendente/admin-add sem login nao conta pro tier (padrao Slack/Linear).
- groups.legacy_free: flag de grandfathering. grupos criados ate o cutoff
  (2026-04-14) ficam imunes a paywall pra sempre.

Backfill: pra toda membership atual, activated_at = joined_at (todos ja logaram,
e como a membership foi criada). Pra todo grupo existente, legacy_free = true.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "358242a31020"
down_revision: str | Sequence[str] | None = "d8a4f1c09b27"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "group_memberships",
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute("UPDATE group_memberships SET activated_at = joined_at")

    op.add_column(
        "groups",
        sa.Column(
            "legacy_free",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    # cutoff: todo grupo que ja existe na hora dessa migration e legacy.
    # novos grupos criados dps do cutoff entram como legacy_free=false por default.
    op.execute("UPDATE groups SET legacy_free = true")


def downgrade() -> None:
    op.drop_column("groups", "legacy_free")
    op.drop_column("group_memberships", "activated_at")
