from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NoteBase(BaseModel):
    content: str
    pinned: bool = False

class NoteCreate(NoteBase):
    goal_id: int

class NoteUpdate(BaseModel):
    content: Optional[str] = None
    pinned: Optional[bool] = None

class Note(NoteBase):
    id: int
    goal_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
