from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, Float, Boolean, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects import sqlite
from datetime import datetime
import enum
import uuid
from ..database import Base
from .task import Task
from .conversation import Conversation
from .note import Note
from .situation import Situation

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

class GoalTargetStatus(str, enum.Enum):
    concept = "concept"
    active = "active"
    paused = "paused"
    achieved = "achieved"

class GoalTarget(Base):
    __tablename__ = "goal_targets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, default=GoalTargetStatus.concept, nullable=False)
    notes = Column(sqlite.JSON, nullable=False, server_default='[]')  # Array of text entries
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    goaltarget_parent_id = Column(String, ForeignKey("goal_targets.id", ondelete="CASCADE"), nullable=True)
    position = Column(Integer, default=0)  # For ordering siblings

    # Relationships
    goal = relationship("Goal", back_populates="targets")
    parent = relationship("GoalTarget", remote_side=[id], back_populates="children", foreign_keys=[goaltarget_parent_id])
    children = relationship("GoalTarget", back_populates="parent", cascade="all, delete-orphan", foreign_keys=[goaltarget_parent_id])

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    priority = Column(String, nullable=True)  # high, medium, low
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    user_id = Column(Integer, default=1)  
    parent_id = Column(Integer, ForeignKey('goals.id', ondelete='CASCADE'), nullable=True)
    current_strategy_id = Column(Integer, nullable=True)

    # Relationships
    tasks = relationship("Task", back_populates="goal", cascade="all, delete-orphan")
    parent = relationship("Goal", remote_side=[id], back_populates="subgoals")
    subgoals = relationship("Goal", back_populates="parent", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="goal", cascade="all, delete-orphan")
    targets = relationship("GoalTarget", back_populates="goal", cascade="all, delete-orphan")
    experiences = relationship("Experience", back_populates="goal", cascade="all, delete-orphan")
    strategies = relationship("Strategy", back_populates="goal", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="goal", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="goal", cascade="all, delete-orphan")
    situations = relationship("Situation", back_populates="goal", cascade="all, delete-orphan")
