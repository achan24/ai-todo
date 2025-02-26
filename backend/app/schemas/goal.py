from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from .task import Task
from .experience import Experience
from .strategy import Strategy

class MetricType(str, Enum):
    target = "target"
    process = "process"

class MetricBase(BaseModel):
    name: str
    description: str = ""
    type: str  # Changed from MetricType to str to match frontend
    unit: str
    target_value: Optional[float] = None
    current_value: float = 0

class MetricCreate(MetricBase):
    pass

class MetricUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    unit: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None

class Metric(MetricBase):
    id: int
    goal_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

class GoalCreate(GoalBase):
    parent_id: Optional[int] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

class Goal(GoalBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    tasks: List[Task] = []
    metrics: List[Metric] = []
    experiences: List[Experience] = []
    strategies: List[Strategy] = []
    subgoals: List['Goal'] = []

    class Config:
        from_attributes = True
