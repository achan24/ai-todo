from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from ..database import Base

class MetricType(str, enum.Enum):
    target = "target"
    process = "process"

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String, nullable=False)  
    unit = Column(String, nullable=False)
    target_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)

    # Relationship
    goal = relationship("Goal", back_populates="metrics")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    user_id = Column(Integer, default=1)  
    parent_id = Column(Integer, ForeignKey('goals.id', ondelete='CASCADE'), nullable=True)

    # Relationships
    tasks = relationship("Task", back_populates="goal", cascade="all, delete-orphan")
    parent = relationship("Goal", remote_side=[id], back_populates="subgoals")
    subgoals = relationship("Goal", back_populates="parent", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="goal", cascade="all, delete-orphan")
