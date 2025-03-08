from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional

from ..models.reminder import Reminder, ReminderStatusEnum
from ..schemas.reminder import ReminderCreate, ReminderUpdate

def get_reminders(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Reminder]:
    """Get all reminders for a user"""
    return db.query(Reminder).filter(Reminder.user_id == user_id).offset(skip).limit(limit).all()

def get_pending_reminders(db: Session, user_id: int) -> List[Reminder]:
    """Get all pending reminders for a user"""
    return db.query(Reminder).filter(
        Reminder.user_id == user_id,
        Reminder.status == ReminderStatusEnum.pending,
        Reminder.reminder_time <= datetime.now()
    ).all()

def get_reminder(db: Session, reminder_id: int) -> Optional[Reminder]:
    """Get a specific reminder by ID"""
    return db.query(Reminder).filter(Reminder.id == reminder_id).first()

def get_task_reminders(db: Session, task_id: int) -> List[Reminder]:
    """Get all reminders for a specific task"""
    return db.query(Reminder).filter(Reminder.task_id == task_id).all()

def create_reminder(db: Session, reminder: ReminderCreate, user_id: int) -> Reminder:
    """Create a new reminder and update the task's has_reminders flag"""
    # Convert string datetime to proper datetime object
    try:
        print(f"Raw reminder data received: {reminder.model_dump()}")
        reminder_base = reminder.to_reminder_base()
        print(f"Converted reminder data: {reminder_base.model_dump()}")
        
        # Get enum values from strings if needed
        from ..models.reminder import ReminderTypeEnum, ReminderStatusEnum
        
        reminder_type = reminder_base.reminder_type
        if isinstance(reminder_type, str):
            reminder_type = ReminderTypeEnum(reminder_type)
            
        # Create the reminder object
        db_reminder = Reminder(
            title=reminder_base.title,
            message=reminder_base.message,
            reminder_time=reminder_base.reminder_time,
            reminder_type=reminder_type,
            task_id=reminder_base.task_id,
            user_id=user_id,
            status=ReminderStatusEnum.pending
        )
        
        print(f"Creating reminder object: {db_reminder.__dict__}")
        db.add(db_reminder)
    except ValueError as e:
        print(f"Error creating reminder: {e}")
        raise
    
    # Update the task's has_reminders flag if a task_id is provided
    if reminder.task_id:
        from ..models.task import Task
        task = db.query(Task).filter(Task.id == reminder.task_id).first()
        if task:
            task.has_reminders = True
    
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

def update_reminder(db: Session, reminder_id: int, reminder: ReminderUpdate) -> Optional[Reminder]:
    """Update an existing reminder"""
    db_reminder = get_reminder(db, reminder_id)
    if not db_reminder:
        return None
    
    update_data = reminder.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_reminder, key, value)
    
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

def delete_reminder(db: Session, reminder_id: int) -> bool:
    """Delete a reminder and update the task's has_reminders flag if needed"""
    db_reminder = get_reminder(db, reminder_id)
    if not db_reminder:
        return False
    
    # Check if this is the last reminder for the task
    task_id = db_reminder.task_id
    if task_id:
        from ..models.task import Task
        # Count remaining reminders for this task (excluding the one being deleted)
        remaining_reminders_count = db.query(Reminder).filter(
            Reminder.task_id == task_id,
            Reminder.id != reminder_id
        ).count()
        
        # If this is the last reminder, update the task's has_reminders flag
        if remaining_reminders_count == 0:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.has_reminders = False
    
    db.delete(db_reminder)
    db.commit()
    return True

def mark_reminder_as_sent(db: Session, reminder_id: int) -> Optional[Reminder]:
    """Mark a reminder as sent"""
    db_reminder = get_reminder(db, reminder_id)
    if not db_reminder:
        return None
    
    db_reminder.status = ReminderStatusEnum.sent
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

def mark_reminder_as_dismissed(db: Session, reminder_id: int) -> Optional[Reminder]:
    """Mark a reminder as dismissed"""
    db_reminder = get_reminder(db, reminder_id)
    if not db_reminder:
        return None
    
    db_reminder.status = ReminderStatusEnum.dismissed
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

def prepare_reminder_for_response(reminder: Reminder) -> dict:
    """Convert a reminder object to a dictionary for API response"""
    reminder_dict = {
        "id": reminder.id,
        "title": reminder.title,
        "message": reminder.message,
        "reminder_time": reminder.reminder_time,
        "reminder_type": reminder.reminder_type,
        "status": reminder.status,
        "created_at": reminder.created_at,
        "updated_at": reminder.updated_at,
        "user_id": str(reminder.user_id),  # Convert UUID to string if needed
        "task_id": reminder.task_id
    }
    return reminder_dict
