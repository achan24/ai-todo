"""merge heads

Revision ID: f59d9eb4321c
Revises: bdf7b1d728e8, e65a0733c3ab
Create Date: 2025-02-25 17:39:56.103631

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f59d9eb4321c'
down_revision: Union[str, None] = ('bdf7b1d728e8', 'e65a0733c3ab')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
