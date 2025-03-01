from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class ConversationMessageBase(BaseModel):
    content: str
    role: str

class ConversationMessageCreate(ConversationMessageBase):
    pass

class ConversationMessage(ConversationMessageBase):
    id: int
    conversation_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    title: str

class ConversationCreate(ConversationBase):
    goal_id: int

class Conversation(ConversationBase):
    id: int
    goal_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: List[ConversationMessage] = []

    class Config:
        from_attributes = True
