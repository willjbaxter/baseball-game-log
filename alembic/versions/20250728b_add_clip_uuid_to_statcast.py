"""add clip_uuid column to statcast_events

Revision ID: add_clip_uuid
Revises: add_wpa_column
Create Date: 2025-07-28
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_clip_uuid'
down_revision = 'add_wpa_column'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('statcast_events', sa.Column('clip_uuid', sa.String(length=40), nullable=True))

def downgrade():
    op.drop_column('statcast_events', 'clip_uuid') 