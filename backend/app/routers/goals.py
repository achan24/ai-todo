from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.goal import Goal
from ..models.task import Task
from ..schemas.goal import GoalCreate, GoalUpdate, Goal as GoalSchema
from ..schemas.task import TaskCreate, Task as TaskSchema

router = APIRouter(
    prefix="/goals",
    tags=["goals"]
)

@router.get("/", response_model=List[GoalSchema])
async def get_goals(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all goals for the current user"""
    goals = db.query(Goal).filter(Goal.user_id == 1).offset(skip).limit(limit).all()
    return goals

@router.post("/", response_model=GoalSchema)
async def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db)
):
    """Create a new goal"""
    db_goal = Goal(
        title=goal.title,
        description=goal.description,
        user_id=1  # Hardcode user_id as 1 for now
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.get("/{goal_id}", response_model=GoalSchema)
async def get_goal(
    goal_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific goal by ID"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.put("/{goal_id}", response_model=GoalSchema)
async def update_goal(
    goal_id: int,
    goal_update: GoalUpdate,
    db: Session = Depends(get_db)
):
    """Update a goal"""
    db_goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    update_data = goal_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_goal, field, value)
    
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db)
):
    """Delete a goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}

@router.get("/{goal_id}/tasks", response_model=List[TaskSchema])
async def get_goal_tasks(
    goal_id: int,
    db: Session = Depends(get_db)
):
    """Get all tasks for a specific goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return db.query(Task).filter(Task.goal_id == goal_id).all()

@router.post("/{goal_id}/tasks", response_model=TaskSchema)
async def create_goal_task(
    goal_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db)
):
    """Create a new task for a goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db_task = Task(
        title=task.title,
        description=task.description if task.description else None,
        completed=False,
        goal_id=goal_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task
