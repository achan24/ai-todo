"""update_datetime_fields

Revision ID: 640f4b99245d
Revises: b5027ecc3b9c
Create Date: 2025-02-25 17:08:53.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '640f4b99245d'
down_revision = 'b5027ecc3b9c'
branch_labels = None
depends_on = None

def upgrade():
    # Drop temporary tables if they exist from a previous failed migration
    op.execute('DROP TABLE IF EXISTS goals_new')
    op.execute('DROP TABLE IF EXISTS metrics_new')

    # Create new tables with updated schema
    op.create_table(
        'goals_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['parent_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'metrics_new',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('target_value', sa.Float(), nullable=True),
        sa.Column('current_value', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('goal_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_metrics_new_id', 'metrics_new', ['id'], unique=False)

    # Copy data from old tables to new tables, handling NULL values
    op.execute('''
        INSERT INTO goals_new (id, title, description, created_at, updated_at, user_id, parent_id)
        SELECT 
            id,
            title,
            description,
            COALESCE(created_at, CURRENT_TIMESTAMP),
            COALESCE(updated_at, CURRENT_TIMESTAMP),
            user_id,
            parent_id
        FROM goals
    ''')

    op.execute('''
        INSERT INTO metrics_new (id, name, description, type, unit, target_value, current_value, created_at, updated_at, goal_id)
        SELECT 
            id,
            name,
            description,
            type,
            unit,
            target_value,
            COALESCE(current_value, 0),
            COALESCE(created_at, CURRENT_TIMESTAMP),
            COALESCE(updated_at, CURRENT_TIMESTAMP),
            goal_id
        FROM metrics
    ''')

    # Drop old tables
    op.drop_table('metrics')
    op.drop_table('goals')

    # Rename new tables to original names
    op.rename_table('goals_new', 'goals')
    op.rename_table('metrics_new', 'metrics')

def downgrade():
    # We can't really downgrade this change since we're adding NOT NULL constraints
    pass
