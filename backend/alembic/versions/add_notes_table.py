"""add notes table

Revision ID: add_notes_table
Revises: f59d9eb4321c
Create Date: 2025-03-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_notes_table'
down_revision = 'cc50b7c5a3ee'
branch_labels = None
depends_on = None


def upgrade():
    # Create notes table
    op.create_table(
        'notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('pinned', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('goal_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index for goal_id
    op.create_index(op.f('ix_notes_goal_id'), 'notes', ['goal_id'], unique=False)


def downgrade():
    # Drop notes table
    op.drop_index(op.f('ix_notes_goal_id'), table_name='notes')
    op.drop_table('notes')
