from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.reminder import ReminderTypeEnum, ReminderStatusEnum

class ReminderBase(BaseModel):
    title: str
    message: Optional[str] = None
    reminder_time: datetime
    reminder_type: ReminderTypeEnum = ReminderTypeEnum.one_time
    task_id: Optional[int] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        json_schema_extra = {
            "example": {
                "title": "Reminder Title",
                "message": "Reminder message",
                "reminder_time": "2025-03-08T12:00:00",
                "reminder_type": "one_time",
                "task_id": 1
            }
        }

class ReminderCreate(BaseModel):
    title: str
    message: Optional[str] = None
    reminder_time: str  # Accept string input from frontend
    reminder_type: ReminderTypeEnum = ReminderTypeEnum.one_time
    task_id: Optional[int] = None
    
    def to_reminder_base(self) -> ReminderBase:
        """Convert string datetime to proper datetime object"""
        try:
            dt = datetime.fromisoformat(self.reminder_time.replace('Z', '+00:00'))
            return ReminderBase(
                title=self.title,
                message=self.message,
                reminder_time=dt,
                reminder_type=self.reminder_type,
                task_id=self.task_id
            )
        except ValueError as e:
            raise ValueError(f"Invalid datetime format: {e}")

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    reminder_time: Optional[datetime] = None
    reminder_type: Optional[ReminderTypeEnum] = None
    status: Optional[ReminderStatusEnum] = None
    task_id: Optional[int] = None

class Reminder(ReminderBase):
    id: int
    status: ReminderStatusEnum = ReminderStatusEnum.pending
    created_at: datetime
    updated_at: datetime
    user_id: int = 1

    class Config:
        from_attributes = True
