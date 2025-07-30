"""add hit_distance_sc to statcast_events

Revision ID: 20250729_add_hit_distance_sc
Revises: 20250728b_add_clip_uuid_to_statcast
Create Date: 2025-07-29 18:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_hit_distance_sc'
down_revision = 'add_clip_uuid'
branch_labels = None
depends_on = None


def upgrade():
    # Add hit_distance_sc column
    op.add_column('statcast_events', sa.Column('hit_distance_sc', sa.Integer(), nullable=True))


def downgrade():
    # Remove hit_distance_sc column
    op.drop_column('statcast_events', 'hit_distance_sc')