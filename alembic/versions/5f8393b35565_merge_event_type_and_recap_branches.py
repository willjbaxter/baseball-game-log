"""merge event_type and recap branches

Revision ID: 5f8393b35565
Revises: 19e423d8523b, 1b749299ead3
Create Date: 2025-07-31 12:11:32.040312

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f8393b35565'
down_revision: Union[str, Sequence[str], None] = ('19e423d8523b', '1b749299ead3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
