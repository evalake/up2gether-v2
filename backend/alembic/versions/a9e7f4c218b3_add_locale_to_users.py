"""add locale column to users

Revision ID: a9e7f4c218b3
Revises: f3b8c1d4a712
Create Date: 2026-04-18 14:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a9e7f4c218b3"
down_revision: Union[str, Sequence[str], None] = "f3b8c1d4a712"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("locale", sa.String(length=8), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "locale")
