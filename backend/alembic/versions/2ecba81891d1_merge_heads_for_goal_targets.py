"""merge heads for goal targets

Revision ID: 2ecba81891d1
Revises: 012685672e90, add_has_reminders_to_tasks
Create Date: 2025-03-13 10:36:54.501868

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2ecba81891d1'
down_revision: Union[str, None] = ('012685672e90', 'add_has_reminders_to_tasks')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
