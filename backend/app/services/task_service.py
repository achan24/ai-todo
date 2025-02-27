from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import json

from ..models import Task, Metric
from ..schemas.task import TaskCreate, TaskUpdate, TaskWithAIRecommendation

async def get_tasks(db: Session, user_id: int, skip: int = 0, limit: int = 100, completed: Optional[bool] = None) -> List[Task]:
    """Get all tasks for a user, with proper subtask relationships"""
    query = db.query(Task).filter(
        Task.user_id == user_id,
        Task.parent_id.is_(None)  # Only get root tasks
    )
    
    if completed is not None:
        query = query.filter(Task.completed == completed)
    
    tasks = query.offset(skip).limit(limit).all()
    # Ensure tags is never None
    for task in tasks:
        if task.tags is None:
            task.tags = []
    return tasks

async def create_task(db: Session, task: TaskCreate, user_id: int) -> Task:
    """Create a new task"""
    db_task = Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        tags=task.tags or [],
        user_id=user_id,
        parent_id=task.parent_id,
        estimated_minutes=task.estimated_minutes,
        goal_id=task.goal_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

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
    """Update a task"""
    db_task = await get_task(db, task_id, user_id)
    
    update_data = task_update.model_dump(exclude_unset=True)
    # Ensure tags is never None
    if "tags" in update_data and update_data["tags"] is None:
        update_data["tags"] = []
        
    for field, value in update_data.items():
        setattr(db_task, field, value)
        
    # If task is being completed, record completion time and order
    if update_data.get('completed') is True and not db_task.completion_time:
        db_task.completion_time = datetime.utcnow()
        # Get the next completion order number
        last_completed = db.query(Task).filter(
            Task.user_id == user_id,
            Task.completion_order.isnot(None)
        ).order_by(Task.completion_order.desc()).first()
        db_task.completion_order = (last_completed.completion_order + 1) if last_completed else 1
        
        # If there's a metric contribution, update the metric
        if db_task.metric_id and db_task.contribution_value:
            metric = db.query(Metric).filter(Metric.id == db_task.metric_id).first()
            if metric:
                # Add contribution to list
                try:
                    contributions = json.loads(metric.contributions_list or '[]')
                except json.JSONDecodeError:
                    contributions = []
                    
                contributions.append({
                    "value": float(db_task.contribution_value),  # Ensure it's a float
                    "task_id": task_id,
                    "timestamp": datetime.utcnow().isoformat()
                })
                metric.contributions_list = json.dumps(contributions)
                
                # Sum up all contributions to get current value
                metric.current_value = sum(float(c["value"]) for c in contributions)  # Ensure we're summing floats
                
                db.add(metric)
                db.commit()
                db.refresh(metric)
    
    # If task is being uncompleted, remove its contribution from the metric
    elif update_data.get('completed') is False and db_task.completion_time:
        db_task.completion_time = None
        db_task.completion_order = None
        
        if db_task.metric_id and db_task.contribution_value:
            metric = db.query(Metric).filter(Metric.id == db_task.metric_id).first()
            if metric:
                try:
                    contributions = json.loads(metric.contributions_list or '[]')
                except json.JSONDecodeError:
                    contributions = []
                    
                # Remove this task's contribution
                contributions = [c for c in contributions if c.get("task_id") != task_id]
                metric.contributions_list = json.dumps(contributions)
                
                # Recalculate current value
                metric.current_value = sum(float(c["value"]) for c in contributions)
                
                db.add(metric)
                db.commit()
                db.refresh(metric)
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

async def delete_task(db: Session, task_id: int, user_id: int) -> None:
    """Delete a task and all its subtasks"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)  # This will cascade to subtasks due to relationship settings
    db.commit()

def analyze_completion_patterns(db: Session, user_id: int) -> dict:
    """Analyze historical task completion patterns to learn user preferences"""
    completed_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.completed == True,
        Task.completion_time.isnot(None)
    ).order_by(Task.completion_time).all()
    
    patterns = {
        'priority_preference': defaultdict(float),  # How often each priority level is chosen
        'tag_preference': defaultdict(float),       # How often each tag is chosen
        'time_of_day': defaultdict(float),         # When tasks are usually completed
        'goal_preference': defaultdict(float)       # Which goals are prioritized
    }
    
    if not completed_tasks:
        return patterns
        
    # Analyze completed tasks
    for task in completed_tasks:
        # Priority patterns
        patterns['priority_preference'][task.priority] += 1
        
        # Tag patterns
        if task.tags:
            for tag in task.tags:
                patterns['tag_preference'][tag] += 1
        
        # Time of day patterns
        hour = task.completion_time.hour
        patterns['time_of_day'][hour] += 1
        
        # Goal patterns
        if task.goal_id:
            patterns['goal_preference'][task.goal_id] += 1
    
    # Normalize patterns
    total_tasks = len(completed_tasks)
    for category in patterns:
        if patterns[category]:
            max_val = max(patterns[category].values())
            for key in patterns[category]:
                patterns[category][key] /= max_val  # Normalize to 0-1 range
    
    return patterns

def calculate_task_priority_score(task: Task, completion_patterns: dict, current_time: datetime) -> float:
    """Calculate a priority score for a task based on multiple factors and learning"""
    score = 0.0
    
    # Base priority weight
    priority_weights = {
        "high": 3.0,
        "medium": 2.0,
        "low": 1.0
    }
    score += priority_weights.get(task.priority, 1.0)
    
    # Due date weight (exponential increase as deadline approaches)
    if task.due_date:
        hours_until_due = max(0, (task.due_date - current_time).total_seconds() / 3600)
        if hours_until_due == 0:  # Already overdue
            score += 5.0
        else:
            urgency = 5.0 * (1 / (1 + hours_until_due/24))  # Exponential urgency increase
            score += urgency
    
    # Tag-based weights with learned preferences
    if task.tags:
        important_tags = ["urgent", "important", "blocker", "deadline"]
        base_tag_score = sum(0.5 for tag in task.tags if any(imp_tag in tag.lower() for imp_tag in important_tags))
        
        # Add learned tag preferences
        learned_tag_score = sum(completion_patterns['tag_preference'].get(tag, 0) for tag in task.tags)
        score += base_tag_score + (learned_tag_score * 0.5)
    
    # Goal alignment (if task is part of a prioritized goal)
    if task.goal_id:
        goal_priority = completion_patterns['goal_preference'].get(task.goal_id, 0)
        score += goal_priority * 2.0
    
    # Time of day preference
    hour_preference = completion_patterns['time_of_day'].get(current_time.hour, 0)
    score += hour_preference * 0.5
    
    # Priority preference from learning
    priority_preference = completion_patterns['priority_preference'].get(task.priority, 0)
    score += priority_preference * 0.5
    
    return score

async def get_next_task(db: Session, user_id: int) -> TaskWithAIRecommendation:
    """Get AI recommended next task based on multiple factors and learning"""
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
    
    # Get completion patterns for learning
    completion_patterns = analyze_completion_patterns(db, user_id)
    current_time = datetime.utcnow()
    
    # Calculate scores considering all factors
    task_scores = [(task, calculate_task_priority_score(task, completion_patterns, current_time)) 
                   for task in tasks]
    
    # Sort by score and get highest
    recommended_task, score = max(task_scores, key=lambda x: x[1])
    
    # Normalize confidence to 0-1 range
    max_possible_score = 12.0  # Maximum possible score from all factors
    confidence = min(score / max_possible_score, 1.0)
    
    if recommended_task.tags is None:
        recommended_task.tags = []
    
    return TaskWithAIRecommendation(
        **recommended_task.__dict__,
        ai_confidence=confidence
    )
