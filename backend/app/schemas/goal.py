from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class Goal(GoalBase):
    id: int
    created_at: datetime
    updated_at: datetime
    user_id: int = 1

    class Config:
        from_attributes = True
