"""add has_reminders to tasks

Revision ID: add_has_reminders_to_tasks
Revises: add_reminders_table
Create Date: 2025-03-08 10:35:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_has_reminders_to_tasks'
down_revision = 'add_reminders_table'
branch_labels = None
depends_on = None


def upgrade():
    # Check if column already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('tasks')]
    
    if 'has_reminders' not in columns:
        op.add_column('tasks', sa.Column('has_reminders', sa.Boolean(), nullable=True, server_default='0'))
        
        # Update existing tasks that have reminders
        op.execute("""
        UPDATE tasks
        SET has_reminders = 1
        WHERE id IN (SELECT DISTINCT task_id FROM reminders WHERE task_id IS NOT NULL)
        """)
    else:
        print("Column 'has_reminders' already exists in 'tasks' table - skipping")


def downgrade():
    op.drop_column('tasks', 'has_reminders')
