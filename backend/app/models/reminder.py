from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional

from ..database import Base

class ReminderTypeEnum(str, Enum):
    one_time = "one_time"
    recurring_daily = "recurring_daily"
    recurring_weekly = "recurring_weekly"
    recurring_monthly = "recurring_monthly"
    smart = "smart"  # AI-determined optimal time

class ReminderStatusEnum(str, Enum):
    pending = "pending"
    sent = "sent"
    dismissed = "dismissed"

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    reminder_time = Column(DateTime, nullable=False)
    reminder_type = Column(SQLEnum(ReminderTypeEnum), default=ReminderTypeEnum.one_time, nullable=False)
    status = Column(SQLEnum(ReminderStatusEnum), default=ReminderStatusEnum.pending, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    user_id = Column(Integer, default=1)
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True)
    
    # Relationships
    task = relationship("Task", backref="reminders")
