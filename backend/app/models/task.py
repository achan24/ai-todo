from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship, Mapped
from datetime import datetime
from enum import Enum as PyEnum
from typing import List

from ..database import Base

class PriorityEnum(str, PyEnum):
    high = "high"
    medium = "medium"
    low = "low"

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    title: Mapped[str] = Column(String, index=True)
    description: Mapped[str] = Column(String, nullable=True)
    completed: Mapped[bool] = Column(Boolean, default=False)
    priority: Mapped[str] = Column(String, default=PriorityEnum.medium)
    due_date: Mapped[datetime] = Column(DateTime, nullable=True)
    created_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # For MVP, we'll just have a simple user_id field
    user_id: Mapped[int] = Column(Integer, default=1)  # Hardcoded to 1 for now
    
    # Parent-child relationship for nested tasks
    parent_id: Mapped[int] = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True)
    subtasks: Mapped[List["Task"]] = relationship(
        "Task",
        backref="parent",
        cascade="all, delete",
        remote_side=[id],
        lazy="joined"
    )
