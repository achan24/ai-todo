from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any, Dict
import json

from ..database import get_db
from ..models.goal import Goal, Metric
from ..models.task import Task
from ..schemas.goal import GoalCreate, GoalUpdate, Goal as GoalSchema, MetricCreate, Metric as MetricSchema
from ..schemas.task import TaskCreate, Task as TaskSchema
from ..auth import get_current_user, User

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
    for subgoal in goal.subgoals:
        prepare_goal_for_response(subgoal)
    return goal

@router.get("/", response_model=List[GoalSchema])
async def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get all goals for the current user with their subgoals"""
    # Get all goals for the current user
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == current_user.id)
        .order_by(Goal.created_at.desc())
        .all()
    )
    
    # Prepare metrics for response
    for goal in goals:
        goal = prepare_goal_for_response(goal)
    
    # Return only top-level goals (those without parents)
    return [goal for goal in goals if goal.parent_id is None]

@router.post("/", response_model=GoalSchema, status_code=201)
async def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
        user_id=current_user.id
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.get("/{goal_id}", response_model=GoalSchema)
async def read_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific goal by ID"""
    # Get the goal
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Check if the goal belongs to the current user
    if str(goal.user_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this goal")
    
    # Prepare metrics for response
    goal = prepare_goal_for_response(goal)
    
    return goal

@router.put("/{goal_id}", response_model=GoalSchema)
async def update_goal(
    goal_id: int,
    goal_update: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a goal"""
    # Get the goal
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Check if the goal belongs to the current user
    if str(goal.user_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this goal")
    
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
        goal.title = goal_update.title
    if goal_update.description is not None:
        goal.description = goal_update.description
    if goal_update.parent_id is not None:
        goal.parent_id = goal_update.parent_id
    if goal_update.current_strategy_id is not None:
        goal.current_strategy_id = goal_update.current_strategy_id
    if goal_update.priority is not None:
        goal.priority = goal_update.priority

    db.commit()
    db.refresh(goal)
    goal = prepare_goal_for_response(goal)
    return goal

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a goal"""
    # Get the goal
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Check if the goal belongs to the current user
    if str(goal.user_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
    
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}

@router.get("/{goal_id}/tasks", response_model=List[TaskSchema])
async def get_goal_tasks(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tasks for a specific goal"""
    # Get the goal
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Check if the goal belongs to the current user
    if str(goal.user_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this goal")
    
    # Get all tasks for the goal
    tasks = db.query(Task).filter(Task.goal_id == goal_id).all()
    return tasks

@router.post("/{goal_id}/tasks", response_model=TaskSchema)
async def create_goal_task(
    goal_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new task for a goal"""
    # Get the goal
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Check if the goal belongs to the current user
    if str(goal.user_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create tasks for this goal")
    
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
        user_id=current_user.id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

@router.post("/{goal_id}/metrics", response_model=MetricSchema)
async def create_metric(
    goal_id: int,
    metric: MetricCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new metric for a goal"""
    # Get the goal
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Check if the goal belongs to the current user
    if str(goal.user_id) != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create metrics for this goal")

    db_goal = goal
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
