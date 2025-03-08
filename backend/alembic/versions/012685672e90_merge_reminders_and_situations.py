"""merge reminders and situations

Revision ID: 012685672e90
Revises: add_reminders_table, add_situations_tables
Create Date: 2025-03-08 09:50:56.753762

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '012685672e90'
down_revision: Union[str, None] = ('add_reminders_table', 'add_situations_tables')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
