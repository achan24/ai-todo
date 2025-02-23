from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class PriorityEnum(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: PriorityEnum = PriorityEnum.medium
    due_date: Optional[datetime] = None
    parent_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None
    parent_id: Optional[int] = None

class Task(TaskBase):
    id: int
    completed: bool = False
    created_at: datetime
    updated_at: datetime
    user_id: int = 1  # Hardcoded for now
    subtasks: List['Task'] = Field(default_factory=list)

    @field_validator('subtasks', mode='before')
    @classmethod
    def handle_none_subtasks(cls, value):
        if value is None:
            return []
        return value

    model_config = ConfigDict(from_attributes=True)

class TaskWithAIRecommendation(Task):
    ai_confidence: float = Field(..., description="AI confidence score for this recommendation")
    reasoning: str = Field(..., description="AI explanation for why this task should be prioritized")

# This is needed for the forward reference in Task.subtasks
Task.model_rebuild()
