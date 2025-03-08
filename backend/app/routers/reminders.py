from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..schemas.reminder import Reminder, ReminderCreate, ReminderUpdate
from ..services import reminder_service

router = APIRouter(
    prefix="/reminders",
    tags=["reminders"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Reminder])
def get_reminders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all reminders for the current user"""
    # In a real app, you'd get the user_id from the auth token
    user_id = 1
    reminders = reminder_service.get_reminders(db, user_id, skip, limit)
    return [reminder_service.prepare_reminder_for_response(reminder) for reminder in reminders]

@router.get("/pending", response_model=List[Reminder])
def get_pending_reminders(db: Session = Depends(get_db)):
    """Get all pending reminders for the current user"""
    # In a real app, you'd get the user_id from the auth token
    user_id = 1
    reminders = reminder_service.get_pending_reminders(db, user_id)
    return [reminder_service.prepare_reminder_for_response(reminder) for reminder in reminders]

@router.get("/{reminder_id}", response_model=Reminder)
def get_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Get a specific reminder by ID"""
    reminder = reminder_service.get_reminder(db, reminder_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder_service.prepare_reminder_for_response(reminder)

@router.post("/", response_model=Reminder, status_code=status.HTTP_201_CREATED)
def create_reminder(reminder: ReminderCreate, db: Session = Depends(get_db)):
    """Create a new reminder"""
    # In a real app, you'd get the user_id from the auth token
    user_id = 1
    
    try:
        print(f"Received reminder data: {reminder.model_dump()}")
        db_reminder = reminder_service.create_reminder(db, reminder, user_id)
        return reminder_service.prepare_reminder_for_response(db_reminder)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid reminder data: {str(e)}"
        )

@router.put("/{reminder_id}", response_model=Reminder)
def update_reminder(reminder_id: int, reminder: ReminderUpdate, db: Session = Depends(get_db)):
    """Update an existing reminder"""
    db_reminder = reminder_service.update_reminder(db, reminder_id, reminder)
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder_service.prepare_reminder_for_response(db_reminder)

@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Delete a reminder"""
    success = reminder_service.delete_reminder(db, reminder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return None

@router.post("/{reminder_id}/dismiss", response_model=Reminder)
def dismiss_reminder(reminder_id: int, db: Session = Depends(get_db)):
    """Mark a reminder as dismissed"""
    db_reminder = reminder_service.mark_reminder_as_dismissed(db, reminder_id)
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder_service.prepare_reminder_for_response(db_reminder)

@router.post("/{reminder_id}/sent", response_model=Reminder)
def mark_reminder_as_sent(reminder_id: int, db: Session = Depends(get_db)):
    """Mark a reminder as sent"""
    db_reminder = reminder_service.mark_reminder_as_sent(db, reminder_id)
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder_service.prepare_reminder_for_response(db_reminder)

@router.get("/task/{task_id}", response_model=List[Reminder])
def get_task_reminders(task_id: int, db: Session = Depends(get_db)):
    """Get all reminders for a specific task"""
    reminders = reminder_service.get_task_reminders(db, task_id)
    return [reminder_service.prepare_reminder_for_response(reminder) for reminder in reminders]
