from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..models.conversation import Conversation, ConversationMessage
from ..schemas.conversation import ConversationCreate, ConversationMessageCreate

def get_conversations(db: Session, goal_id: int) -> List[Conversation]:
    return db.query(Conversation).filter(Conversation.goal_id == goal_id).all()

def get_conversation(db: Session, conversation_id: int) -> Optional[Conversation]:
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()

def create_conversation(db: Session, conversation: ConversationCreate) -> Conversation:
    db_conversation = Conversation(**conversation.model_dump())
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

def add_message(db: Session, conversation_id: int, message: ConversationMessageCreate) -> ConversationMessage:
    db_message = ConversationMessage(**message.model_dump(), conversation_id=conversation_id)
    db.add(db_message)
    
    # Update conversation's updated_at timestamp
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation:
        conversation.updated_at = datetime.utcnow()
        db.add(conversation)
    
    db.commit()
    db.refresh(db_message)
    return db_message

def delete_conversation(db: Session, conversation_id: int) -> bool:
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation:
        db.delete(conversation)
        db.commit()
        return True
    return False
