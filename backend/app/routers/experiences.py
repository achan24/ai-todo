from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.experience import Experience
from ..schemas.experience import ExperienceCreate, Experience as ExperienceSchema
from ..models.goal import Goal

router = APIRouter(
    prefix="/goals/{goal_id}/experiences",
    tags=["experiences"]
)

@router.post("", response_model=ExperienceSchema)
async def create_experience(
    goal_id: int,
    experience: ExperienceCreate,
    db: Session = Depends(get_db)
):
    """Create a new experience for a goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db_experience = Experience(
        content=experience.content,
        type=experience.type,
        goal_id=goal_id
    )
    db.add(db_experience)
    db.commit()
    db.refresh(db_experience)
    return db_experience

@router.get("", response_model=List[ExperienceSchema])
async def get_experiences(
    goal_id: int,
    db: Session = Depends(get_db)
):
    """Get all experiences for a goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    experiences = db.query(Experience).filter(Experience.goal_id == goal_id).order_by(Experience.created_at.desc()).all()
    return experiences
