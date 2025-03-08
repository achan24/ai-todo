"""add reminders table

Revision ID: add_reminders_table
Revises: add_notes_table
Create Date: 2025-03-08 09:30:45.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_reminders_table'
down_revision = 'add_notes_table'
branch_labels = None
depends_on = None


def upgrade():
    # Check if reminders table already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'reminders' not in tables:
        # Create reminders table
        op.create_table(
            'reminders',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('message', sa.Text(), nullable=True),
            sa.Column('reminder_time', sa.DateTime(), nullable=False),
            sa.Column('reminder_type', sa.String(), nullable=False),
            sa.Column('status', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False, default=1),
            sa.Column('task_id', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_reminders_id'), 'reminders', ['id'], unique=False)
        print("Created reminders table")
    else:
        print("Reminders table already exists - skipping creation")


def downgrade():
    # Drop reminders table
    op.drop_index(op.f('ix_reminders_id'), table_name='reminders')
    op.drop_table('reminders')
