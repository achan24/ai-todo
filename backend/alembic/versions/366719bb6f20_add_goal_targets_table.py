"""add_goal_targets_table

Revision ID: 366719bb6f20
Revises: 2ecba81891d1
Create Date: 2025-03-13 10:37:20.982555

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite


# revision identifiers, used by Alembic.
revision: str = '366719bb6f20'
down_revision: Union[str, None] = '2ecba81891d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if goal_targets table already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'goal_targets' not in tables:
        # Create goal_targets table
        op.create_table(
            'goal_targets',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),  # Using 'title' for consistency (MEMORY[7d8467ae])
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
            sa.Column('status', sa.String(), nullable=False, server_default='concept'),
            sa.Column('notes', sqlite.JSON, nullable=False, server_default='[]'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('goal_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),  # Specify ondelete behavior (MEMORY[1f8c7cf7])
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_goal_targets_id'), 'goal_targets', ['id'], unique=False)
        print("Created goal_targets table")
    else:
        print("goal_targets table already exists - skipping creation")


def downgrade() -> None:
    # Drop goal_targets table
    op.drop_index(op.f('ix_goal_targets_id'), table_name='goal_targets')
    op.drop_table('goal_targets')
