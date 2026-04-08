"""game steam meta fields

Revision ID: 8d4a1f9c2e10
Revises: 7c2f4e9b1a30
Create Date: 2026-04-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '8d4a1f9c2e10'
down_revision: Union[str, Sequence[str], None] = '7c2f4e9b1a30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('games', sa.Column('developer', sa.String(), nullable=True))
    op.add_column('games', sa.Column('release_date', sa.String(), nullable=True))
    op.add_column('games', sa.Column('metacritic_score', sa.Integer(), nullable=True))
    op.add_column('games', sa.Column('price_original', sa.Float(), nullable=True))
    op.add_column('games', sa.Column('discount_percent', sa.Integer(), nullable=True))
    op.add_column('games', sa.Column('review_score_desc', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('games', 'review_score_desc')
    op.drop_column('games', 'discount_percent')
    op.drop_column('games', 'price_original')
    op.drop_column('games', 'metacritic_score')
    op.drop_column('games', 'release_date')
    op.drop_column('games', 'developer')
