from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.strategy import Strategy
from ..schemas.strategy import StrategyCreate, Strategy as StrategySchema
from ..models.goal import Goal

router = APIRouter(
    prefix="/goals/{goal_id}/strategies",
    tags=["strategies"]
)

@router.post("", response_model=StrategySchema)
async def create_strategy(
    goal_id: int,
    strategy: StrategyCreate,
    db: Session = Depends(get_db)
):
    """Create a new strategy for a goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db_strategy = Strategy(
        title=strategy.title,
        steps=strategy.steps,
        goal_id=goal_id
    )
    db.add(db_strategy)
    db.commit()
    db.refresh(db_strategy)
    return db_strategy

@router.get("", response_model=List[StrategySchema])
async def get_strategies(
    goal_id: int,
    db: Session = Depends(get_db)
):
    """Get all strategies for a goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    strategies = db.query(Strategy).filter(Strategy.goal_id == goal_id).order_by(Strategy.created_at.desc()).all()
    return strategies
