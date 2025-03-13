from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any, Dict
import json
import uuid

from ..database import get_db
from ..models.goal import Goal, Metric, GoalTarget
from ..models.task import Task
from ..schemas.goal import (
    GoalCreate, GoalUpdate, Goal as GoalSchema, 
    MetricCreate, Metric as MetricSchema,
    GoalTargetCreate, GoalTargetUpdate, GoalTarget as GoalTargetSchema
)
from ..schemas.task import TaskCreate, Task as TaskSchema
from ..services.task_service import process_task_fields

router = APIRouter(
    prefix="/goals",
    tags=["goals"]
)

def prepare_metric_for_response(metric: Metric) -> Dict[str, Any]:
    """Convert metric data for frontend response"""
    # Parse contributions list
    contributions = json.loads(metric.contributions_list) if isinstance(metric.contributions_list, str) else (metric.contributions_list or [])
    
    # Calculate current value from all contributions
    current_value = sum(float(c["value"]) for c in contributions)
    
    data = {
        "id": metric.id,
        "name": metric.name,
        "description": metric.description,
        "type": metric.type,
        "unit": metric.unit,
        "target_value": metric.target_value,
        "current_value": current_value,  # Use calculated value instead of stored value
        "goal_id": metric.goal_id,
        "created_at": metric.created_at,
        "updated_at": metric.updated_at,
        "contributions_list": json.dumps(contributions)
    }
    return data

def prepare_metrics_for_response(metrics):
    """Helper function to prepare metrics for response"""
    for metric in metrics:
        # Ensure contributions_list is a string
        if isinstance(metric.contributions_list, list):
            metric.contributions_list = json.dumps(metric.contributions_list)
        elif metric.contributions_list is None:
            metric.contributions_list = '[]'
    return metrics

def prepare_goal_for_response(goal):
    """Recursively prepare all metrics in a goal and its subgoals"""
    if goal.metrics:
        goal.metrics = prepare_metrics_for_response(goal.metrics)
    
    # Process all tasks in the goal
    if goal.tasks:
        for task in goal.tasks:
            process_task_fields(task)
    
    # Process targets in the goal (ensure notes is properly formatted)
    if goal.targets:
        for target in goal.targets:
            if isinstance(target.notes, list):
                target.notes = json.dumps(target.notes)
            elif target.notes is None:
                target.notes = '[]'
    
    # Process subgoals recursively
    for subgoal in goal.subgoals:
        # Process metrics in subgoal
        if subgoal.metrics:
            subgoal.metrics = prepare_metrics_for_response(subgoal.metrics)
        
        # Process tasks in subgoal
        if subgoal.tasks:
            for task in subgoal.tasks:
                process_task_fields(task)
        
        # Process targets in subgoal
        if subgoal.targets:
            for target in subgoal.targets:
                if isinstance(target.notes, list):
                    target.notes = json.dumps(target.notes)
                elif target.notes is None:
                    target.notes = '[]'
        
        # Continue recursion for deeper subgoals
        prepare_goal_for_response(subgoal)
    
    return goal

def process_task_and_subtasks(task):
    """Recursively process a task and all its subtasks to ensure fields are initialized"""
    # Ensure is_starred is initialized
    if not hasattr(task, 'is_starred') or task.is_starred is None:
        task.is_starred = False
    
    # Ensure scheduled_time is initialized (can be None)
    if not hasattr(task, 'scheduled_time'):
        task.scheduled_time = None
    
    # Process subtasks recursively
    if hasattr(task, 'subtasks') and task.subtasks:
        for subtask in task.subtasks:
            process_task_and_subtasks(subtask)

@router.get("/", response_model=List[GoalSchema])
async def get_goals(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """Get all goals for the current user with their subgoals"""
    # Get all goals for the current user
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == 1)
        .order_by(Goal.created_at.desc())
        .all()
    )
    
    # Prepare metrics for response
    for goal in goals:
        goal = prepare_goal_for_response(goal)
    
    # Return only top-level goals (those without parents)
    return [goal for goal in goals if goal.parent_id is None]

@router.post("/", response_model=GoalSchema)
async def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db)
):
    """Create a new goal"""
    # If parent_id is provided, verify it exists
    if goal.parent_id:
        parent_goal = db.query(Goal).filter(Goal.id == goal.parent_id).first()
        if not parent_goal:
            raise HTTPException(status_code=404, detail="Parent goal not found")

    db_goal = Goal(
        title=goal.title,
        description=goal.description,
        parent_id=goal.parent_id,
        user_id=1  # Hardcode user_id as 1 for now
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.get("/{goal_id}", response_model=GoalSchema)
async def read_goal(
    goal_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific goal by ID"""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    # Recursively prepare all metrics in the goal tree
    goal = prepare_goal_for_response(goal)
    return goal

@router.put("/{goal_id}", response_model=GoalSchema)
async def update_goal(
    goal_id: int,
    goal_update: GoalUpdate,
    db: Session = Depends(get_db)
):
    """Update a goal"""
    db_goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if db_goal is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Prevent circular references
    if goal_update.parent_id:
        if goal_update.parent_id == goal_id:
            raise HTTPException(status_code=400, detail="Goal cannot be its own parent")
        
        # Check if the new parent is a descendant of this goal
        def is_descendant(parent_id: int, target_id: int) -> bool:
            parent = db.query(Goal).filter(Goal.id == parent_id).first()
            if not parent:
                return False
            if parent.parent_id == target_id:
                return True
            if parent.parent_id:
                return is_descendant(parent.parent_id, target_id)
            return False
        
        if is_descendant(goal_update.parent_id, goal_id):
            raise HTTPException(status_code=400, detail="Cannot move goal under its own descendant")

    # Update goal fields
    if goal_update.title is not None:
        db_goal.title = goal_update.title
    if goal_update.description is not None:
        db_goal.description = goal_update.description
    if goal_update.parent_id is not None:
        db_goal.parent_id = goal_update.parent_id
    if goal_update.current_strategy_id is not None:
        db_goal.current_strategy_id = goal_update.current_strategy_id
    if goal_update.priority is not None:
        db_goal.priority = goal_update.priority

    db.commit()
    db.refresh(db_goal)
    goal = prepare_goal_for_response(db_goal)
    return goal

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
    
    tasks = db.query(Task).filter(Task.goal_id == goal_id).all()
    
    # Process all tasks to ensure fields are properly initialized
    for task in tasks:
        process_task_fields(task)
    
    return tasks

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
    
    # If parent_id is provided, verify it exists
    if task.parent_id:
        parent_task = db.query(Task).filter(Task.id == task.parent_id).first()
        if not parent_task:
            raise HTTPException(status_code=404, detail="Parent task not found")
    
    db_task = Task(
        title=task.title,
        description=task.description,
        priority=task.priority,
        due_date=task.due_date,
        tags=task.tags,
        parent_id=task.parent_id,
        estimated_minutes=task.estimated_minutes,
        goal_id=goal_id,
        user_id=1,  # Hardcoded for now
        is_starred=task.is_starred,
        scheduled_time=task.scheduled_time
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.post("/{goal_id}/metrics", response_model=MetricSchema)
async def create_metric(
    goal_id: int,
    metric: MetricCreate,
    db: Session = Depends(get_db)
):
    """Create a new metric for a goal"""
    db_goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Create the metric
    db_metric = Metric(**metric.dict())
    db_metric.goal_id = goal_id
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)

    # Find all completed tasks that contribute to this metric
    completed_tasks = db.query(Task).filter(
        Task.goal_id == goal_id,
        Task.metric_id == None,  # Tasks not yet assigned to any metric
        Task.completed == True,
        Task.completion_time.isnot(None),
        Task.contribution_value.isnot(None)
    ).all()

    # Add contributions from completed tasks
    contributions = []
    for task in completed_tasks:
        if task.contribution_value:
            # Update task to point to this metric
            task.metric_id = db_metric.id
            db.add(task)
            
            # Add contribution
            contributions.append({
                "value": float(task.contribution_value),
                "task_id": task.id,
                "timestamp": task.completion_time.isoformat()
            })

    if contributions:
        db_metric.contributions_list = json.dumps(contributions)
        db_metric.current_value = sum(float(c["value"]) for c in contributions)
        db.add(db_metric)
        db.commit()
        db.refresh(db_metric)

    return db_metric

@router.get("/{goal_id}/targets", response_model=List[GoalTargetSchema])
async def get_goal_targets(
    goal_id: int,
    db: Session = Depends(get_db)
):
    """Get all targets for a specific goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    targets = db.query(GoalTarget).filter(GoalTarget.goal_id == goal_id).all()
    
    # Ensure notes field is properly formatted
    for target in targets:
        if isinstance(target.notes, list):
            target.notes = json.dumps(target.notes)
        elif target.notes is None:
            target.notes = '[]'
    
    return targets

@router.post("/{goal_id}/targets", response_model=GoalTargetSchema)
async def create_goal_target(
    goal_id: int,
    target: GoalTargetCreate,
    db: Session = Depends(get_db)
):
    """Create a new target for a goal"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Generate a unique ID for the target
    target_id = str(uuid.uuid4())
    
    # Create the target
    db_target = GoalTarget(
        id=target_id,
        title=target.title,
        description=target.description,
        deadline=target.deadline,
        status=target.status,
        notes=target.notes,
        goal_id=goal_id
    )
    
    db.add(db_target)
    db.commit()
    db.refresh(db_target)
    
    # Ensure notes is properly formatted for response
    if isinstance(db_target.notes, list):
        db_target.notes = json.dumps(db_target.notes)
    elif db_target.notes is None:
        db_target.notes = '[]'
    
    return db_target

@router.get("/{goal_id}/targets/{target_id}", response_model=GoalTargetSchema)
async def get_goal_target(
    goal_id: int,
    target_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific target by ID"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    target = db.query(GoalTarget).filter(
        GoalTarget.id == target_id,
        GoalTarget.goal_id == goal_id
    ).first()
    
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    # Ensure notes is properly formatted for response
    if isinstance(target.notes, list):
        target.notes = json.dumps(target.notes)
    elif target.notes is None:
        target.notes = '[]'
    
    return target

@router.put("/{goal_id}/targets/{target_id}", response_model=GoalTargetSchema)
async def update_goal_target(
    goal_id: int,
    target_id: str,
    target_update: GoalTargetUpdate,
    db: Session = Depends(get_db)
):
    """Update a target"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db_target = db.query(GoalTarget).filter(
        GoalTarget.id == target_id,
        GoalTarget.goal_id == goal_id
    ).first()
    
    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    # Update target fields
    if target_update.title is not None:
        db_target.title = target_update.title
    if target_update.description is not None:
        db_target.description = target_update.description
    if target_update.deadline is not None:
        db_target.deadline = target_update.deadline
    if target_update.status is not None:
        db_target.status = target_update.status
    if target_update.notes is not None:
        db_target.notes = target_update.notes
    
    db.commit()
    db.refresh(db_target)
    
    # Ensure notes is properly formatted for response
    if isinstance(db_target.notes, list):
        db_target.notes = json.dumps(db_target.notes)
    elif db_target.notes is None:
        db_target.notes = '[]'
    
    return db_target

@router.delete("/{goal_id}/targets/{target_id}")
async def delete_goal_target(
    goal_id: int,
    target_id: str,
    db: Session = Depends(get_db)
):
    """Delete a target"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == 1).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db_target = db.query(GoalTarget).filter(
        GoalTarget.id == target_id,
        GoalTarget.goal_id == goal_id
    ).first()
    
    if not db_target:
        raise HTTPException(status_code=404, detail="Target not found")
    
    db.delete(db_target)
    db.commit()
    
    return {"message": "Target deleted successfully"}
