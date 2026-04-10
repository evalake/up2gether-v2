"""add index on theme_votes.user_id

Revision ID: b1c4e8f23a56
Revises: a3c5f1e90211
Create Date: 2026-04-09
"""

from collections.abc import Sequence
from typing import Union

from alembic import op

revision: str = 'b1c4e8f23a56'
down_revision: Union[str, Sequence[str], None] = 'a3c5f1e90211'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_theme_votes_user_id', 'theme_votes', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_theme_votes_user_id', table_name='theme_votes')
