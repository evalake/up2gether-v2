"""add token_generation to users

Revision ID: de5c8c1b781c
Revises: a9e7f4c218b3
Create Date: 2026-04-18 15:31:01.381810

contador incrementa em logout / revoke / delete account. JWT carrega o gen
no payload, get_current_user rejeita se nao bater. todos os tokens ativos
do user viram invalidos numa unica escrita.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "de5c8c1b781c"
down_revision: str | Sequence[str] | None = "a9e7f4c218b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_generation", sa.Integer(), nullable=False, server_default="0"),
    )
    # remove o default depois do backfill, app sempre escreve explicito
    op.alter_column("users", "token_generation", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "token_generation")
