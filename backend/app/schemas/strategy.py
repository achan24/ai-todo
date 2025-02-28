from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class StrategyBase(BaseModel):
    title: str
    steps: List[str]

class StrategyCreate(StrategyBase):
    pass

class StrategyUpdate(BaseModel):
    title: Optional[str] = None
    steps: Optional[List[str]] = None

class Strategy(StrategyBase):
    id: int
    goal_id: int
    created_at: datetime

    class Config:
        from_attributes = True
