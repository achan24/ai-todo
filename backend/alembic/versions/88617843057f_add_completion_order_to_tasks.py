"""add_completion_order_to_tasks

Revision ID: 88617843057f
Revises: f59d9eb4321c
Create Date: 2025-02-25 17:44:04.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '88617843057f'
down_revision = 'f59d9eb4321c'
branch_labels = None
depends_on = None

def upgrade():
    # Drop existing tasks table and recreate with new schema
    op.execute('DROP TABLE IF EXISTS tasks_new')
    
    op.create_table(
        'tasks_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('completed', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('priority', sa.String(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('estimated_minutes', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('goal_id', sa.Integer(), nullable=True),
        sa.Column('metric_id', sa.Integer(), nullable=True),
        sa.Column('contribution_value', sa.Float(), nullable=True),
        sa.Column('completion_time', sa.DateTime(), nullable=True),
        sa.Column('completion_order', sa.Integer(), nullable=True),  # Added completion_order
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['metric_id'], ['metrics.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Copy data from old table to new table
    op.execute('''
        INSERT INTO tasks_new (
            id, title, description, completed, priority, due_date, 
            created_at, updated_at, tags, estimated_minutes, user_id, 
            parent_id, goal_id, metric_id, contribution_value, completion_time
        )
        SELECT 
            id, title, description, completed, priority, due_date, 
            created_at, updated_at, tags, estimated_minutes, user_id, 
            parent_id, goal_id, metric_id, contribution_value, completion_time
        FROM tasks
    ''')

    # Drop old table and rename new one
    op.drop_table('tasks')
    op.rename_table('tasks_new', 'tasks')

    # Create indexes
    op.create_index('ix_tasks_id', 'tasks', ['id'], unique=False)
    op.create_index('ix_tasks_title', 'tasks', ['title'], unique=False)

def downgrade():
    # Drop existing tasks table and recreate without completion_order
    op.execute('DROP TABLE IF EXISTS tasks_new')
    
    op.create_table(
        'tasks_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('completed', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('priority', sa.String(), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('estimated_minutes', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('goal_id', sa.Integer(), nullable=True),
        sa.Column('metric_id', sa.Integer(), nullable=True),
        sa.Column('contribution_value', sa.Float(), nullable=True),
        sa.Column('completion_time', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['metric_id'], ['metrics.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['parent_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Copy data back, excluding completion_order
    op.execute('''
        INSERT INTO tasks_new (
            id, title, description, completed, priority, due_date, 
            created_at, updated_at, tags, estimated_minutes, user_id, 
            parent_id, goal_id, metric_id, contribution_value, completion_time
        )
        SELECT 
            id, title, description, completed, priority, due_date, 
            created_at, updated_at, tags, estimated_minutes, user_id, 
            parent_id, goal_id, metric_id, contribution_value, completion_time
        FROM tasks
    ''')

    # Drop old table and rename new one
    op.drop_table('tasks')
    op.rename_table('tasks_new', 'tasks')

    # Recreate indexes
    op.create_index('ix_tasks_id', 'tasks', ['id'], unique=False)
    op.create_index('ix_tasks_title', 'tasks', ['title'], unique=False)
