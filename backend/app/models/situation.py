from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects import sqlite
import enum
from ..database import Base

class SituationType(str, enum.Enum):
    planned = "planned"
    completed = "completed"

class OutcomeType(str, enum.Enum):
    success = "success"
    partial_success = "partial_success"
    failure = "failure"

class Situation(Base):
    __tablename__ = "situations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    situation_type = Column(String, nullable=False)  # planned or completed
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    outcome = Column(String, nullable=True)  # success, partial_success, or failure
    score = Column(Integer, nullable=True)  # 1-10 self-assessment
    lessons_learned = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    goal = relationship("Goal", back_populates="situations")
    phases = relationship("Phase", back_populates="situation", cascade="all, delete-orphan")

class Phase(Base):
    __tablename__ = "phases"

    id = Column(Integer, primary_key=True, index=True)
    phase_name = Column(String, nullable=False)
    approach_used = Column(Text, nullable=True)
    effectiveness_score = Column(Integer, nullable=True)  # 1-10
    response_outcome = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    situation_id = Column(Integer, ForeignKey("situations.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    situation = relationship("Situation", back_populates="phases")
