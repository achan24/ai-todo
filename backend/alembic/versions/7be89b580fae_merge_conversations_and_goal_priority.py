"""merge conversations and goal priority

Revision ID: 7be89b580fae
Revises: add_conversations_tables, add_goal_priority
Create Date: 2025-03-01 15:45:26.738034

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7be89b580fae'
down_revision: Union[str, None] = ('add_conversations_tables', 'add_goal_priority')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
