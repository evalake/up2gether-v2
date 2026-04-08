"""theme_image_url

Revision ID: 3a91adb706e0
Revises: 5b0259ca938e
Create Date: 2026-04-08 01:33:46.429893

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a91adb706e0'
down_revision: Union[str, Sequence[str], None] = '5b0259ca938e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('monthly_themes', sa.Column('image_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('monthly_themes', 'image_url')
