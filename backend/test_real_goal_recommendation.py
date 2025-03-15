#!/usr/bin/env python3
"""
Script to test the enhanced goal recommendation functionality with real data from the database
"""
import sys
import os
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db, SessionLocal
from app.services.ai_recommender_service import create_fallback_goal_recommendation, get_openrouter_goal_recommendation
from app.schemas.goal import Goal, GoalTarget, Metric
from app.schemas.task import Task
from app.routers.goals import read_goal, get_goal_targets
from sqlalchemy import text


def get_real_goals(limit: int = 20, include_subgoals: bool = True, specific_ids: List[int] = None) -> List[Goal]:
    """Get real goals from the database with all related data using direct SQL queries"""
    print(f"Fetching goals (limit: {limit}, include_subgoals: {include_subgoals}, specific_ids: {specific_ids})...")
    
    db = SessionLocal()
    try:
        # Query for parent goals (where parent_id is NULL or for specific parent_id)
        parent_condition = "parent_id IS NULL" if include_subgoals else "1=1"
        
        # Add specific IDs condition if provided
        id_condition = ""
        if specific_ids and len(specific_ids) > 0:
            id_list = ", ".join(str(id) for id in specific_ids)
            id_condition = f" AND id IN ({id_list})"
        
        # Query goals
        goals_result = db.execute(text(f"""
            SELECT id, title, description, priority, user_id, parent_id, 
                   created_at, updated_at, current_strategy_id
            FROM goals
            WHERE {parent_condition}{id_condition}
            LIMIT {limit}
        """))
        
        goals_data = []
        for row in goals_result:
            goal_dict = {
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "priority": row[3],
                "user_id": row[4],
                "parent_id": row[5],
                "created_at": row[6],
                "updated_at": row[7],
                "current_strategy_id": row[8],
                "tasks": [],
                "metrics": [],
                "targets": [],
                "subgoals": [],
                "experiences": [],
                "strategies": [],
                "conversations": []
            }
            
            # Query tasks for this goal
            tasks_result = db.execute(text(f"""
                SELECT id, title, description, priority, completed, due_date, 
                       created_at, updated_at, goal_id, parent_id, estimated_minutes,
                       tags, is_starred, has_reminders
                FROM tasks
                WHERE goal_id = {row[0]}
            """))
            
            for task_row in tasks_result:
                # Parse tags as JSON if it's a string, or use empty list as default
                tags_value = task_row[11]
                if isinstance(tags_value, str):
                    try:
                        import json
                        tags = json.loads(tags_value)
                    except (json.JSONDecodeError, TypeError):
                        tags = []
                else:
                    tags = [] if tags_value is None else tags_value
                
                task_dict = {
                    "id": task_row[0],
                    "title": task_row[1],
                    "description": task_row[2],
                    "priority": task_row[3],
                    "completed": bool(task_row[4]) if task_row[4] is not None else False,
                    "due_date": task_row[5],
                    "created_at": task_row[6],
                    "updated_at": task_row[7],
                    "goal_id": task_row[8],
                    "parent_id": task_row[9],
                    "estimated_minutes": task_row[10],
                    "tags": tags,
                    "is_starred": bool(task_row[12]) if task_row[12] is not None else False,
                    "has_reminders": bool(task_row[13]) if task_row[13] is not None else False
                }
                goal_dict["tasks"].append(task_dict)
            
            # Query metrics for this goal
            metrics_result = db.execute(text(f"""
                SELECT id, name, description, type, unit, target_value, current_value, 
                       contributions_list, created_at, updated_at, goal_id
                FROM metrics
                WHERE goal_id = {row[0]}
            """))
            
            for metric_row in metrics_result:
                metric_dict = {
                    "id": metric_row[0],
                    "name": metric_row[1],
                    "description": metric_row[2],
                    "type": metric_row[3],
                    "unit": metric_row[4],
                    "target_value": metric_row[5],
                    "current_value": metric_row[6],
                    "contributions_list": metric_row[7] or '[]',
                    "created_at": metric_row[8],
                    "updated_at": metric_row[9],
                    "goal_id": metric_row[10]
                }
                goal_dict["metrics"].append(metric_dict)
            
            # Query targets for this goal
            targets_result = db.execute(text(f"""
                SELECT gt.id, gt.title, gt.description, gt.deadline, gt.status, gt.notes, 
                       gt.created_at, gt.updated_at, gt.goal_id, gt.goaltarget_parent_id, gt.position
                FROM goal_targets gt
                WHERE gt.goal_id = {row[0]}
                ORDER BY gt.position
            """))
            
            target_rows = targets_result.fetchall()
            for target_row in target_rows:
                target_dict = {
                    "id": target_row[0],
                    "title": target_row[1],
                    "description": target_row[2],
                    "deadline": target_row[3],
                    "status": target_row[4],
                    "notes": target_row[5] or '[]',
                    "created_at": target_row[6],
                    "updated_at": target_row[7],
                    "goal_id": target_row[8],
                    "goaltarget_parent_id": target_row[9],
                    "position": target_row[10],
                    "children": []
                }
                goal_dict["targets"].append(target_dict)
            
            # Query subgoals for this goal
            subgoals_result = db.execute(text(f"""
                SELECT id, title, description, priority, user_id, parent_id, 
                       created_at, updated_at, current_strategy_id
                FROM goals
                WHERE parent_id = {row[0]}
            """))
            
            for subgoal_row in subgoals_result:
                subgoal_dict = {
                    "id": subgoal_row[0],
                    "title": subgoal_row[1],
                    "description": subgoal_row[2],
                    "priority": subgoal_row[3],
                    "user_id": subgoal_row[4],
                    "parent_id": subgoal_row[5],
                    "created_at": subgoal_row[6],
                    "updated_at": subgoal_row[7],
                    "current_strategy_id": subgoal_row[8],
                    "tasks": [],
                    "metrics": [],
                    "targets": [],
                    "subgoals": [],
                    "experiences": [],
                    "strategies": [],
                    "conversations": []
                }
                goal_dict["subgoals"].append(subgoal_dict)
            
            goals_data.append(goal_dict)
        
        # Print summary of goals found
        total_goals = len(goals_data)
        total_tasks = sum(len(g["tasks"]) for g in goals_data)
        total_targets = sum(len(g["targets"]) for g in goals_data)
        total_metrics = sum(len(g["metrics"]) for g in goals_data)
        total_subgoals = sum(len(g["subgoals"]) for g in goals_data)
        
        print(f"\nFound {total_goals} goals with {total_subgoals} subgoals, {total_tasks} tasks, {total_targets} targets, and {total_metrics} metrics")
        
        # Print basic info about the goals
        print("\nGoals found:")
        for goal in goals_data:
            print(f"- {goal['title']} (Priority: {goal['priority']}, Tasks: {len(goal['tasks'])}, Targets: {len(goal['targets'])}, Metrics: {len(goal['metrics'])})")
            
            # Print targets for this goal if any
            if goal['targets']:
                print("  Targets:")
                for target in goal['targets']:
                    deadline_str = ""
                    if target['deadline']:
                        deadline_date = datetime.fromisoformat(target['deadline'].replace('Z', '+00:00'))
                        days_remaining = (deadline_date - datetime.now()).days
                        deadline_str = f", {days_remaining} days remaining"
                    print(f"  - {target['title']}{deadline_str}")
        
        # Convert to Pydantic models
        pydantic_goals = []
        for goal_data in goals_data:
            # Convert tasks
            tasks = []
            for task_data in goal_data["tasks"]:
                # Parse tags as JSON if it's a string, or use empty list as default
                tags_value = task_data["tags"]
                if isinstance(tags_value, str):
                    try:
                        import json
                        tags = json.loads(tags_value)
                    except (json.JSONDecodeError, TypeError):
                        tags = []
                else:
                    tags = [] if tags_value is None else tags_value
                
                tasks.append(Task(**{
                    "id": task_data["id"],
                    "title": task_data["title"],
                    "description": task_data["description"],
                    "priority": task_data["priority"],
                    "completed": task_data["completed"],
                    "due_date": task_data["due_date"],
                    "created_at": task_data["created_at"],
                    "updated_at": task_data["updated_at"],
                    "goal_id": task_data["goal_id"],
                    "parent_id": task_data["parent_id"],
                    "estimated_minutes": task_data["estimated_minutes"],
                    "tags": tags,
                    "is_starred": bool(task_data["is_starred"]) if task_data["is_starred"] is not None else False,
                    "has_reminders": bool(task_data["has_reminders"]) if task_data["has_reminders"] is not None else False
                }))
            
            # Convert metrics
            metrics = []
            for metric_data in goal_data["metrics"]:
                metrics.append(Metric(**metric_data))
            
            # Convert targets
            targets = []
            for target_data in goal_data["targets"]:
                targets.append(GoalTarget(**target_data))
            
            # Convert subgoals
            subgoals = []
            for subgoal_data in goal_data["subgoals"]:
                subgoals.append(Goal(**{
                    **subgoal_data,
                    "tasks": [],
                    "metrics": [],
                    "targets": [],
                    "subgoals": [],
                    "experiences": [],
                    "strategies": [],
                    "conversations": []
                }))
            
            # Create the Goal model
            goal = Goal(
                **{
                    **goal_data,
                    "tasks": tasks,
                    "metrics": metrics,
                    "targets": targets,
                    "subgoals": subgoals
                }
            )
            
            pydantic_goals.append(goal)
        
        return pydantic_goals
    
    finally:
        db.close()


def get_goals_with_targets() -> List[Goal]:
    """Get goals that have targets associated with them using direct database queries"""
    print("Fetching goals that have targets using direct database queries...")
    
    db = SessionLocal()
    try:
        # First get the goal IDs that have targets
        goal_ids_result = db.execute(text("""
            SELECT DISTINCT goal_id FROM goal_targets;
        """))
        
        goal_ids = [row[0] for row in goal_ids_result]
        
        if not goal_ids:
            print("No goals with targets found.")
            return []
            
        print(f"Found goal IDs with targets: {goal_ids}")
        
        # Now get the goals with these IDs
        goals_data = []
        
        for goal_id in goal_ids:
            # Query the goal
            goal_result = db.execute(text(f"""
                SELECT id, title, description, priority, user_id, parent_id, 
                       created_at, updated_at, current_strategy_id
                FROM goals
                WHERE id = {goal_id}
            """))
            
            goal_row = goal_result.fetchone()
            if not goal_row:
                print(f"Goal with ID {goal_id} not found, but has targets.")
                continue
                
            goal_dict = {
                "id": goal_row[0],
                "title": goal_row[1],
                "description": goal_row[2],
                "priority": goal_row[3],
                "user_id": goal_row[4],
                "parent_id": goal_row[5],
                "created_at": goal_row[6],
                "updated_at": goal_row[7],
                "current_strategy_id": goal_row[8],
                "tasks": [],
                "subgoals": [],
                "targets": [],
                "metrics": []
            }
            
            # Query targets for this goal
            targets_result = db.execute(text(f"""
                SELECT gt.id, gt.title, gt.description, gt.deadline, gt.status, gt.notes, 
                       gt.created_at, gt.updated_at, gt.goal_id, gt.goaltarget_parent_id, gt.position
                FROM goal_targets gt
                WHERE gt.goal_id = {goal_id}
                ORDER BY gt.position
            """))
            
            target_rows = targets_result.fetchall()
            for target_row in target_rows:
                target_dict = {
                    "id": target_row[0],
                    "title": target_row[1],
                    "description": target_row[2],
                    "deadline": target_row[3],
                    "status": target_row[4],
                    "notes": target_row[5] or '[]',
                    "created_at": target_row[6],
                    "updated_at": target_row[7],
                    "goal_id": target_row[8],
                    "goaltarget_parent_id": target_row[9],
                    "position": target_row[10]
                }
                goal_dict["targets"].append(target_dict)
            
            # Query tasks for this goal
            tasks_result = db.execute(text(f"""
                SELECT id, title, description, priority, completed, due_date, 
                       created_at, updated_at, goal_id, parent_id, estimated_minutes,
                       tags, is_starred, has_reminders
                FROM tasks
                WHERE goal_id = {goal_id}
            """))
            
            for task_row in tasks_result:
                # Parse tags as JSON if it's a string, or use empty list as default
                tags_value = task_row[11]
                if isinstance(tags_value, str):
                    try:
                        import json
                        tags = json.loads(tags_value)
                    except (json.JSONDecodeError, TypeError):
                        tags = []
                else:
                    tags = [] if tags_value is None else tags_value
                
                task_dict = {
                    "id": task_row[0],
                    "title": task_row[1],
                    "description": task_row[2],
                    "priority": task_row[3],
                    "completed": bool(task_row[4]) if task_row[4] is not None else False,
                    "due_date": task_row[5],
                    "created_at": task_row[6],
                    "updated_at": task_row[7],
                    "goal_id": task_row[8],
                    "parent_id": task_row[9],
                    "estimated_minutes": task_row[10],
                    "tags": tags,
                    "is_starred": bool(task_row[12]) if task_row[12] is not None else False,
                    "has_reminders": bool(task_row[13]) if task_row[13] is not None else False
                }
                goal_dict["tasks"].append(task_dict)
            
            # Query metrics for this goal
            metrics_result = db.execute(text(f"""
                SELECT id, name, description, type, unit, target_value, current_value,
                       contributions_list, created_at, updated_at, goal_id
                FROM metrics
                WHERE goal_id = {goal_id}
            """))
            
            for metric_row in metrics_result:
                metric_dict = {
                    "id": metric_row[0],
                    "name": metric_row[1],
                    "description": metric_row[2],
                    "type": metric_row[3],
                    "unit": metric_row[4],
                    "target_value": metric_row[5],
                    "current_value": metric_row[6],
                    "contributions_list": metric_row[7] or '[]',
                    "created_at": metric_row[8],
                    "updated_at": metric_row[9],
                    "goal_id": metric_row[10]
                }
                goal_dict["metrics"].append(metric_dict)
            
            goals_data.append(goal_dict)
        
        # Convert to Pydantic models
        pydantic_goals = []
        for goal_data in goals_data:
            # Create Goal model
            goal = Goal(
                id=goal_data["id"],
                title=goal_data["title"],
                description=goal_data["description"],
                priority=goal_data["priority"],
                user_id=goal_data["user_id"],
                parent_id=goal_data["parent_id"],
                created_at=goal_data["created_at"],
                updated_at=goal_data["updated_at"],
                current_strategy_id=goal_data["current_strategy_id"],
                tasks=[],
                subgoals=[],
                targets=[],
                metrics=[]
            )
            
            # Add targets
            for target_data in goal_data["targets"]:
                target = GoalTarget(
                    id=target_data["id"],
                    title=target_data["title"],
                    description=target_data["description"],
                    deadline=target_data["deadline"],
                    status=target_data["status"],
                    notes=target_data["notes"],
                    created_at=target_data["created_at"],
                    updated_at=target_data["updated_at"],
                    goal_id=target_data["goal_id"],
                    goaltarget_parent_id=target_data["goaltarget_parent_id"],
                    position=target_data["position"]
                )
                goal.targets.append(target)
            
            # Add tasks
            for task_data in goal_data["tasks"]:
                # Parse tags as JSON if it's a string, or use empty list as default
                tags_value = task_data["tags"]
                if isinstance(tags_value, str):
                    try:
                        import json
                        tags = json.loads(tags_value)
                    except (json.JSONDecodeError, TypeError):
                        tags = []
                else:
                    tags = [] if tags_value is None else tags_value
                
                task = Task(
                    id=task_data["id"],
                    title=task_data["title"],
                    description=task_data["description"],
                    priority=task_data["priority"],
                    completed=task_data["completed"],
                    due_date=task_data["due_date"],
                    created_at=task_data["created_at"],
                    updated_at=task_data["updated_at"],
                    goal_id=task_data["goal_id"],
                    parent_id=task_data["parent_id"],
                    estimated_minutes=task_data["estimated_minutes"],
                    tags=tags,
                    is_starred=bool(task_data["is_starred"]) if task_data["is_starred"] is not None else False,
                    has_reminders=bool(task_data["has_reminders"]) if task_data["has_reminders"] is not None else False
                )
                goal.tasks.append(task)
            
            # Add metrics
            for metric_data in goal_data["metrics"]:
                metric = Metric(
                    id=metric_data["id"],
                    name=metric_data["name"],
                    description=metric_data["description"],
                    type=metric_data["type"],
                    unit=metric_data["unit"],
                    target_value=metric_data["target_value"],
                    current_value=metric_data["current_value"],
                    contributions_list=metric_data["contributions_list"],
                    created_at=metric_data["created_at"],
                    updated_at=metric_data["updated_at"],
                    goal_id=metric_data["goal_id"]
                )
                goal.metrics.append(metric)
            
            pydantic_goals.append(goal)
            
        # Print summary
        total_goals = len(pydantic_goals)
        total_targets = sum(len(g.targets) for g in pydantic_goals)
        
        print(f"Retrieved {total_goals} goals with a total of {total_targets} targets")
        
        # Print details of goals with targets
        for goal in pydantic_goals:
            print(f"\nGoal: {goal.title} (ID: {goal.id})")
            print(f"Targets: {len(goal.targets)}")
            for target in goal.targets:
                deadline_str = ""
                if target.deadline:
                    days_remaining = (target.deadline - datetime.now()).days
                    deadline_str = f", {days_remaining} days remaining"
                print(f"  - {target.title}{deadline_str}")
        
        return pydantic_goals
    finally:
        db.close()


def main():
    """Test the enhanced goal recommendation functionality with real data"""
    print("\n=== Testing Goal Recommendation with Real Data ===")
    
    try:
        # First, check if the goal_targets table exists and has data
        db = SessionLocal()
        try:
            # Check if table exists
            table_check = db.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='goal_targets';
            """))
            
            table_exists = table_check.fetchone() is not None
            print(f"\nGoal Targets table exists: {table_exists}")
            
            if table_exists:
                # Check table structure
                columns = db.execute(text("""
                    PRAGMA table_info(goal_targets);
                """))
                
                print("\nGoal Targets table structure:")
                for col in columns:
                    print(f"  - {col[1]} ({col[2]})")
                
                # Count records
                count = db.execute(text("""
                    SELECT COUNT(*) FROM goal_targets;
                """))
                
                total_targets = count.fetchone()[0]
                print(f"\nTotal targets in database: {total_targets}")
                
                if total_targets > 0:
                    # Sample some targets
                    sample_targets = db.execute(text("""
                        SELECT id, title, goal_id FROM goal_targets LIMIT 5;
                    """))
                    
                    print("\nSample targets:")
                    target_goal_ids = []
                    for target in sample_targets:
                        print(f"  - {target[1]} (ID: {target[0]}, Goal ID: {target[2]})")
                        if target[2] not in target_goal_ids:
                            target_goal_ids.append(target[2])
                    
                    # Get all unique goal IDs that have targets
                    all_goal_ids_with_targets = db.execute(text("""
                        SELECT DISTINCT goal_id FROM goal_targets;
                    """))
                    
                    target_goal_ids = [row[0] for row in all_goal_ids_with_targets]
                    print(f"\nGoal IDs with targets: {target_goal_ids}")
        finally:
            db.close()
        
        # Get goals with targets using direct database queries
        print("\n=== Testing with Goals That Have Targets ===")
        goals_with_targets = get_goals_with_targets()
        
        # Test the recommendation system with goals that have targets
        if goals_with_targets:
            print("\nGetting recommendation for goals with targets...")
            
            # Get recommendation using fallback method
            fallback_recommendation = create_fallback_goal_recommendation(goals_with_targets)
            
            # Print the fallback recommendation
            print("\nFallback Recommendation (Goals with Targets):")
            print(f"Goal ID: {fallback_recommendation.id}")
            print(f"Title: {fallback_recommendation.title}")
            print(f"Priority: {fallback_recommendation.priority}")
            print(f"Confidence: {fallback_recommendation.ai_confidence}")
            print(f"Reasoning: {fallback_recommendation.reasoning}")
            print(f"Importance Score: {fallback_recommendation.importance_score}")
            print(f"Urgency Score: {fallback_recommendation.urgency_score}")
            print("\nNext Steps:")
            for step in fallback_recommendation.next_steps:
                print(f"- {step}")
        
        # Get real goals from the database - first the standard goals
        goals = get_real_goals(limit=20, include_subgoals=True)
        
        if not goals:
            print("No goals found in the database. Creating sample goals...")
            # If no goals found, use sample goals
            goals = create_sample_goals()
        
        print("\n=== Testing with Standard Goals ===")
        print(f"Found {len(goals)} goals to analyze")
        
        # Get recommendation using fallback method
        print("\nGetting recommendation using fallback method...")
        fallback_recommendation = create_fallback_goal_recommendation(goals)
        
        # Print the fallback recommendation
        print("\nFallback Recommendation:")
        print(f"Goal ID: {fallback_recommendation.id}")
        print(f"Title: {fallback_recommendation.title}")
        print(f"Priority: {fallback_recommendation.priority}")
        print(f"Confidence: {fallback_recommendation.ai_confidence}")
        print(f"Reasoning: {fallback_recommendation.reasoning}")
        print(f"Importance Score: {fallback_recommendation.importance_score}")
        print(f"Urgency Score: {fallback_recommendation.urgency_score}")
        print("\nNext Steps:")
        for step in fallback_recommendation.next_steps:
            print(f"- {step}")
        
        # Get recommendation using OpenRouter API
        print("\nGetting recommendation using OpenRouter API...")
        try:
            openrouter_recommendation = asyncio.run(get_openrouter_goal_recommendation(goals))
            
            # Print the OpenRouter recommendation
            print("\nOpenRouter Recommendation:")
            print(f"Goal ID: {openrouter_recommendation.id}")
            print(f"Title: {openrouter_recommendation.title}")
            print(f"Priority: {openrouter_recommendation.priority}")
            print(f"Confidence: {openrouter_recommendation.ai_confidence}")
            print(f"Reasoning: {openrouter_recommendation.reasoning}")
            print(f"Importance Score: {openrouter_recommendation.importance_score}")
            print(f"Urgency Score: {openrouter_recommendation.urgency_score}")
            print("\nNext Steps:")
            for step in openrouter_recommendation.next_steps:
                print(f"- {step}")
        except Exception as e:
            print(f"\nError getting OpenRouter recommendation: {str(e)}")
        
        print("\n✅ Test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
        
    return 0

if __name__ == "__main__":
    main()
