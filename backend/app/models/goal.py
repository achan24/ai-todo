from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects import sqlite
from datetime import datetime
import enum
from ..database import Base
from .task import Task
from .conversation import Conversation

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
    contributions_list = Column(sqlite.JSON, nullable=False, server_default='[]')  # [{value: float, task_id: int, timestamp: str}]
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    goal = relationship("Goal", back_populates="metrics")
    tasks = relationship("Task", back_populates="metric")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    priority = Column(String, nullable=True)  # high, medium, low
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    user_id = Column(String, default="1")  
    parent_id = Column(Integer, ForeignKey('goals.id', ondelete='CASCADE'), nullable=True)
    current_strategy_id = Column(Integer, nullable=True)

    # Relationships
    tasks = relationship("Task", back_populates="goal", cascade="all, delete-orphan")
    parent = relationship("Goal", remote_side=[id], back_populates="subgoals")
    subgoals = relationship("Goal", back_populates="parent", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="goal", cascade="all, delete-orphan")
    experiences = relationship("Experience", back_populates="goal", cascade="all, delete-orphan")
    strategies = relationship("Strategy", back_populates="goal", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="goal", cascade="all, delete-orphan")
