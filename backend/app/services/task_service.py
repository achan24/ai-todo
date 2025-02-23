from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..models.task import Task
from ..schemas.task import TaskCreate, TaskUpdate, TaskWithAIRecommendation

async def create_task(db: Session, task: TaskCreate, user_id: int) -> Task:
    db_task = Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        parent_id=task.parent_id,
        tags=task.tags or [],
        user_id=user_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

async def get_tasks(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    completed: Optional[bool] = None
) -> List[Task]:
    query = db.query(Task).filter(Task.user_id == user_id)
    
    if completed is not None:
        query = query.filter(Task.completed == completed)
    
    tasks = query.offset(skip).limit(limit).all()
    # Ensure tags is never None
    for task in tasks:
        if task.tags is None:
            task.tags = []
    return tasks

async def get_task(db: Session, task_id: int, user_id: int) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    if task.tags is None:
        task.tags = []
    return task

async def update_task(db: Session, task_id: int, task_update: TaskUpdate, user_id: int) -> Task:
    db_task = await get_task(db, task_id, user_id)
    
    update_data = task_update.model_dump(exclude_unset=True)
    # Ensure tags is never None
    if "tags" in update_data and update_data["tags"] is None:
        update_data["tags"] = []
        
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task

async def delete_task(db: Session, task_id: int, user_id: int):
    db_task = await get_task(db, task_id, user_id)
    db.delete(db_task)
    db.commit()

async def get_next_task(db: Session, user_id: int) -> TaskWithAIRecommendation:
    # Get all incomplete tasks
    tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.completed == False
    ).all()
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No incomplete tasks found"
        )
    
    # Simple priority scoring
    task_scores = []
    for task in tasks:
        score = 0
        if task.priority == "high":
            score += 3
        elif task.priority == "medium":
            score += 2
        else:
            score += 1
            
        if task.due_date:
            if task.due_date < datetime.utcnow():
                score += 3
            
        task_scores.append((task, score))
    
    # Sort by score and get highest
    recommended_task, confidence = max(task_scores, key=lambda x: x[1])
    
    # Normalize confidence to 0-1 range
    max_possible_score = 6  # max priority (3) + overdue (3)
    confidence = confidence / max_possible_score
    
    if recommended_task.tags is None:
        recommended_task.tags = []
    
    return TaskWithAIRecommendation(
        **recommended_task.__dict__,
        ai_confidence=confidence
    )
