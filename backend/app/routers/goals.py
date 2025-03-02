from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any, Dict
import json
import logging

logger = logging.getLogger(__name__)

from ..database import get_db
from ..models.goal import Goal, Metric
from ..models.task import Task
from ..schemas.goal import GoalCreate, GoalUpdate, Goal as GoalSchema, MetricCreate, Metric as MetricSchema
from ..schemas.task import TaskCreate, Task as TaskSchema
from ..core.supabase_auth import get_current_user

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
    """Safely prepare a goal for response, handling any related object errors"""
    try:
        # Access related objects safely
        tasks = []
        try:
            tasks = goal.tasks
        except Exception as e:
            logger.error(f"Error getting tasks for goal {goal.id}: {str(e)}")
        
        metrics = []
        try:
            metrics = goal.metrics
        except Exception as e:
            logger.error(f"Error getting metrics for goal {goal.id}: {str(e)}")
        
        experiences = []
        try:
            experiences = goal.experiences
        except Exception as e:
            logger.error(f"Error getting experiences for goal {goal.id}: {str(e)}")
        
        strategies = []
        try:
            strategies = goal.strategies
        except Exception as e:
            logger.error(f"Error getting strategies for goal {goal.id}: {str(e)}")
        
        conversations = []
        try:
            conversations = goal.conversations
        except Exception as e:
            logger.error(f"Error getting conversations for goal {goal.id}: {str(e)}")
        
        subgoals = []
        try:
            subgoals = goal.subgoals
        except Exception as e:
            logger.error(f"Error getting subgoals for goal {goal.id}: {str(e)}")
        
        # Create a dictionary representation of the goal
        goal_dict = {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
            "priority": goal.priority,
            "created_at": goal.created_at,
            "updated_at": goal.updated_at,
            "user_id": goal.user_id,
            "parent_id": goal.parent_id,
            "current_strategy_id": goal.current_strategy_id,
            "tasks": tasks,
            "metrics": metrics,
            "experiences": experiences,
            "strategies": strategies,
            "conversations": conversations,
            "subgoals": subgoals
        }
        
        return goal_dict
    except Exception as e:
        logger.error(f"Error preparing goal {goal.id} for response: {str(e)}")
        # Return a minimal goal object
        return {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
            "priority": goal.priority,
            "created_at": goal.created_at,
            "updated_at": goal.updated_at,
            "user_id": goal.user_id,
            "parent_id": goal.parent_id,
            "current_strategy_id": goal.current_strategy_id,
            "tasks": [],
            "metrics": [],
            "experiences": [],
            "strategies": [],
            "conversations": [],
            "subgoals": []
        }

@router.get("/", response_model=List[GoalSchema])
async def get_goals(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get all goals for the current user with their subgoals"""
    try:
        # Get all goals for the current user
        goals = (
            db.query(Goal)
            .filter(Goal.user_id == current_user)
            .order_by(Goal.created_at.desc())
            .all()
        )
        
        # Prepare goals for response
        prepared_goals = []
        for goal in goals:
            try:
                prepared_goal = prepare_goal_for_response(goal)
                prepared_goals.append(prepared_goal)
            except Exception as e:
                logger.error(f"Error preparing goal {goal.id}: {str(e)}")
                # Skip this goal if there's an error
                continue
        
        return prepared_goals
    except Exception as e:
        # Rollback the transaction in case of error
        db.rollback()
        logger.error(f"Error in get_goals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/", response_model=GoalSchema, status_code=201)
async def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Create a new goal"""
    try:
        # If parent_id is provided, verify it exists
        if goal.parent_id:
            parent = db.query(Goal).filter(Goal.id == goal.parent_id).first()
            if not parent:
                raise HTTPException(status_code=404, detail="Parent goal not found")
            if parent.user_id != current_user:
                raise HTTPException(status_code=403, detail="Not authorized to create subgoals for this parent")
        
        # Create the goal
        db_goal = Goal(
            title=goal.title,
            description=goal.description,
            parent_id=goal.parent_id,
            user_id=current_user
        )
        db.add(db_goal)
        db.commit()
        db.refresh(db_goal)
        
        return prepare_goal_for_response(db_goal)
    except Exception as e:
        db.rollback()
        logger.error(f"Error in create_goal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{goal_id}", response_model=GoalSchema)
async def read_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get a specific goal by ID"""
    try:
        # Get the goal
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the goal belongs to the current user
        if goal.user_id != current_user:
            raise HTTPException(status_code=403, detail="Not authorized to access this goal")
        
        # Prepare metrics for response
        goal = prepare_goal_for_response(goal)
        return goal
    except Exception as e:
        # Rollback the transaction in case of error
        db.rollback()
        logger.error(f"Error in read_goal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{goal_id}", response_model=GoalSchema)
async def update_goal(
    goal_id: int,
    goal_update: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Update a goal"""
    try:
        # Get the goal
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the goal belongs to the current user
        if goal.user_id != current_user:
            raise HTTPException(status_code=403, detail="Not authorized to update this goal")
        
        # Prevent circular references
        if goal_update.parent_id and goal_update.parent_id == goal_id:
            raise HTTPException(status_code=400, detail="A goal cannot be its own parent")
        
        # If parent_id is being updated, check if it exists and belongs to the user
        if goal_update.parent_id is not None and goal_update.parent_id != goal.parent_id:
            # Check if the new parent exists and belongs to the user
            parent = db.query(Goal).filter(Goal.id == goal_update.parent_id).first()
            if not parent:
                raise HTTPException(status_code=404, detail="Parent goal not found")
            if parent.user_id != current_user:
                raise HTTPException(status_code=403, detail="Not authorized to use this parent goal")
            
            # Check for circular references in the hierarchy
            current_parent = parent
            while current_parent and current_parent.parent_id:
                if current_parent.parent_id == goal_id:
                    raise HTTPException(status_code=400, detail="Circular reference detected in goal hierarchy")
                current_parent = db.query(Goal).filter(Goal.id == current_parent.parent_id).first()
        
        # Update the goal
        if goal_update.title is not None:
            goal.title = goal_update.title
        if goal_update.description is not None:
            goal.description = goal_update.description
        if goal_update.priority is not None:
            goal.priority = goal_update.priority
        if goal_update.parent_id is not None:
            goal.parent_id = goal_update.parent_id
        if goal_update.current_strategy_id is not None:
            goal.current_strategy_id = goal_update.current_strategy_id
        
        db.commit()
        db.refresh(goal)
        
        return prepare_goal_for_response(goal)
    except Exception as e:
        db.rollback()
        logger.error(f"Error in update_goal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Delete a goal"""
    try:
        # Get the goal
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the goal belongs to the current user
        if goal.user_id != current_user:
            raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
        
        db.delete(goal)
        db.commit()
        
        return {"message": "Goal deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error in delete_goal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{goal_id}/tasks", response_model=List[TaskSchema])
async def get_goal_tasks(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get all tasks for a specific goal"""
    try:
        # Get the goal
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the goal belongs to the current user
        if goal.user_id != current_user:
            raise HTTPException(status_code=403, detail="Not authorized to access this goal")
        
        # Get all tasks for the goal
        tasks = db.query(Task).filter(Task.goal_id == goal_id).all()
        return tasks
    except Exception as e:
        db.rollback()
        logger.error(f"Error in get_goal_tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{goal_id}/tasks", response_model=TaskSchema)
async def create_goal_task(
    goal_id: int,
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Create a new task for a goal"""
    try:
        # Get the goal
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the goal belongs to the current user
        if goal.user_id != current_user:
            raise HTTPException(status_code=403, detail="Not authorized to create tasks for this goal")
        
        # If parent_id is provided, verify it exists
        if task.parent_id:
            parent_task = db.query(Task).filter(Task.id == task.parent_id).first()
            if not parent_task:
                raise HTTPException(status_code=404, detail="Parent task not found")
        
        # Create the task
        db_task = Task(
            title=task.title,
            description=task.description,
            priority=task.priority,
            parent_id=task.parent_id,
            estimated_minutes=task.estimated_minutes,
            goal_id=goal_id,
            user_id=current_user
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
        
        return db_task
    except Exception as e:
        db.rollback()
        logger.error(f"Error in create_goal_task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/{goal_id}/metrics", response_model=MetricSchema)
async def create_metric(
    goal_id: int,
    metric: MetricCreate,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Create a new metric for a goal"""
    try:
        # Get the goal
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the goal belongs to the current user
        if goal.user_id != current_user:
            raise HTTPException(status_code=403, detail="Not authorized to create metrics for this goal")

        # Create the metric
        db_metric = Metric(**metric.dict())
        db_metric.goal_id = goal_id
        
        db.add(db_metric)
        db.commit()
        db.refresh(db_metric)
        
        return db_metric
    except Exception as e:
        db.rollback()
        logger.error(f"Error in create_metric: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
