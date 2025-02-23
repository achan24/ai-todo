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
    
    return query.offset(skip).limit(limit).all()

async def get_task(db: Session, task_id: int, user_id: int) -> Task:
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return task

async def update_task(db: Session, task_id: int, task_update: TaskUpdate, user_id: int) -> Task:
    db_task = await get_task(db, task_id, user_id)
    
    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db_task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_task)
    return db_task

async def delete_task(db: Session, task_id: int, user_id: int):
    db_task = await get_task(db, task_id, user_id)
    db.delete(db_task)
    db.commit()

async def get_next_task(db: Session, user_id: int) -> TaskWithAIRecommendation:
    # Get incomplete tasks
    tasks = await get_tasks(db, user_id, completed=False)
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tasks available"
        )
    
    # For now, return the highest priority task with earliest due date
    sorted_tasks = sorted(
        tasks,
        key=lambda t: (
            {"high": 0, "medium": 1, "low": 2}[t.priority],
            t.due_date.timestamp() if t.due_date else float('inf')
        )
    )
    
    task_dict = sorted_tasks[0].__dict__.copy()
    if '_sa_instance_state' in task_dict:
        del task_dict['_sa_instance_state']
    
    return TaskWithAIRecommendation(
        **task_dict,
        ai_confidence=0.9,
        reasoning="Based on task priority and due date"
    )
