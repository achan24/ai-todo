from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from fastapi.responses import JSONResponse
from datetime import datetime
import json
from pydantic import BaseModel

from ..database import get_db
from ..services import task_service, ai_service
from ..schemas.task import Task, TaskCreate, TaskUpdate, TaskWithAIRecommendation
from ..models.goal import Metric

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])

class TaskBreakdownRequest(BaseModel):
    custom_prompt: str | None = None
    messages: List[dict] | None = None

@router.get("/", response_model=List[Task])
async def get_tasks(
    skip: int = 0,
    limit: int = 100,
    completed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all tasks for the current user"""
    try:
        logger.info("Fetching tasks with params: skip=%d, limit=%d, completed=%s", skip, limit, completed)
        tasks = await task_service.get_tasks(db, user_id=1, skip=skip, limit=limit, completed=completed)
        
        # Ensure subtasks and tags are never None
        for task in tasks:
            task.subtasks = task.subtasks or []
            task.tags = task.tags or []
            
        logger.info("Successfully fetched %d tasks", len(tasks))
        return tasks
    except Exception as e:
        logger.error("Error fetching tasks: %s", str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error fetching tasks: {str(e)}"}
        )

@router.post("/", response_model=Task)
async def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task"""
    try:
        logger.info("Creating new task: %s", task.title)
        return await task_service.create_task(db, task, user_id=1)
    except Exception as e:
        logger.error("Error creating task: %s", str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error creating task: {str(e)}"}
        )

@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: int, db: Session = Depends(get_db)):
    """Get a specific task by ID"""
    try:
        logger.info("Fetching task with id: %d", task_id)
        task = await task_service.get_task(db, task_id, user_id=1)
        task.subtasks = task.subtasks or []
        task.tags = task.tags or []
        return task
    except Exception as e:
        logger.error("Error fetching task %d: %s", task_id, str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error fetching task: {str(e)}"}
        )

@router.put("/{task_id}", response_model=Task)
async def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    """Update a task"""
    try:
        logger.info("Updating task %d", task_id)
        return await task_service.update_task(db, task_id, task, user_id=1)
    except Exception as e:
        logger.error("Error updating task %d: %s", task_id, str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error updating task: {str(e)}"}
        )

@router.delete("/{task_id}")
async def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task"""
    try:
        logger.info("Deleting task %d", task_id)
        await task_service.delete_task(db, task_id, user_id=1)
        return {"message": "Task deleted successfully"}
    except Exception as e:
        logger.error("Error deleting task %d: %s", task_id, str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error deleting task: {str(e)}"}
        )

@router.get("/next/recommendation", response_model=TaskWithAIRecommendation)
async def get_next_task_recommendation(db: Session = Depends(get_db)):
    """Get AI recommended next task"""
    try:
        logger.info("Getting next task recommendation")
        return await task_service.get_next_task(db, user_id=1)
    except Exception as e:
        logger.error("Error getting task recommendation: %s", str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error getting task recommendation: {str(e)}"}
        )

@router.post("/{task_id}/breakdown")
async def get_task_breakdown(
    task_id: int,
    request: TaskBreakdownRequest,
    db: Session = Depends(get_db)
):
    """Get AI-generated breakdown of a task into subtasks"""
    try:
        logger.info(f"Getting breakdown for task {task_id}")
        task = await task_service.get_task(db, task_id, user_id=1)  # Default user_id=1 for now
        if not task:
            logger.error(f"Task {task_id} not found")
            raise HTTPException(status_code=404, detail="Task not found")
        
        logger.info(f"Using custom prompt: {request.custom_prompt}")
        logger.info(f"Chat history: {request.messages}")
        
        result = await ai_service.breakdown_task(
            task_title=task.title,
            task_description=task.description,
            custom_prompt=request.custom_prompt,
            messages=request.messages
        )
        
        if not result.get("subtasks"):
            logger.error("No subtasks generated")
            raise HTTPException(status_code=500, detail="Failed to generate subtasks")
            
        logger.info(f"Generated {len(result['subtasks'])} subtasks")
        return result
    except Exception as e:
        logger.error(f"Error breaking down task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{task_id}/star", response_model=Task)
async def toggle_star(task_id: int, db: Session = Depends(get_db)):
    """Toggle the star status of a task"""
    try:
        logger.info(f"Toggling star status for task {task_id}")
        task = await task_service.get_task(db, task_id=task_id, user_id=1)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Toggle the star status
        task.is_starred = not task.is_starred
        db.commit()
        db.refresh(task)
        
        logger.info(f"Task {task_id} star status toggled to {task.is_starred}")
        return task
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling star status for task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error toggling star status: {str(e)}")

@router.patch("/{task_id}/schedule", response_model=Task)
async def schedule_task(task_id: int, scheduled_time: Optional[datetime] = None, db: Session = Depends(get_db)):
    """Schedule a task for a specific time"""
    try:
        logger.info(f"Scheduling task {task_id} for {scheduled_time}")
        task = await task_service.get_task(db, task_id=task_id, user_id=1)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Update the scheduled time
        task.scheduled_time = scheduled_time
        db.commit()
        db.refresh(task)
        
        logger.info(f"Task {task_id} scheduled for {scheduled_time}")
        return task
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error scheduling task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error scheduling task: {str(e)}")
