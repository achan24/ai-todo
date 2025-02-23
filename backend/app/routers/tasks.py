from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.task import Task
from ..schemas.task import TaskCreate, TaskUpdate, Task as TaskSchema, TaskWithAIRecommendation
from ..services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("", response_model=TaskSchema)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    return await task_service.create_task(db, task, user_id=1)

@router.get("", response_model=List[TaskSchema])
async def get_tasks(
    skip: int = 0,
    limit: int = 100,
    completed: bool | None = None,
    db: Session = Depends(get_db)
):
    """Get all tasks"""
    return await task_service.get_tasks(db, user_id=1, skip=skip, limit=limit, completed=completed)

@router.get("/{task_id}", response_model=TaskSchema)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a specific task by ID"""
    return await task_service.get_task(db, task_id, user_id=1)

@router.put("/{task_id}", response_model=TaskSchema)
async def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task"""
    return await task_service.update_task(db, task_id, task, user_id=1)

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    await task_service.delete_task(db, task_id, user_id=1)
    return None
