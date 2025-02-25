"""Add metric fields to tasks

Revision ID: 4ed615712cb1
Revises: 0155b0225cad
Create Date: 2025-02-25 18:14:35.215751

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite


# revision identifiers, used by Alembic.
revision: str = '4ed615712cb1'
down_revision: Union[str, None] = '0155b0225cad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create new tasks table
    op.create_table(
        'tasks_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('priority', sa.String(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), server_default='1', nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('estimated_minutes', sa.Integer(), nullable=True),
        sa.Column('goal_id', sa.Integer(), nullable=True),
        sa.Column('metric_id', sa.Integer(), nullable=True),
        sa.Column('contribution_value', sa.Float(), nullable=True),
        sa.Column('completion_time', sa.DateTime(), nullable=True),
        sa.Column('completion_order', sa.Integer(), nullable=True),
        sa.Column('tags', sqlite.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['metric_id'], ['metrics.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tasks_id'), 'tasks_new', ['id'], unique=False)
    op.create_index(op.f('ix_tasks_title'), 'tasks_new', ['title'], unique=False)

    # Copy data
    op.execute('''
        INSERT INTO tasks_new 
        SELECT id, title, description, completed, priority, due_date, created_at, updated_at,
               user_id, parent_id, estimated_minutes, goal_id, metric_id, contribution_value,
               completion_time, completion_order, tags
        FROM tasks
    ''')
    
    # Drop old table and rename new
    op.drop_table('tasks')
    op.rename_table('tasks_new', 'tasks')


def downgrade() -> None:
    # Create old tasks table
    op.create_table(
        'tasks_old',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('completed', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('priority', sa.String(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), server_default='1', nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('estimated_minutes', sa.Integer(), nullable=True),
        sa.Column('goal_id', sa.Integer(), nullable=True),
        sa.Column('metric_id', sa.Integer(), nullable=True),
        sa.Column('contribution_value', sa.Float(), nullable=True),
        sa.Column('completion_time', sa.DateTime(), nullable=True),
        sa.Column('completion_order', sa.Integer(), nullable=True),
        sa.Column('tags', sqlite.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['metric_id'], ['metrics.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tasks_new_id', 'tasks_old', ['id'], unique=False)
    op.create_index('ix_tasks_new_title', 'tasks_old', ['title'], unique=False)

    # Copy data
    op.execute('''
        INSERT INTO tasks_old 
        SELECT id, title, description, completed, priority, due_date, created_at, updated_at,
               user_id, parent_id, estimated_minutes, goal_id, metric_id, contribution_value,
               completion_time, completion_order, tags
        FROM tasks
    ''')
    
    # Drop new table and rename old
    op.drop_table('tasks')
    op.rename_table('tasks_old', 'tasks')
