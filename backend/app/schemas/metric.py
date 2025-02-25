from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class MetricBase(BaseModel):
    title: str
    description: Optional[str] = None
    unit: str
    target_value: Optional[float] = None

class MetricCreate(MetricBase):
    pass

class MetricUpdate(BaseModel):
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
    user_id: int = 1

    class Config:
        from_attributes = True
