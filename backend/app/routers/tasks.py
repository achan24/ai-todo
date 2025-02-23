from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..schemas import task as task_schema
from ..services import task_service
from ..dependencies import get_db

router = APIRouter()

@router.post("/", response_model=task_schema.Task)
async def create_task(
    task: task_schema.TaskCreate,
    db: Session = Depends(get_db)
):
    """Create a new task"""
    # Temporarily hardcode user_id as 1 until auth is implemented
    return await task_service.create_task(db, task, user_id=1)

@router.get("/", response_model=List[task_schema.Task])
async def get_tasks(
    skip: int = 0,
    limit: int = 100,
    completed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all tasks"""
    return await task_service.get_tasks(db, user_id=1, skip=skip, limit=limit, completed=completed)

@router.get("/next", response_model=task_schema.TaskWithAIRecommendation)
async def get_next_task(
    db: Session = Depends(get_db)
):
    """Get AI recommendation for the next task to work on"""
    return await task_service.get_next_task(db, user_id=1)

@router.get("/{task_id}", response_model=task_schema.Task)
async def get_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific task by ID"""
    return await task_service.get_task(db, task_id, user_id=1)

@router.put("/{task_id}", response_model=task_schema.Task)
async def update_task(
    task_id: int,
    task: task_schema.TaskUpdate,
    db: Session = Depends(get_db)
):
    """Update a task"""
    return await task_service.update_task(db, task_id, task, user_id=1)

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """Delete a task"""
    await task_service.delete_task(db, task_id, user_id=1)
