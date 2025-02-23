from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship, backref
from datetime import datetime
import enum
from ..database import Base

class PriorityEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.medium)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tags = Column(JSON, nullable=True, default=list)
    estimated_minutes = Column(Integer, nullable=True)
    user_id = Column(Integer, default=1)
    parent_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True)
    goal_id = Column(Integer, ForeignKey('goals.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    subtasks = relationship(
        "Task",
        backref=backref('parent', remote_side=[id]),
        cascade="all, delete-orphan",
        lazy='joined'
    )
    goal = relationship("Goal", back_populates="tasks")
    
    # Task completion tracking
    completion_time = Column(DateTime, nullable=True)
    completion_order = Column(Integer, nullable=True)

    def __init__(self, **kwargs):
        kwargs['tags'] = kwargs.get('tags', [])
        super().__init__(**kwargs)
