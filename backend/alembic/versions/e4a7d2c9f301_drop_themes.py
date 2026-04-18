"""drop themes feature tables

Revision ID: e4a7d2c9f301
Revises: 2db0062df1b3
Create Date: 2026-04-17 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'e4a7d2c9f301'
down_revision: Union[str, Sequence[str], None] = '2db0062df1b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('theme_votes')
    op.drop_table('theme_suggestions')
    op.drop_table('theme_cycles')
    op.drop_index('ix_monthly_themes_group_id', table_name='monthly_themes')
    op.drop_table('monthly_themes')


def downgrade() -> None:
    # feature removida definitivamente. downgrade nao recria.
    raise NotImplementedError("themes removidos definitivamente")
