from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from typing import Optional
import uuid
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base

# Priority constants
PRIORITY_HIGH = 1
PRIORITY_MEDIUM = 2
PRIORITY_LOW = 3

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    priority = Column(Integer, default=PRIORITY_MEDIUM)  # Store as integer: 1=high, 2=medium, 3=low
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
        # Map numeric priorities to string values
        priority_map = {
            PRIORITY_HIGH: "high",
            PRIORITY_MEDIUM: "medium",
            PRIORITY_LOW: "low"
        }
        
        if self.priority is None:
            return "medium"
            
        if isinstance(self.priority, int):
            return priority_map.get(self.priority, "medium")
            
        if isinstance(self.priority, str):
            try:
                # Try to convert string to int
                num_priority = int(self.priority)
                return priority_map.get(num_priority, "medium")
            except ValueError:
                # If it's already a string value
                return self.priority
                
        return "medium"
