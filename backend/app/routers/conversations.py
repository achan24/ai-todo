from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..schemas.conversation import Conversation, ConversationCreate, ConversationMessage, ConversationMessageCreate, ConversationBase
from ..services import conversation_service, ai_service

router = APIRouter()

@router.get("/goals/{goal_id}/conversations", response_model=List[Conversation])
def get_conversations(goal_id: int, db: Session = Depends(get_db)):
    return conversation_service.get_conversations(db, goal_id)

@router.post("/goals/{goal_id}/conversations", response_model=Conversation)
def create_conversation(goal_id: int, conversation: ConversationCreate, db: Session = Depends(get_db)):
    return conversation_service.create_conversation(db, conversation)

@router.get("/conversations/{conversation_id}", response_model=Conversation)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = conversation_service.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

@router.post("/conversations/{conversation_id}/messages", response_model=ConversationMessage)
async def create_message(
    conversation_id: int,
    message: ConversationMessageCreate,
    db: Session = Depends(get_db)
):
    conversation = conversation_service.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user's message
    user_message = conversation_service.add_message(db, conversation_id, message)

    # Generate AI response using the conversation context
    try:
        ai_response = await ai_service.breakdown_task(
            task_title=conversation.title,
            task_description=message.content,
            messages=[{"role": msg.role, "content": msg.content} for msg in conversation.messages]
        )
        
        # Check if we got a successful response
        if not ai_response.get("success", False):
            error_message = ai_response.get("response", "Failed to get AI response")
            # Save the error message as the AI's response
            ai_message = conversation_service.add_message(
                db,
                conversation_id,
                ConversationMessageCreate(content=error_message, role="assistant")
            )
        else:
            # Save AI's response
            ai_message = conversation_service.add_message(
                db,
                conversation_id,
                ConversationMessageCreate(content=ai_response["response"], role="assistant")
            )
    except Exception as e:
        # Save the error message as the AI's response
        error_message = f"Error processing request: {str(e)}"
        ai_message = conversation_service.add_message(
            db,
            conversation_id,
            ConversationMessageCreate(content=error_message, role="assistant")
        )

    return ai_message

@router.put("/conversations/{conversation_id}", response_model=Conversation)
def update_conversation(
    conversation_id: int,
    conversation_update: ConversationBase,
    db: Session = Depends(get_db)
):
    conversation = conversation_service.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    for key, value in conversation_update.model_dump().items():
        setattr(conversation, key, value)
    
    db.commit()
    db.refresh(conversation)
    return conversation

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    if not conversation_service.delete_conversation(db, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success"}
