from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any, Dict, Optional
import json
import logging
import re
from uuid import UUID

logger = logging.getLogger(__name__)

from ..database import get_db, get_fresh_db
from ..models.goal import Goal, Metric
from ..models.task import Task
from ..schemas.goal import GoalCreate, GoalUpdate, Goal as GoalSchema, MetricCreate, Metric as MetricSchema
from ..schemas.task import TaskCreate, Task as TaskSchema
from ..auth import get_current_user, User
from ..core.utils import compare_user_ids

router = APIRouter(
    prefix="/goals",
    tags=["goals"]
)

def prepare_metric_for_response(metric: Metric) -> Dict[str, Any]:
    """Convert metric data for frontend response"""
    # Parse contributions list
    try:
        if isinstance(metric.contributions_list, str) and metric.contributions_list:
            contributions = json.loads(metric.contributions_list)
        elif isinstance(metric.contributions_list, list):
            contributions = metric.contributions_list
        else:
            contributions = []
    except (json.JSONDecodeError, TypeError):
        logger.warning(f"Invalid contributions_list for metric {metric.id}: {metric.contributions_list}")
        contributions = []
    
    # Calculate current value from all contributions
    current_value = sum(float(c["value"]) for c in contributions) if contributions else 0.0
    
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
        "contributions_list": json.dumps(contributions)  # Always store as JSON string
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
        # Convert UUID to string if needed
        user_id = goal.user_id
        if hasattr(user_id, 'hex'):  # Check if it's a UUID object
            user_id = str(user_id)
        
        # Create a dictionary representation of the goal with minimal info first
        goal_dict = {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
            "priority": goal.priority,
            "created_at": goal.created_at,
            "updated_at": goal.updated_at,
            "user_id": user_id,
            "parent_id": goal.parent_id,
            "current_strategy_id": goal.current_strategy_id,
            "tasks": [],
            "metrics": [],
            "experiences": [],
            "strategies": [],
            "conversations": [],
            "subgoals": []
        }
        
        # Now try to add related objects one by one, using direct queries instead of relationships
        # This avoids issues with schema mismatches
        try:
            fresh_db = get_fresh_db()
            tasks = fresh_db.query(Task).filter(Task.goal_id == goal.id).all()
            # Convert tasks to dictionaries with safe priority handling
            task_dicts = []
            for task in tasks:
                try:
                    task_dict = {
                        "id": task.id,
                        "title": task.title,
                        "description": task.description,
                        "completed": task.completed,
                        "priority": task.priority_safe,  # Use our safe property
                        "due_date": task.due_date,
                        "created_at": task.created_at,
                        "updated_at": task.updated_at,
                        "user_id": task.user_id,
                        "parent_id": task.parent_id,
                        "estimated_minutes": task.estimated_minutes,
                        "goal_id": task.goal_id,
                        "metric_id": task.metric_id,
                        "contribution_value": getattr(task, "contribution_value", None),
                        "completion_time": getattr(task, "completion_time", None),
                        "completion_order": getattr(task, "completion_order", None),
                        "tags": getattr(task, "tags", None)
                    }
                    task_dicts.append(task_dict)
                except Exception as e:
                    logger.error(f"Error processing task {task.id}: {str(e)}")
            goal_dict["tasks"] = task_dicts
            fresh_db.close()
        except Exception as e:
            logger.error(f"Error getting tasks for goal {goal.id}: {str(e)}")
        
        try:
            fresh_db = get_fresh_db()
            metrics = fresh_db.query(Metric).filter(Metric.goal_id == goal.id).all()
            # Convert metrics to dictionaries
            metric_dicts = []
            for metric in metrics:
                try:
                    metric_dict = prepare_metric_for_response(metric)
                    metric_dicts.append(metric_dict)
                except Exception as e:
                    logger.error(f"Error processing metric {metric.id}: {str(e)}")
            goal_dict["metrics"] = metric_dicts
            fresh_db.close()
        except Exception as e:
            logger.error(f"Error getting metrics for goal {goal.id}: {str(e)}")
        
        # Skip experiences, strategies, and conversations if they have schema issues
        # We'll just return empty lists for these
        
        try:
            fresh_db = get_fresh_db()
            subgoals = fresh_db.query(Goal).filter(Goal.parent_id == goal.id).all()
            # Process each subgoal to ensure it's properly formatted
            subgoal_dicts = []
            for subgoal in subgoals:
                try:
                    # Create a minimal subgoal dict
                    subgoal_dict = {
                        "id": subgoal.id,
                        "title": subgoal.title,
                        "description": subgoal.description,
                        "priority": subgoal.priority,
                        "created_at": subgoal.created_at,
                        "updated_at": subgoal.updated_at,
                        "user_id": str(subgoal.user_id) if hasattr(subgoal.user_id, 'hex') else subgoal.user_id,
                        "parent_id": subgoal.parent_id,
                        "current_strategy_id": subgoal.current_strategy_id
                    }
                    subgoal_dicts.append(subgoal_dict)
                except Exception as e:
                    logger.error(f"Error processing subgoal {subgoal.id}: {str(e)}")
            goal_dict["subgoals"] = subgoal_dicts
            fresh_db.close()
        except Exception as e:
            logger.error(f"Error getting subgoals for goal {goal.id}: {str(e)}")
        
        return goal_dict
    except Exception as e:
        logger.error(f"Error preparing goal {goal.id} for response: {str(e)}")
        # Return a minimal goal object
        user_id = goal.user_id
        if hasattr(user_id, 'hex'):  # Check if it's a UUID object
            user_id = str(user_id)
            
        return {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
            "priority": goal.priority,
            "created_at": goal.created_at,
            "updated_at": goal.updated_at,
            "user_id": user_id,
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all goals for the current user"""
    try:
        logger.info(f"Getting goals for user: {current_user.id}, type: {type(current_user.id)}")
        
        goals = (
            db.query(Goal)
            .filter(Goal.user_id == current_user.id)
            .order_by(Goal.created_at.desc())
            .all()
        )
        
        logger.info(f"Found {len(goals)} goals for user {current_user.id}")
        
        # Convert goals to dictionaries to avoid detached instance errors
        goal_dicts = []
        for goal in goals:
            goal_dict = prepare_goal_for_response(goal)
            goal_dicts.append(goal_dict)
        
        return goal_dicts
    except Exception as e:
        logger.error(f"Error getting goals: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting goals: {str(e)}")

@router.post("/", response_model=GoalSchema)
async def create_goal(
    goal_create: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new goal"""
    try:
        # Check if parent_id exists and belongs to the user if provided
        if goal_create.parent_id:
            parent_goal = db.query(Goal).filter(Goal.id == goal_create.parent_id).first()
            if not parent_goal:
                raise HTTPException(status_code=404, detail="Parent goal not found")
            
            if str(parent_goal.user_id) != str(current_user.id):
                raise HTTPException(status_code=403, detail="Not authorized to use this parent goal")
        
        # Create new goal
        new_goal = Goal(
            title=goal_create.title,
            description=goal_create.description,
            priority=goal_create.priority,
            user_id=current_user.id,
            parent_id=goal_create.parent_id,
            current_strategy_id=goal_create.current_strategy_id
        )
        
        db.add(new_goal)
        db.commit()
        db.refresh(new_goal)
        
        # Convert goal to dictionary to avoid detached instance errors
        goal_dict = prepare_goal_for_response(new_goal)
        
        return goal_dict
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating goal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating goal: {str(e)}")

@router.get("/{goal_id}", response_model=GoalSchema)
async def read_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific goal by ID"""
    try:
        logger.info(f"Reading goal with ID: {goal_id}")
        
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            logger.warning(f"Goal not found: {goal_id}")
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Create a consolidated debug message with all critical information
        debug_msg = f"""
===== GOAL AUTH DEBUG FOR GOAL {goal_id} =====
GOAL TITLE: {goal.title}
GOAL USER_ID (RAW): {goal.user_id} ({type(goal.user_id)})
CURRENT USER ID (RAW): {current_user.id} ({type(current_user.id)})
NORMALIZED GOAL USER_ID: {re.sub(r'[^a-zA-Z0-9]', '', str(goal.user_id)).lower()}
NORMALIZED USER ID: {re.sub(r'[^a-zA-Z0-9]', '', str(current_user.id)).lower()}
COMPARISON RESULT: {re.sub(r'[^a-zA-Z0-9]', '', str(goal.user_id)).lower() == re.sub(r'[^a-zA-Z0-9]', '', str(current_user.id)).lower()}
=============================================
"""
        # Log this as ERROR to ensure it shows up in production logs
        logger.error(debug_msg)
        
        # Try to convert both IDs to UUID objects for comparison
        try:
            goal_uuid = UUID(str(goal.user_id)) if not isinstance(goal.user_id, UUID) else goal.user_id
            user_uuid = UUID(str(current_user.id)) if not isinstance(current_user.id, UUID) else current_user.id
            
            # Non-hyphenated comparison
            clean_goal_id = re.sub(r'[^a-zA-Z0-9]', '', str(goal_uuid)).lower()
            clean_user_id = re.sub(r'[^a-zA-Z0-9]', '', str(user_uuid)).lower()
            
            # Compare using clean UUIDs without hyphens
            if clean_goal_id != clean_user_id:
                error_msg = f"Authorization failed (UUID comparison): Goal User '{goal_uuid}' vs Current User '{user_uuid}'"
                logger.error(error_msg)
                
                # Include debug info in the error response
                debug_info = {
                    "detail": "Not authorized to access this goal",
                    "debug": {
                        "goal_id": goal_id,
                        "goal_title": goal.title,
                        "goal_user_id": str(goal.user_id),
                        "goal_user_id_type": str(type(goal.user_id)),
                        "current_user_id": str(current_user.id),
                        "current_user_id_type": str(type(current_user.id)),
                        "normalized_goal_id": clean_goal_id,
                        "normalized_user_id": clean_user_id,
                        "comparison_result": clean_goal_id == clean_user_id
                    }
                }
                raise HTTPException(status_code=403, detail=debug_info)
        except ValueError as e:
            # If conversion to UUID fails, fall back to string comparison
            logger.warning(f"UUID conversion failed: {e}, falling back to string comparison")
            
            # Try different string comparison methods
            goal_id_str = re.sub(r'[^a-zA-Z0-9]', '', str(goal.user_id)).lower()
            user_id_str = re.sub(r'[^a-zA-Z0-9]', '', str(current_user.id)).lower()
            
            logger.info(f"Normalized goal_id_str: '{goal_id_str}'")
            logger.info(f"Normalized user_id_str: '{user_id_str}'")
            
            if goal_id_str != user_id_str:
                error_msg = f"Authorization failed (string comparison): Goal User '{goal_id_str}' vs Current User '{user_id_str}'"
                logger.error(error_msg)
                
                # Include debug info in the error response
                debug_info = {
                    "detail": "Not authorized to access this goal",
                    "debug": {
                        "goal_id": goal_id,
                        "goal_title": goal.title,
                        "goal_user_id": str(goal.user_id),
                        "goal_user_id_type": str(type(goal.user_id)),
                        "current_user_id": str(current_user.id),
                        "current_user_id_type": str(type(current_user.id)),
                        "normalized_goal_id": goal_id_str,
                        "normalized_user_id": user_id_str,
                        "comparison_result": goal_id_str == user_id_str
                    }
                }
                raise HTTPException(status_code=403, detail=debug_info)
        
        # Convert goal to dictionary to avoid detached instance errors
        goal_dict = prepare_goal_for_response(goal)
        
        return goal_dict
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Error reading goal {goal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reading goal: {str(e)}")

@router.put("/{goal_id}", response_model=GoalSchema)
async def update_goal(
    goal_id: int,
    goal_update: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a goal"""
    try:
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the user has permission to update this goal
        if isinstance(goal.user_id, UUID) and isinstance(current_user.id, UUID):
            if goal.user_id != current_user.id:
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to update this goal")
        else:
            if str(goal.user_id) != str(current_user.id):
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to update this goal")
        
        # Update goal fields
        for field, value in goal_update.dict(exclude_unset=True).items():
            setattr(goal, field, value)
        
        db.commit()
        db.refresh(goal)
        
        # Convert goal to dictionary to avoid detached instance errors
        goal_dict = prepare_goal_for_response(goal)
        
        return goal_dict
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating goal {goal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating goal: {str(e)}")

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a goal"""
    try:
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the user has permission to delete this goal
        if isinstance(goal.user_id, UUID) and isinstance(current_user.id, UUID):
            if goal.user_id != current_user.id:
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
        else:
            if str(goal.user_id) != str(current_user.id):
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
        
        # Delete the goal
        db.delete(goal)
        db.commit()
        
        return {"message": "Goal deleted successfully"}
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting goal {goal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting goal: {str(e)}")

@router.get("/{goal_id}/tasks", response_model=List[TaskSchema])
async def get_goal_tasks(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tasks for a specific goal"""
    try:
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the user has permission to access this goal
        if isinstance(goal.user_id, UUID) and isinstance(current_user.id, UUID):
            if goal.user_id != current_user.id:
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to access this goal")
        else:
            if str(goal.user_id) != str(current_user.id):
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to access this goal")
        
        # Get tasks for the goal
        tasks = db.query(Task).filter(Task.goal_id == goal_id).all()
        
        # Convert tasks to dictionaries to avoid detached instance errors
        task_dicts = []
        for task in tasks:
            task_dict = {
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority_safe,
                "due_date": task.due_date,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "goal_id": task.goal_id,
                "user_id": task.user_id
            }
            task_dicts.append(task_dict)
        
        return task_dicts
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        logger.error(f"Error getting tasks for goal {goal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting tasks: {str(e)}")

@router.post("/{goal_id}/tasks", response_model=TaskSchema)
async def create_goal_task(
    goal_id: int,
    task_create: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task for a specific goal"""
    try:
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the user has permission to access this goal
        if isinstance(goal.user_id, UUID) and isinstance(current_user.id, UUID):
            if goal.user_id != current_user.id:
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to access this goal")
        else:
            if str(goal.user_id) != str(current_user.id):
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to access this goal")
        
        # Create new task
        new_task = Task(
            title=task_create.title,
            description=task_create.description,
            status=task_create.status,
            priority=task_create.priority,
            due_date=task_create.due_date,
            goal_id=goal_id,
            user_id=current_user.id
        )
        
        db.add(new_task)
        db.commit()
        db.refresh(new_task)
        
        # Convert task to dictionary to avoid detached instance errors
        task_dict = {
            "id": new_task.id,
            "title": new_task.title,
            "description": new_task.description,
            "status": new_task.status,
            "priority": new_task.priority_safe,
            "due_date": new_task.due_date,
            "created_at": new_task.created_at,
            "updated_at": new_task.updated_at,
            "goal_id": new_task.goal_id,
            "user_id": new_task.user_id
        }
        
        return task_dict
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating task for goal {goal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating task: {str(e)}")

@router.post("/{goal_id}/metrics", response_model=MetricSchema)
async def create_metric(
    goal_id: int,
    metric_create: MetricCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new metric for a specific goal"""
    try:
        goal = db.query(Goal).filter(Goal.id == goal_id).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        # Check if the user has permission to access this goal
        if isinstance(goal.user_id, UUID) and isinstance(current_user.id, UUID):
            if goal.user_id != current_user.id:
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to access this goal")
        else:
            if str(goal.user_id) != str(current_user.id):
                logger.error(f"Authorization failed: Goal User {goal.user_id} vs Current User {current_user.id}")
                raise HTTPException(status_code=403, detail="Not authorized to access this goal")
        
        # Create new metric
        new_metric = Metric(
            name=metric_create.name,
            description=metric_create.description,
            target_value=metric_create.target_value,
            current_value=metric_create.current_value,
            goal_id=goal_id,
            user_id=current_user.id
        )
        
        db.add(new_metric)
        db.commit()
        db.refresh(new_metric)
        
        # Convert metric to dictionary to avoid detached instance errors
        metric_dict = {
            "id": new_metric.id,
            "name": new_metric.name,
            "description": new_metric.description,
            "target_value": new_metric.target_value,
            "current_value": new_metric.current_value,
            "created_at": new_metric.created_at,
            "updated_at": new_metric.updated_at,
            "goal_id": new_metric.goal_id,
            "user_id": new_metric.user_id
        }
        
        return metric_dict
    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating metric for goal {goal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating metric: {str(e)}")
