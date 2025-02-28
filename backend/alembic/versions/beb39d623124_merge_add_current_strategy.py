"""merge add_current_strategy

Revision ID: beb39d623124
Revises: add_current_strategy_to_goal, c84049c23c5b
Create Date: 2025-02-28 11:24:54.100168

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'beb39d623124'
down_revision: Union[str, None] = ('add_current_strategy_to_goal', 'c84049c23c5b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
