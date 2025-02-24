from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from .task import Task

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    parent_id: Optional[int] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[int] = None

class Goal(GoalBase):
    id: int
    created_at: datetime
    updated_at: datetime
    user_id: int = 1
    tasks: List[Task] = []
    subgoals: List['Goal'] = []

    class Config:
        from_attributes = True

Goal.model_rebuild()  # This is needed for the self-referential type hint to work
