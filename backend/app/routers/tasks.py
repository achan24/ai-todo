from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from ..schemas import task as task_schema
from ..services import task_service
from ..core.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=task_schema.Task)
async def create_task(
    task: task_schema.TaskCreate,
    current_user = Depends(get_current_user)
):
    """Create a new task"""
    return await task_service.create_task(task, current_user.id)

@router.get("/", response_model=List[task_schema.Task])
async def get_tasks(
    current_user = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    completed: Optional[bool] = None
):
    """Get all tasks for the current user"""
    return await task_service.get_tasks(current_user.id, skip, limit, completed)

@router.get("/next", response_model=task_schema.TaskWithAIRecommendation)
async def get_next_task(
    current_user = Depends(get_current_user)
):
    """Get AI recommendation for the next task to work on"""
    return await task_service.get_next_task(current_user.id)

@router.put("/{task_id}", response_model=task_schema.Task)
async def update_task(
    task_id: int,
    task: task_schema.TaskUpdate,
    current_user = Depends(get_current_user)
):
    """Update a task"""
    return await task_service.update_task(task_id, task, current_user.id)

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user = Depends(get_current_user)
):
    """Delete a task"""
    await task_service.delete_task(task_id, current_user.id)
