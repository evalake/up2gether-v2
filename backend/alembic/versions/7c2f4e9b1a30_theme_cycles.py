"""theme cycles + suggestions + votes

Revision ID: 7c2f4e9b1a30
Revises: 3a91adb706e0
Create Date: 2026-04-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = '7c2f4e9b1a30'
down_revision: Union[str, Sequence[str], None] = '3a91adb706e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'theme_cycles',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('group_id', UUID(as_uuid=True), sa.ForeignKey('groups.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('month_year', sa.String(length=7), nullable=False),
        sa.Column('phase', sa.String(length=20), nullable=False, server_default='suggesting'),
        sa.Column('opened_by', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('winner_suggestion_id', UUID(as_uuid=True), nullable=True),
        sa.Column('tiebreak_kind', sa.String(length=20), nullable=True),
        sa.Column('tied_suggestion_ids', sa.JSON(), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('group_id', 'month_year', name='uq_cycle_group_month'),
    )
    op.create_table(
        'theme_suggestions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('cycle_id', UUID(as_uuid=True), sa.ForeignKey('theme_cycles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('cycle_id', 'user_id', name='uq_suggestion_cycle_user'),
    )
    op.create_table(
        'theme_votes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('cycle_id', UUID(as_uuid=True), sa.ForeignKey('theme_cycles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('suggestion_id', UUID(as_uuid=True), sa.ForeignKey('theme_suggestions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('cycle_id', 'user_id', name='uq_vote_cycle_user'),
    )


def downgrade() -> None:
    op.drop_table('theme_votes')
    op.drop_table('theme_suggestions')
    op.drop_table('theme_cycles')
