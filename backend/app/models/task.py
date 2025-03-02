from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from enum import Enum
from typing import Optional
import uuid
from sqlalchemy.dialects.postgresql import UUID

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
    user_id = Column(String, nullable=False)  # Use String for UUID compatibility with both PostgreSQL and SQLite
    parent_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True)
    estimated_minutes = Column(Integer, nullable=True)
    goal_id = Column(Integer, ForeignKey('goals.id', ondelete='SET NULL'), nullable=True)
    metric_id = Column(Integer, ForeignKey('metrics.id', ondelete='SET NULL'), nullable=True)
    contribution_value = Column(Float, nullable=True)
    completion_time = Column(DateTime, nullable=True)
    completion_order = Column(Integer, nullable=True)
    tags = Column(JSON, nullable=True, default=list)
    
    # Relationships
    subtasks = relationship("Task", 
                          cascade="all, delete-orphan",
                          backref=backref('parent', remote_side=[id]),
                          lazy='joined')
    goal = relationship("Goal", back_populates="tasks")
    metric = relationship("Metric", back_populates="tasks")

    @property
    def priority_safe(self):
        """Return the priority as a string, handling numeric values"""
        if self.priority is None:
            return PriorityEnum.medium
        if isinstance(self.priority, str):
            return self.priority
        if isinstance(self.priority, int) or self.priority.isdigit():
            # Map numeric priorities to enum values
            priority_map = {
                1: PriorityEnum.high,
                2: PriorityEnum.medium,
                3: PriorityEnum.low
            }
            num_priority = int(self.priority)
            return priority_map.get(num_priority, PriorityEnum.medium)
        return self.priority
