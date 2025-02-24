from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, default=1)  # Hardcode user_id as 1 for now
    parent_id = Column(Integer, ForeignKey('goals.id', ondelete='CASCADE'), nullable=True)

    # Relationships
    tasks = relationship("Task", back_populates="goal", cascade="all, delete-orphan")
    parent = relationship("Goal", remote_side=[id], back_populates="subgoals")
    subgoals = relationship("Goal", back_populates="parent", cascade="all, delete-orphan")
