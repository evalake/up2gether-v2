"""add publisher column to games

Revision ID: f3b8c1d4a712
Revises: e4a7d2c9f301
Create Date: 2026-04-18 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'f3b8c1d4a712'
down_revision: Union[str, Sequence[str], None] = 'e4a7d2c9f301'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('games', sa.Column('publisher', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('games', 'publisher')
