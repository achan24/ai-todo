from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    steps = Column(JSON, nullable=False)  # List of step strings
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    goal = relationship("Goal", back_populates="strategies")
