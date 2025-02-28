"""add priority to goals

Revision ID: add_goal_priority
Revises: 
Create Date: 2024-02-28 13:56:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_goal_priority'
down_revision: Union[str, None] = 'beb39d623124'  # Point to current head
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Drop any existing temporary tables and indices
    op.execute('DROP TABLE IF EXISTS goals_new')
    op.execute('DROP INDEX IF EXISTS ix_goals_new_title')

    # Create new table with priority column
    op.create_table(
        'goals_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('priority', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('current_strategy_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Copy data from old table
    op.execute('''
        INSERT INTO goals_new (
            id, title, description, created_at, updated_at, 
            user_id, parent_id, current_strategy_id
        )
        SELECT 
            id, title, description, created_at, updated_at,
            user_id, parent_id, current_strategy_id
        FROM goals
    ''')

    # Drop old table and rename new
    op.execute('DROP TABLE goals')
    op.execute('ALTER TABLE goals_new RENAME TO goals')
    
    # Create index after table rename
    op.create_index('ix_goals_title', 'goals', ['title'])

def downgrade() -> None:
    # Remove priority column using same safe SQLite pattern
    op.execute('DROP TABLE IF EXISTS goals_new')
    op.execute('DROP INDEX IF EXISTS ix_goals_title')
    op.create_table(
        'goals_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('current_strategy_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Copy data excluding priority
    op.execute('''
        INSERT INTO goals_new (
            id, title, description, created_at, updated_at,
            user_id, parent_id, current_strategy_id
        )
        SELECT 
            id, title, description, created_at, updated_at,
            user_id, parent_id, current_strategy_id
        FROM goals
    ''')

    # Drop old table and rename new
    op.execute('DROP TABLE goals')
    op.execute('ALTER TABLE goals_new RENAME TO goals')
    op.create_index('ix_goals_title', 'goals', ['title'])
