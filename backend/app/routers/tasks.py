from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from fastapi.responses import JSONResponse
from datetime import datetime

from ..database import get_db
from ..services import task_service
from ..schemas.task import Task, TaskCreate, TaskUpdate, TaskWithAIRecommendation, TaskComplete
from ..models.goal import Metric

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])

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

@router.post("/{task_id}/complete", response_model=Task)
async def complete_task(task_id: int, completion: TaskComplete, db: Session = Depends(get_db)):
    """Complete a task and record metric contribution if applicable"""
    try:
        logger.info("Completing task %d with contribution %s", task_id, completion.contribution_value)
        task_update = TaskUpdate(
            completed=True,
            completion_time=datetime.now(),
            metric_id=completion.metric_id,
            contribution_value=completion.contribution_value
        )
        updated_task = await task_service.update_task(db, task_id, task_update, user_id=1)
        
        # If there's a metric contribution, update the metric's current value
        if completion.metric_id and completion.contribution_value:
            metric = db.query(Metric).filter(Metric.id == completion.metric_id).first()
            if metric:
                metric.current_value = (metric.current_value or 0) + completion.contribution_value
                db.commit()
        
        return updated_task
    except Exception as e:
        logger.error("Error completing task %d: %s", task_id, str(e), exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error completing task: {str(e)}"}
        )
