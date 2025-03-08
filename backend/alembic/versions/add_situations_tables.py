"""add situations tables

Revision ID: add_situations_tables
Revises: add_notes_table
Create Date: 2025-03-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'add_situations_tables'
down_revision = 'add_notes_table'
branch_labels = None
depends_on = None


def upgrade():
    # Create situations table
    op.create_table(
        'situations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('situation_type', sa.String(), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('outcome', sa.String(), nullable=True),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('lessons_learned', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('goal_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create phases table
    op.create_table(
        'phases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('phase_name', sa.String(), nullable=False),
        sa.Column('approach_used', sa.Text(), nullable=True),
        sa.Column('effectiveness_score', sa.Integer(), nullable=True),
        sa.Column('response_outcome', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('situation_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['situation_id'], ['situations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('phases')
    op.drop_table('situations')
