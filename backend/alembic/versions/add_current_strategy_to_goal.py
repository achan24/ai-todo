"""add current strategy to goal

Revision ID: add_current_strategy_to_goal
Revises: f59d9eb4321c
Create Date: 2024-02-28 11:23:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_current_strategy_to_goal'
down_revision = 'f59d9eb4321c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Clean up any failed migrations
    op.execute('DROP TABLE IF EXISTS goals_new')

    # Create new table with all columns including the new one
    op.create_table(
        'goals_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('current_strategy_id', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_goals_new_title', 'goals_new', ['title'])

    # Copy data from old table to new table
    op.execute('''
        INSERT INTO goals_new (id, title, description, created_at, updated_at, user_id, parent_id)
        SELECT id, title, description, created_at, updated_at, user_id, parent_id
        FROM goals
    ''')

    # Drop old table
    op.drop_table('goals')

    # Rename new table to original name
    op.rename_table('goals_new', 'goals')


def downgrade() -> None:
    # Clean up any failed migrations
    op.execute('DROP TABLE IF EXISTS goals_new')

    # Create new table without the current_strategy_id
    op.create_table(
        'goals_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_goals_new_title', 'goals_new', ['title'])

    # Copy data from old table to new table
    op.execute('''
        INSERT INTO goals_new (id, title, description, created_at, updated_at, user_id, parent_id)
        SELECT id, title, description, created_at, updated_at, user_id, parent_id
        FROM goals
    ''')

    # Drop old table
    op.drop_table('goals')

    # Rename new table to original name
    op.rename_table('goals_new', 'goals')
