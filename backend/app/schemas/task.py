from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.task import PriorityEnum

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: PriorityEnum = PriorityEnum.medium
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = []
    parent_id: Optional[int] = None

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

class Task(TaskBase):
    id: int
    completed: bool
    created_at: datetime
    updated_at: datetime
    user_id: int

    class Config:
        from_attributes = True

class TaskWithAIRecommendation(Task):
    ai_confidence: float
