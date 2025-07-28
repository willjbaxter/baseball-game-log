"""add wpa column to statcast_events

Revision ID: add_wpa_column
Revises: f09e3c727d0c
Create Date: 2025-07-28
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_wpa_column'
down_revision = '89a0b83cb597'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('statcast_events', sa.Column('wpa', sa.Float(), nullable=True))

def downgrade():
    op.drop_column('statcast_events', 'wpa') 