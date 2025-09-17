"""add win probability columns to statcast events

Revision ID: 450bf0b767e8
Revises: d2089cb95154
Create Date: 2025-09-16 20:05:13.314964

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '450bf0b767e8'
down_revision: Union[str, Sequence[str], None] = 'd2089cb95154'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add win probability columns to statcast_events table
    op.add_column('statcast_events', sa.Column('home_win_exp', sa.Float(), nullable=True))
    op.add_column('statcast_events', sa.Column('away_win_exp', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove win probability columns
    op.drop_column('statcast_events', 'away_win_exp')
    op.drop_column('statcast_events', 'home_win_exp')
