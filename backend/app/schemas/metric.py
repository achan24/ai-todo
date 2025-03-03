from pydantic import Field, validator
from typing import Optional, List, Any, Union
from datetime import datetime
import json
from uuid import UUID

from .base import BaseModelWithValidators

class MetricBase(BaseModelWithValidators):
    title: str
    description: Optional[str] = None
    unit: str
    target_value: Optional[float] = None

class MetricCreate(MetricBase):
    pass

class MetricUpdate(BaseModelWithValidators):
    title: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    current_value: Optional[float] = None
    target_value: Optional[float] = None

class Metric(MetricBase):
    id: int
    current_value: float = 0
    created_at: datetime
    updated_at: datetime
    user_id: str = "1"
    goal_id: Optional[int] = None
    contributions_list: str = "[]"

    class Config:
        from_attributes = True
