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
    # Add only the columns that don't exist yet
    op.add_column('tasks', sa.Column('completion_time', sa.DateTime(), nullable=True))
    op.add_column('tasks', sa.Column('completion_order', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('goal_id', sa.Integer(), nullable=True))
    
    # Add foreign key for goal_id
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.create_foreign_key(
            'fk_tasks_goals',
            'goals',
            ['goal_id'], ['id'],
            ondelete='SET NULL'
        )


def downgrade() -> None:
    # Remove foreign key first
    with op.batch_alter_table('tasks') as batch_op:
        batch_op.drop_constraint('fk_tasks_goals', type_='foreignkey')
    
    # Remove columns
    op.drop_column('tasks', 'goal_id')
    op.drop_column('tasks', 'completion_order')
    op.drop_column('tasks', 'completion_time')
