from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from enum import Enum

class ExperienceType(str, Enum):
    positive = "positive"
    negative = "negative"

class ExperienceBase(BaseModel):
    content: str
    type: ExperienceType

class ExperienceCreate(ExperienceBase):
    pass

class Experience(ExperienceBase):
    id: int
    goal_id: int
    created_at: datetime

    class Config:
        from_attributes = True
