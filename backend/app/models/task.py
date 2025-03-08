from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional

from ..database import Base

class PriorityEnum(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    priority = Column(SQLEnum(PriorityEnum), default=PriorityEnum.medium)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    user_id = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True)
    estimated_minutes = Column(Integer, nullable=True)
    goal_id = Column(Integer, ForeignKey('goals.id', ondelete='SET NULL'), nullable=True)
    metric_id = Column(Integer, ForeignKey('metrics.id', ondelete='SET NULL'), nullable=True)
    contribution_value = Column(Float, nullable=True)
    completion_time = Column(DateTime, nullable=True)
    completion_order = Column(Integer, nullable=True)
    tags = Column(JSON, nullable=True, default=list)
    is_starred = Column(Boolean, default=False)
    scheduled_time = Column(DateTime, nullable=True)
    has_reminders = Column(Boolean, default=False)
    
    # Relationships
    subtasks = relationship("Task", 
                          cascade="all, delete-orphan",
                          backref=backref('parent', remote_side=[id]),
                          lazy='joined')
    goal = relationship("Goal", back_populates="tasks")
    metric = relationship("Metric", back_populates="tasks")
