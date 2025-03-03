from pydantic import Field, validator
from typing import Optional, List, Union, Literal, Any
from datetime import datetime
from uuid import UUID

from .base import BaseModelWithValidators

# Define priority type as a literal union for API validation
PriorityType = Union[int, Literal["high", "medium", "low"]]

# Priority constants
PRIORITY_HIGH = 1
PRIORITY_MEDIUM = 2
PRIORITY_LOW = 3

class TaskBase(BaseModelWithValidators):
    title: str
    description: Optional[str] = None
    priority: PriorityType = "medium"
    due_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    parent_id: Optional[int] = None
    estimated_minutes: Optional[int] = Field(None, ge=0)
    goal_id: Optional[int] = None
    metric_id: Optional[int] = None
    contribution_value: Optional[float] = None
    
    # Add validator to handle priority values
    @validator('priority', pre=True)
    def validate_priority(cls, v):
        if isinstance(v, int):
            # Keep integer values as is (1, 2, 3)
            return v
        elif isinstance(v, str):
            # Convert string values to integers
            priority_map = {
                "high": PRIORITY_HIGH,
                "medium": PRIORITY_MEDIUM,
                "low": PRIORITY_LOW
            }
            return priority_map.get(v.lower(), PRIORITY_MEDIUM)
        return PRIORITY_MEDIUM

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModelWithValidators):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[PriorityType] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    parent_id: Optional[int] = None
    estimated_minutes: Optional[int] = Field(None, ge=0)
    goal_id: Optional[int] = None
    metric_id: Optional[int] = None
    contribution_value: Optional[float] = None
    
    # Add validator to handle priority values
    @validator('priority', pre=True)
    def validate_priority(cls, v):
        if v is None:
            return None
        if isinstance(v, int):
            # Keep integer values as is (1, 2, 3)
            return v
        elif isinstance(v, str):
            # Convert string values to integers
            priority_map = {
                "high": PRIORITY_HIGH,
                "medium": PRIORITY_MEDIUM,
                "low": PRIORITY_LOW
            }
            return priority_map.get(v.lower(), PRIORITY_MEDIUM)
        return PRIORITY_MEDIUM

class Task(TaskBase):
    id: int
    completed: bool = False
    created_at: datetime
    updated_at: datetime
    user_id: str = "1"
    subtasks: List['Task'] = Field(default_factory=list)
    completion_time: Optional[datetime] = None
    completion_order: Optional[int] = None
    
    class Config:
        from_attributes = True

# Update forward refs
Task.model_rebuild()

class TaskWithAIRecommendation(Task):
    ai_confidence: float
