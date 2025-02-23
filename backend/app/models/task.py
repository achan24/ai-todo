from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
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
    user_id = Column(Integer, default=1)  # Hardcode user_id as 1 for now
    parent_id = Column(Integer, ForeignKey('tasks.id'), nullable=True)

    # Relationships
    subtasks = relationship("Task", backref="parent", remote_side=[id])
