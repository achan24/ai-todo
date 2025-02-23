"""add estimated_minutes and completion tracking

Revision ID: 33bf420ef2d1
Revises: ad7201f3696e
Create Date: 2025-02-23 21:09:38.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '33bf420ef2d1'
down_revision: Union[str, None] = 'ad7201f3696e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to tasks table
    op.add_column('tasks', sa.Column('estimated_minutes', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('completion_time', sa.DateTime(), nullable=True))
    op.add_column('tasks', sa.Column('completion_order', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('goal_id', sa.Integer(), nullable=True))
    
    # Add foreign key for goal_id
    op.create_foreign_key(
        'fk_tasks_goals',
        'tasks', 'goals',
        ['goal_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Remove foreign key first
    op.drop_constraint('fk_tasks_goals', 'tasks', type_='foreignkey')
    
    # Remove columns
    op.drop_column('tasks', 'goal_id')
    op.drop_column('tasks', 'completion_order')
    op.drop_column('tasks', 'completion_time')
    op.drop_column('tasks', 'estimated_minutes')
