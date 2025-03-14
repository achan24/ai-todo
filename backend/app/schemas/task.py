from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from ..models.task import PriorityEnum

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: PriorityEnum = PriorityEnum.medium
    due_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    parent_id: Optional[int] = None
    estimated_minutes: Optional[int] = Field(None, ge=0)
    goal_id: Optional[int] = None
    metric_id: Optional[int] = None
    contribution_value: Optional[float] = None
    is_starred: bool = False
    scheduled_time: Optional[datetime] = None
    has_reminders: bool = False

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[PriorityEnum] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    parent_id: Optional[int] = None
    estimated_minutes: Optional[int] = Field(None, ge=0)
    goal_id: Optional[int] = None
    metric_id: Optional[int] = None
    contribution_value: Optional[float] = None
    is_starred: Optional[bool] = None
    scheduled_time: Optional[datetime] = None
    has_reminders: Optional[bool] = None

class Task(TaskBase):
    id: int
    completed: bool = False
    created_at: datetime
    updated_at: datetime
    user_id: int = 1
    subtasks: List['Task'] = Field(default_factory=list)
    completion_time: Optional[datetime] = None
    completion_order: Optional[int] = None

    class Config:
        from_attributes = True

# Update forward refs
Task.model_rebuild()

# Import at the end to avoid circular imports
from .reminder import Reminder
Task.model_rebuild()

class TaskWithAIRecommendation(Task):
    ai_confidence: float
    reasoning: str = "Based on priority and due date"
