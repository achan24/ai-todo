from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import json
from .task import Task
from .experience import Experience
from .strategy import Strategy
from .conversation import Conversation

class MetricType(str, Enum):
    target = "target"
    process = "process"

def encode_json_field(v):
    """Convert list to JSON string if needed"""
    if isinstance(v, list):
        return json.dumps(v)
    return v

class MetricBase(BaseModel):
    name: str
    description: str = ""
    type: str  # Changed from MetricType to str to match frontend
    unit: str
    target_value: Optional[float] = None
    current_value: float = 0
    contributions_list: str = '[]'  # SQLite JSON field comes as string

    class Config:
        json_encoders = {
            list: encode_json_field
        }

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
    contributions_list: str = '[]'  # SQLite JSON field comes as string

    @property
    def total_contributions(self) -> float:
        try:
            contributions = json.loads(self.contributions_list)
            return sum(c['value'] for c in contributions)
        except:
            return 0.0

    class Config:
        from_attributes = True
        json_encoders = {
            list: encode_json_field
        }

class GoalTargetStatus(str, Enum):
    concept = "concept"
    active = "active"
    paused = "paused"
    achieved = "achieved"

class GoalTargetBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    status: GoalTargetStatus = GoalTargetStatus.concept
    notes: str = '[]'  # SQLite JSON field comes as string
    goaltarget_parent_id: Optional[str] = None
    position: int = 0  # For ordering siblings

    class Config:
        json_encoders = {
            list: encode_json_field
        }

class GoalTargetCreate(GoalTargetBase):
    goal_id: int

class GoalTargetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[GoalTargetStatus] = None
    notes: Optional[str] = None
    goaltarget_parent_id: Optional[str] = None
    position: Optional[int] = None

class GoalTarget(GoalTargetBase):
    id: str
    goal_id: int
    created_at: datetime
    updated_at: datetime
    children: List['GoalTarget'] = []

    class Config:
        from_attributes = True
        json_encoders = {
            list: encode_json_field
        }

class GoalBase(BaseModel):
    title: str
    description: str | None = None
    priority: str | None = None  # high, medium, low
    parent_id: int | None = None
    current_strategy_id: int | None = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    parent_id: Optional[int] = None
    current_strategy_id: Optional[int] = None

class Goal(GoalBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    tasks: List[Task] = []
    metrics: List[Metric] = []
    targets: List[GoalTarget] = []
    experiences: List[Experience] = []
    strategies: List[Strategy] = []
    conversations: List[Conversation] = []
    subgoals: List['Goal'] = []
    current_strategy_id: int | None = None

    class Config:
        from_attributes = True

class GoalWithAIRecommendation(Goal):
    """
    Goal model with additional AI recommendation fields.
    Used for returning AI-recommended goals to the client.
    """
    ai_confidence: float
    reasoning: str = "Based on priority, targets, and deadlines"
    next_steps: Optional[List[Dict[str, Any]]] = None
    importance_score: Optional[float] = None
    urgency_score: Optional[float] = None
    
    class Config:
        from_attributes = True
