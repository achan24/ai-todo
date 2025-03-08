from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PhaseBase(BaseModel):
    phase_name: str
    approach_used: Optional[str] = None
    effectiveness_score: Optional[int] = None
    response_outcome: Optional[str] = None
    notes: Optional[str] = None

class PhaseCreate(PhaseBase):
    situation_id: int

class PhaseUpdate(BaseModel):
    phase_name: Optional[str] = None
    approach_used: Optional[str] = None
    effectiveness_score: Optional[int] = None
    response_outcome: Optional[str] = None
    notes: Optional[str] = None

class Phase(PhaseBase):
    id: int
    situation_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class SituationBase(BaseModel):
    title: str
    description: Optional[str] = None
    situation_type: str  # planned or completed
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    outcome: Optional[str] = None  # success, partial_success, or failure
    score: Optional[int] = None
    lessons_learned: Optional[str] = None

class SituationCreate(SituationBase):
    goal_id: int
    phases: Optional[List[PhaseBase]] = []

class SituationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    situation_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    outcome: Optional[str] = None
    score: Optional[int] = None
    lessons_learned: Optional[str] = None

class Situation(SituationBase):
    id: int
    goal_id: int
    created_at: datetime
    updated_at: datetime
    phases: List[Phase] = []

    class Config:
        orm_mode = True
