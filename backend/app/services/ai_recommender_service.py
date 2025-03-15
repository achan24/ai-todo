"""
AI Recommender Service

This service provides task recommendations and task breakdown functionality
using various LLM providers. It's designed to be provider-agnostic,
allowing easy switching between different LLM backends.
"""

from typing import List, Dict, Any, Optional
import json
import requests
import aiohttp
import ssl
from ..models.task import Task
from ..models.goal import Goal, GoalTarget, Metric
from ..schemas.task import TaskWithAIRecommendation
from ..schemas.goal import GoalWithAIRecommendation
from ..core.config import settings
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

async def get_task_recommendation(tasks: List[Task], provider: str = "openrouter") -> TaskWithAIRecommendation:
    """
    Get AI recommendation for which task to do next.
    
    Args:
        tasks: List of tasks to analyze
        provider: LLM provider to use ("openrouter" for DeepSeek via OpenRouter or "sambanova")
    
    Returns:
        TaskWithAIRecommendation: The recommended task with AI confidence and reasoning
    """
    if not tasks:
        return None
    
    if provider == "sambanova" and settings.SAMBANOVA_API_KEY:
        try:
            return await get_sambanova_recommendation(tasks)
        except Exception as e:
            print(f"Error with SambaNova API: {e}. Falling back to OpenRouter.")
            # Fall back to OpenRouter if SambaNova fails
            if settings.OPENROUTER_API_KEY:
                return await get_openrouter_recommendation(tasks)
            else:
                return create_fallback_recommendation(tasks)
    elif provider == "openrouter" and settings.OPENROUTER_API_KEY:
        try:
            return await get_openrouter_recommendation(tasks)
        except Exception as e:
            print(f"Error with OpenRouter API: {e}. Falling back to simple recommendation.")
            return create_fallback_recommendation(tasks)
    else:
        # Fallback to simple priority-based recommendation if no API keys are available
        return create_fallback_recommendation(tasks)


async def get_sambanova_recommendation(tasks: List[Task]) -> TaskWithAIRecommendation:
    """Get task recommendation using SambaNova's API"""
    # Convert tasks to format expected by SambaNova API
    task_data = [{
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "created_at": task.created_at.isoformat(),
    } for task in tasks]

    # Call SambaNova API
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{settings.SAMBANOVA_API_URL}/recommend-task",
            headers={"Authorization": f"Bearer {settings.SAMBANOVA_API_KEY}"},
            json={"tasks": task_data}
        ) as response:
            if response.status != 200:
                # Raise exception to trigger fallback
                raise Exception(f"SambaNova API returned status {response.status}")
            
            recommendation = await response.json()
            
            # Find the recommended task
            recommended_task = next(
                (task for task in tasks if task.id == recommendation["task_id"]),
                tasks[0]  # Fallback to first task if something went wrong
            )
            
            # Convert to TaskWithAIRecommendation
            return TaskWithAIRecommendation(
                **{k: getattr(recommended_task, k) for k in recommended_task.__dict__ 
                   if not k.startswith('_')},
                ai_confidence=recommendation.get("confidence", 0.8),
                reasoning=recommendation.get("reasoning", "Based on priority and due date")
            )


async def get_openrouter_recommendation(tasks: List[Task]) -> TaskWithAIRecommendation:
    """Get task recommendation using DeepSeek via OpenRouter API"""
    # Prepare the task data
    task_data = [{
        "id": task.id,
        "title": task.title,
        "description": task.description or "",
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else "None",
        "created_at": task.created_at.isoformat(),
    } for task in tasks]
    
    # Create a prompt for the LLM
    prompt = f"""You are an AI assistant for a todo app. Analyze the following tasks and recommend which one the user should do next.
    
Tasks:
{json.dumps(task_data, indent=2)}

Provide your recommendation in the following JSON format:
{{
  "task_id": "id of the recommended task",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of why this task is recommended"
}}
"""
    
    # Call OpenRouter API
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-todo-app.com",
        "X-Title": "AI-Todo App",
    }
    
    payload = {
        "model": "deepseek/deepseek-r1-zero:free",
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant for a todo app."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,  # Lower temperature for more consistent responses
        "max_tokens": 800,
        "response_format": {"type": "json_object"}  # Request JSON response
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f"OpenRouter API returned status {response.status_code}: {response.text}")
        
        result = response.json()
        
        # Extract the assistant's message
        if "choices" in result and len(result["choices"]) > 0:
            message = result["choices"][0]["message"]
            content = message.get("content", "")
            
            # Clean up the response if needed
            if content.startswith("\\boxed{") and content.endswith("}"):
                content = content[len("\\boxed{"):].rstrip("}")
            
            # Check if content is empty
            if not content:
                raise Exception("Empty response from OpenRouter API")
            
            # Parse the JSON response
            try:
                # Try to parse as JSON
                recommendation = json.loads(content)
                
                # Find the recommended task
                recommended_task = next(
                    (task for task in tasks if task.id == recommendation["task_id"]),
                    tasks[0]  # Fallback to first task if something went wrong
                )
                
                # Convert to TaskWithAIRecommendation
                return TaskWithAIRecommendation(
                    **{k: getattr(recommended_task, k) for k in recommended_task.__dict__ 
                       if not k.startswith('_')},
                    ai_confidence=recommendation.get("confidence", 0.8),
                    reasoning=recommendation.get("reasoning", "Based on priority and due date")
                )
            except (json.JSONDecodeError, KeyError) as e:
                # If JSON parsing fails, try to extract task_id, confidence, and reasoning manually
                import re
                
                task_id_match = re.search(r'"task_id"\s*:\s*"?(\d+)"?', content)
                confidence_match = re.search(r'"confidence"\s*:\s*([0-9.]+)', content)
                reasoning_match = re.search(r'"reasoning"\s*:\s*"([^"]+)"', content)
                
                if task_id_match:
                    task_id = task_id_match.group(1)
                    confidence = float(confidence_match.group(1)) if confidence_match else 0.8
                    reasoning = reasoning_match.group(1) if reasoning_match else "Based on priority and due date"
                    
                    recommended_task = next(
                        (task for task in tasks if str(task.id) == str(task_id)),
                        tasks[0]  # Fallback to first task if something went wrong
                    )
                    
                    return TaskWithAIRecommendation(
                        **{k: getattr(recommended_task, k) for k in recommended_task.__dict__ 
                           if not k.startswith('_')},
                        ai_confidence=confidence,
                        reasoning=reasoning
                    )
                else:
                    raise Exception(f"Failed to parse LLM response: {e}. Response: {content}")
        else:
            raise Exception("No choices in OpenRouter API response")
    except Exception as e:
        print(f"Error with OpenRouter recommendation: {e}")
        raise


def create_fallback_recommendation(tasks: List[Task]) -> TaskWithAIRecommendation:
    """Create a simple recommendation based on priority and due date when AI is unavailable"""
    # Sort tasks by priority (high > medium > low) and due date
    sorted_tasks = sorted(
        tasks,
        key=lambda t: (
            {"high": 0, "medium": 1, "low": 2}[t.priority],
            t.due_date.timestamp() if t.due_date else float('inf')
        )
    )
    
    recommended_task = sorted_tasks[0]
    return TaskWithAIRecommendation(
        **{k: getattr(recommended_task, k) for k in recommended_task.__dict__ 
           if not k.startswith('_')},
        ai_confidence=0.7,
        reasoning="Recommended based on task priority and due date"
    )


async def get_goal_recommendation(goals: List[Goal], provider: str = "openrouter") -> GoalWithAIRecommendation:
    """
    Get AI recommendation for which goal to focus on next.
    
    This function analyzes goals with varying structures, including those with:
    - Different priorities
    - Different targets and deadlines
    - Goals without specific targets
    
    Args:
        goals: List of goals to analyze
        provider: LLM provider to use ("openrouter" for DeepSeek via OpenRouter or "sambanova")
    
    Returns:
        GoalWithAIRecommendation: The recommended goal with AI confidence and reasoning
    """
    if not goals:
        return None
    
    if provider == "sambanova" and settings.SAMBANOVA_API_KEY:
        try:
            return await get_sambanova_goal_recommendation(goals)
        except Exception as e:
            print(f"Error with SambaNova API: {e}. Falling back to OpenRouter.")
            # Fall back to OpenRouter if SambaNova fails
            if settings.OPENROUTER_API_KEY:
                return await get_openrouter_goal_recommendation(goals)
            else:
                return create_fallback_goal_recommendation(goals)
    elif provider == "openrouter" and settings.OPENROUTER_API_KEY:
        try:
            return await get_openrouter_goal_recommendation(goals)
        except Exception as e:
            print(f"Error with OpenRouter API: {e}. Falling back to simple recommendation.")
            return create_fallback_goal_recommendation(goals)
    else:
        # Fallback to simple priority-based recommendation if no API keys are available
        return create_fallback_goal_recommendation(goals)


async def get_openrouter_goal_recommendation(goals: List[Goal]) -> GoalWithAIRecommendation:
    """Get goal recommendation using DeepSeek via OpenRouter API"""
    # Prepare the goal data with a comprehensive structure
    goal_data = []
    current_time = datetime.now()
    
    for goal in goals:
        # Calculate time since last update
        time_since_update = (current_time - goal.updated_at).days
        
        # Format targets data
        targets_data = []
        approaching_deadlines = 0
        for target in goal.targets:
            # Calculate days until deadline if it exists
            days_until_deadline = None
            if target.deadline:
                days_until_deadline = (target.deadline - current_time).days
                if days_until_deadline <= 7:  # Consider deadlines within a week as approaching
                    approaching_deadlines += 1
            
            targets_data.append({
                "id": target.id,
                "title": target.title,
                "description": target.description,
                "deadline": target.deadline.isoformat() if target.deadline else None,
                "days_until_deadline": days_until_deadline,
                "status": target.status,
                "created_at": target.created_at.isoformat(),
                "updated_at": target.updated_at.isoformat(),
                "days_since_update": (current_time - target.updated_at).days,
            })
        
        # Format metrics data with progress information
        metrics_data = []
        for metric in goal.metrics:
            # Calculate progress percentage if target value exists
            progress_percentage = None
            if metric.target_value and metric.target_value > 0:
                progress_percentage = (metric.current_value / metric.target_value) * 100
            
            metrics_data.append({
                "id": metric.id,
                "name": metric.name,
                "description": metric.description,
                "type": metric.type,
                "unit": metric.unit,
                "target_value": metric.target_value,
                "current_value": metric.current_value,
                "progress_percentage": progress_percentage,
                "total_contributions": metric.total_contributions if hasattr(metric, 'total_contributions') else 0,
            })
        
        # Format tasks data with completion status
        tasks_data = []
        completed_tasks = 0
        total_tasks = len(goal.tasks)
        
        for task in goal.tasks:
            if task.completed:
                completed_tasks += 1
            else:  # Only include incomplete tasks in the data
                tasks_data.append({
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "priority": task.priority,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "created_at": task.created_at.isoformat(),
                    "days_since_creation": (current_time - task.created_at).days,
                    "is_starred": bool(task.is_starred) if task.is_starred is not None else False,  # Ensure is_starred is a boolean
                })
        
        # Calculate task completion rate
        completion_rate = 0
        if total_tasks > 0:
            completion_rate = (completed_tasks / total_tasks) * 100
        
        # Adjust importance based on task count
        incomplete_tasks = [task for task in goal.tasks if not task.completed]
        if len(incomplete_tasks) > 5:
            importance_score = 8.0  # Many tasks pending
        
        # Add the goal with all its related data
        goal_data.append({
            "id": goal.id,
            "title": goal.title,
            "description": goal.description or "",
            "priority": goal.priority,
            "created_at": goal.created_at.isoformat(),
            "updated_at": goal.updated_at.isoformat(),
            "days_since_update": time_since_update,
            "has_targets": len(targets_data) > 0,
            "targets_count": len(targets_data),
            "approaching_deadlines": approaching_deadlines,
            "targets": targets_data,
            "metrics_count": len(metrics_data),
            "metrics": metrics_data,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": completion_rate,
            "incomplete_tasks": tasks_data,
            "has_subgoals": len(goal.subgoals) > 0,
        })
    
    # Create a comprehensive prompt for the LLM
    prompt = f"""You are an AI assistant for a goal management app designed for users with ADHD. Analyze the following goals and recommend which one the user should focus on next, providing detailed reasoning and specific next steps.

Goals:
{json.dumps(goal_data, indent=2)}

Current date: {current_time.isoformat()}

Your task is to identify the most important goal for the user to focus on right now, considering various factors and potential scenarios, including but not limited to:

1. Goal Inactivity: Identify goals that haven't been updated recently but align with the user's priorities
2. Approaching Deadlines: Highlight goals with targets that have imminent deadlines
3. Workload Analysis: Assess which goals have targets requiring significant work based on complexity and timeline
4. Progress Tracking: Identify goals where the user is making good progress and could maintain momentum
5. Stalled Progress: Detect goals where progress has stalled and suggest how to get back on track
6. Missing Definitions: Point out goals that would benefit from more specific targets or metrics

Consider these additional factors:
- Priority levels (high, medium, low)
- Balance between urgent and important goals
- Completion rates and progress on metrics
- Time since last update
- Complexity of remaining work
- Dependencies between goals and targets

Provide your recommendation in the following JSON format:
{{
  "goal_id": "id of the recommended goal",
  "confidence": 0.0 to 1.0,
  "reasoning": "detailed explanation of why this goal is recommended, including which scenario(s) apply",
  "importance_score": 0.0 to 10.0,
  "urgency_score": 0.0 to 10.0,
  "next_steps": [
    {{
      "description": "specific action the user should take next",
      "type": "task/target/metric/strategy"
    }}
  ]
}}

Your recommendation should be actionable, specific, and help guide the user toward meaningful achievement of their goals.
"""
    
    # Call OpenRouter API
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-todo-app.com",
        "X-Title": "AI-Todo App",
    }
    
    payload = {
        "model": "deepseek/deepseek-r1-zero:free",
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant for a goal management app."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,  # Lower temperature for more consistent responses
        "max_tokens": 1000,
        "response_format": {"type": "json_object"}  # Request JSON response
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f"OpenRouter API returned status {response.status_code}: {response.text}")
        
        result = response.json()
        
        # Extract the assistant's message
        if "choices" in result and len(result["choices"]) > 0:
            message = result["choices"][0]["message"]
            content = message.get("content", "")
            reasoning = message.get("reasoning", "")
            
            # If content is empty but reasoning exists, use reasoning
            if not content and reasoning:
                # Try to extract structured data from reasoning text
                import re
                
                # Look for goal ID mentions
                goal_id_match = re.search(r'goal (\d+)', reasoning.lower())
                goal_id = goal_id_match.group(1) if goal_id_match else None
                
                if goal_id:
                    # Create a manual recommendation
                    recommendation = {
                        "goal_id": goal_id,
                        "confidence": 0.8,
                        "reasoning": reasoning[:500],  # Truncate long reasoning
                        "importance_score": 8.0,
                        "urgency_score": 7.0,
                        "next_steps": [
                            {
                                "description": "Review goal details and create a plan",
                                "type": "strategy"
                            }
                        ]
                    }
                else:
                    raise Exception("Could not extract goal recommendation from reasoning")
            else:
                # Clean up the response if needed
                if content.startswith("\\boxed{") and content.endswith("}"):
                    content = content[len("\\boxed{"):].rstrip("}")
                
                # Parse the JSON response
                try:
                    recommendation = json.loads(content)
                except (json.JSONDecodeError, KeyError) as e:
                    # If JSON parsing fails, try to extract goal_id, confidence, and reasoning manually
                    import re
                    
                    goal_id_match = re.search(r'"goal_id"\s*:\s*"?(\d+)"?', content)
                    confidence_match = re.search(r'"confidence"\s*:\s*([0-9.]+)', content)
                    reasoning_match = re.search(r'"reasoning"\s*:\s*"([^"]+)"', content)
                    
                    if goal_id_match:
                        goal_id = goal_id_match.group(1)
                        confidence = float(confidence_match.group(1)) if confidence_match else 0.8
                        reasoning = reasoning_match.group(1) if reasoning_match else "Based on priority and deadlines"
                        
                        recommendation = {
                            "goal_id": goal_id,
                            "confidence": confidence,
                            "reasoning": reasoning,
                            "importance_score": 8.0,
                            "urgency_score": 7.0,
                            "next_steps": [
                                {
                                    "description": "Review goal details and create a plan",
                                    "type": "strategy"
                                }
                            ]
                        }
                    else:
                        raise Exception("Could not extract goal recommendation from response")
            
            # Find the recommended goal
            recommended_goal = next(
                (goal for goal in goals if str(goal.id) == str(recommendation["goal_id"])),
                goals[0]  # Fallback to first goal if something went wrong
            )
            
            # Convert to GoalWithAIRecommendation
            goal_dict = {k: getattr(recommended_goal, k) for k in recommended_goal.__dict__ 
                       if not k.startswith('_')}
            
            # Fix is_starred fields in tasks and subtasks recursively
            def fix_is_starred_in_tasks(tasks):
                fixed_tasks = []
                for task in tasks:
                    task_dict = {k: getattr(task, k) for k in task.__dict__ if not k.startswith('_')}
                    
                    # Set is_starred to False if it's None
                    if task_dict.get('is_starred') is None:
                        task_dict['is_starred'] = False
                        
                    # Fix subtasks recursively
                    if 'subtasks' in task_dict and task_dict['subtasks']:
                        task_dict['subtasks'] = fix_is_starred_in_tasks(task_dict['subtasks'])
                        
                    fixed_tasks.append(task_dict)
                return fixed_tasks
            
            # Create a clean copy of the goal dictionary
            goal_dict = {k: getattr(recommended_goal, k) for k in recommended_goal.__dict__ if not k.startswith('_')}
            
            # Fix is_starred in tasks
            if 'tasks' in goal_dict and goal_dict['tasks']:
                goal_dict['tasks'] = fix_is_starred_in_tasks(goal_dict['tasks'])
            
            # Fix is_starred in subgoals recursively
            def fix_is_starred_in_subgoals(subgoals):
                fixed_subgoals = []
                for subgoal in subgoals:
                    subgoal_dict = {k: getattr(subgoal, k) for k in subgoal.__dict__ if not k.startswith('_')}
                    
                    # Fix tasks in subgoal
                    if 'tasks' in subgoal_dict and subgoal_dict['tasks']:
                        subgoal_dict['tasks'] = fix_is_starred_in_tasks(subgoal_dict['tasks'])
                        
                    # Fix nested subgoals recursively
                    if 'subgoals' in subgoal_dict and subgoal_dict['subgoals']:
                        subgoal_dict['subgoals'] = fix_is_starred_in_subgoals(subgoal_dict['subgoals'])
                        
                    fixed_subgoals.append(subgoal_dict)
                return fixed_subgoals
            
            # Fix is_starred in subgoals
            if 'subgoals' in goal_dict and goal_dict['subgoals']:
                goal_dict['subgoals'] = fix_is_starred_in_subgoals(goal_dict['subgoals'])
            
            # Fix contributions_list in metrics if it's a list instead of a string
            if 'metrics' in goal_dict and goal_dict['metrics']:
                for metric in goal_dict['metrics']:
                    if hasattr(metric, 'contributions_list') and isinstance(metric.contributions_list, list):
                        metric.contributions_list = str(metric.contributions_list)
            
            return GoalWithAIRecommendation(
                **goal_dict,
                ai_confidence=recommendation.get("confidence", 0.8),
                reasoning=recommendation.get("reasoning", "Based on priority and deadlines"),
                importance_score=recommendation.get("importance_score", 7.0),
                urgency_score=recommendation.get("urgency_score", 7.0),
                next_steps=recommendation.get("next_steps", [])
            )
        else:
            raise Exception("No choices in OpenRouter API response")
    except Exception as e:
        print(f"Error in OpenRouter goal recommendation: {e}")
        # Fallback to simple recommendation
        return create_fallback_goal_recommendation(goals)


async def get_sambanova_goal_recommendation(goals: List[Goal]) -> GoalWithAIRecommendation:
    """Get goal recommendation using SambaNova's API"""
    # Convert goals to format expected by SambaNova API
    goal_data = []
    
    for goal in goals:
        # Format targets data
        targets_data = []
        for target in goal.targets:
            targets_data.append({
                "id": target.id,
                "title": target.title,
                "description": target.description or "",
                "deadline": target.deadline.isoformat() if target.deadline else None,
                "status": target.status,
            })
        
        # Format metrics data
        metrics_data = []
        for metric in goal.metrics:
            metrics_data.append({
                "id": metric.id,
                "name": metric.name,
                "description": metric.description,
                "type": metric.type,
                "unit": metric.unit,
                "target_value": metric.target_value,
                "current_value": metric.current_value,
            })
        
        # Add the goal with all its related data
        goal_data.append({
            "id": goal.id,
            "title": goal.title,
            "description": goal.description or "",
            "priority": goal.priority,
            "created_at": goal.created_at.isoformat(),
            "updated_at": goal.updated_at.isoformat(),
            "targets": targets_data,
            "metrics": metrics_data,
        })

    # Call SambaNova API
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{settings.SAMBANOVA_API_URL}/recommend-goal",
            headers={"Authorization": f"Bearer {settings.SAMBANOVA_API_KEY}"},
            json={"goals": goal_data}
        ) as response:
            if response.status != 200:
                # Raise exception to trigger fallback
                raise Exception(f"SambaNova API returned status {response.status}")
            
            recommendation = await response.json()
            
            # Find the recommended goal
            recommended_goal = next(
                (goal for goal in goals if goal.id == recommendation["goal_id"]),
                goals[0]  # Fallback to first goal if something went wrong
            )
            
            # Convert to GoalWithAIRecommendation
            goal_dict = {k: getattr(recommended_goal, k) for k in recommended_goal.__dict__ 
                       if not k.startswith('_')}
            
            return GoalWithAIRecommendation(
                **goal_dict,
                ai_confidence=recommendation.get("confidence", 0.8),
                reasoning=recommendation.get("reasoning", "Based on priority, targets, and deadlines"),
                importance_score=recommendation.get("importance_score", 7.0),
                urgency_score=recommendation.get("urgency_score", 7.0),
                next_steps=recommendation.get("next_steps", [])
            )


def create_fallback_goal_recommendation(goals: List[Goal]) -> GoalWithAIRecommendation:
    """Create a fallback goal recommendation based on priority, targets, and deadlines"""
    if not goals:
        raise ValueError("No goals provided for recommendation")
    
    current_time = datetime.now()
    goal_scores = []
    
    for goal in goals:
        # Base importance score based on priority
        importance_score = 5.0  # Default medium importance
        if goal.priority == "high":
            importance_score = 8.0
        elif goal.priority == "low":
            importance_score = 3.0
        
        # Urgency score based on target deadlines and time since update
        urgency_score = 5.0  # Default medium urgency
        closest_deadline_days = None
        approaching_deadlines = 0
        
        # Check for approaching deadlines in targets
        for target in goal.targets:
            if target.deadline:
                days_until_deadline = (target.deadline - current_time).days
                
                # Update closest deadline if this is the closest one
                if closest_deadline_days is None or days_until_deadline < closest_deadline_days:
                    closest_deadline_days = days_until_deadline
                
                # Count approaching deadlines (within a week)
                if days_until_deadline <= 7:
                    approaching_deadlines += 1
                    
                # Increase urgency for very close deadlines
                if days_until_deadline <= 3:
                    urgency_score += 2.0
                elif days_until_deadline <= 7:
                    urgency_score += 1.0
        
        # Adjust importance based on metrics
        for metric in goal.metrics:
            if metric.target_value and metric.target_value > 0:
                progress_percentage = (metric.current_value / metric.target_value) * 100
                
                # Increase importance for metrics with low progress
                if progress_percentage < 25:
                    importance_score += 0.5
                
                # Increase importance for metrics with high targets
                if metric.target_value > 100:
                    importance_score += 0.5
        
        # Adjust importance based on task count
        incomplete_tasks = [task for task in goal.tasks if not task.completed]
        if len(incomplete_tasks) > 5:
            importance_score += 1.0  # Many tasks pending
        
        # Adjust urgency based on time since last update (goal inactivity)
        days_since_update = (current_time - goal.updated_at).days
        if days_since_update > 14:  # Not updated in over 2 weeks
            urgency_score += 1.5
        elif days_since_update > 7:  # Not updated in over a week
            urgency_score += 0.8
        
        # Calculate final score (weighted combination of importance and urgency)
        final_score = (importance_score * 0.6) + (urgency_score * 0.4)
        
        # Store scores for this goal
        goal_scores.append({
            "goal": goal,
            "score": final_score,
            "importance_score": importance_score,
            "urgency_score": urgency_score,
            "closest_deadline_days": closest_deadline_days,
            "approaching_deadlines": approaching_deadlines,
            "days_since_update": days_since_update,
            "incomplete_tasks": len(incomplete_tasks)
        })
    
    # Sort by score (descending)
    goal_scores.sort(key=lambda x: x["score"], reverse=True)
    
    # Get the highest scoring goal
    top_goal = goal_scores[0]["goal"]
    importance = goal_scores[0]["importance_score"]
    urgency = goal_scores[0]["urgency_score"]
    closest_deadline = goal_scores[0]["closest_deadline_days"]
    approaching_deadlines = goal_scores[0]["approaching_deadlines"]
    days_since_update = goal_scores[0]["days_since_update"]
    incomplete_tasks = goal_scores[0]["incomplete_tasks"]
    
    # Generate reasoning based on the goal's characteristics and identified scenarios
    reasoning_parts = []
    
    # Check which scenarios apply and add them to reasoning
    
    # Scenario 1: Goal Inactivity
    if days_since_update > 7 and top_goal.priority in ["high", "medium"]:
        reasoning_parts.append(f"this {top_goal.priority} priority goal hasn't been updated in {days_since_update} days")
    
    # Scenario 2: Approaching Deadlines
    if approaching_deadlines > 0:
        deadline_text = "deadline" if approaching_deadlines == 1 else "deadlines"
        reasoning_parts.append(f"it has {approaching_deadlines} approaching {deadline_text}")
        if closest_deadline is not None and closest_deadline <= 3:
            reasoning_parts.append(f"with the closest deadline only {closest_deadline} days away")
    
    # Scenario 3: Workload Analysis
    if incomplete_tasks > 5:
        reasoning_parts.append(f"it has {incomplete_tasks} incomplete tasks that need attention")
    
    # Scenario 4: Progress Tracking
    has_metrics_with_progress = False
    for metric in top_goal.metrics:
        if metric.target_value and metric.target_value > 0:
            progress_percentage = (metric.current_value / metric.target_value) * 100
            
            # Increase importance for metrics with low progress
            if progress_percentage > 0:
                has_metrics_with_progress = True
                break
    
    if has_metrics_with_progress:
        reasoning_parts.append("you've made progress on metrics that should be maintained")
    
    # Scenario 5: Missing Definitions
    if not top_goal.targets:
        reasoning_parts.append("it would benefit from defining specific targets")
    
    # Add priority if it's high
    if top_goal.priority == "high":
        reasoning_parts.append("it's marked as high priority")
    
    # Construct the final reasoning
    if reasoning_parts:
        reasoning = f"This goal is recommended because {reasoning_parts[0]}"
        if len(reasoning_parts) > 1:
            for i, part in enumerate(reasoning_parts[1:], 1):
                if i == len(reasoning_parts) - 1:
                    reasoning += f", and {part}"
                else:
                    reasoning += f", {part}"
        reasoning += "."
    else:
        reasoning = "Based on priority, targets, and deadlines."
    
    # Generate next steps based on the goal's state and identified scenarios
    next_steps = []
    
    # If there are targets with approaching deadlines, suggest focusing on them
    approaching_deadline_targets = [
        target for target in top_goal.targets 
        if target.deadline and (target.deadline - current_time).days <= 7
    ]
    
    if approaching_deadline_targets:
        # Sort by closest deadline
        approaching_deadline_targets.sort(key=lambda t: t.deadline)
        next_steps.append({
            "description": f"Focus on target: {approaching_deadline_targets[0].title}",
            "type": "target"
        })
    
    # If there are incomplete tasks, suggest working on them
    incomplete_tasks = [task for task in top_goal.tasks if not task.completed]
    if incomplete_tasks:
        # Sort by priority and due date
        incomplete_tasks.sort(
            key=lambda t: (
                0 if t.priority == "high" else (1 if t.priority == "medium" else 2),
                t.due_date if t.due_date else current_time + timedelta(days=365)
            )
        )
        next_steps.append({
            "description": f"Complete task: {incomplete_tasks[0].title}",
            "type": "task"
        })
    
    # If there are metrics with targets not yet reached, suggest working on them
    for metric in top_goal.metrics:
        if metric.target_value and metric.current_value < metric.target_value:
            next_steps.append({
                "description": f"Improve metric: {metric.name}",
                "type": "metric"
            })
            break
    
    # If no targets exist, suggest creating them
    if not top_goal.targets:
        next_steps.append({
            "description": "Create specific targets for this goal",
            "type": "strategy"
        })
    # If no specific next steps were found, suggest creating a strategy
    elif not next_steps:
        next_steps.append({
            "description": "Create a strategy for this goal",
            "type": "strategy"
        })
    
    # Fix is_starred fields in tasks and subtasks recursively
    def fix_is_starred_in_tasks(tasks):
        fixed_tasks = []
        for task in tasks:
            task_dict = {k: getattr(task, k) for k in task.__dict__ if not k.startswith('_')}
            
            # Set is_starred to False if it's None
            if task_dict.get('is_starred') is None:
                task_dict['is_starred'] = False
                
            # Fix subtasks recursively
            if 'subtasks' in task_dict and task_dict['subtasks']:
                task_dict['subtasks'] = fix_is_starred_in_tasks(task_dict['subtasks'])
                
            fixed_tasks.append(task_dict)
        return fixed_tasks
    
    # Create a clean copy of the goal dictionary
    goal_dict = {k: getattr(top_goal, k) for k in top_goal.__dict__ if not k.startswith('_')}
    
    # Fix is_starred in tasks
    if 'tasks' in goal_dict and goal_dict['tasks']:
        goal_dict['tasks'] = fix_is_starred_in_tasks(goal_dict['tasks'])
    
    # Fix is_starred in subgoals recursively
    def fix_is_starred_in_subgoals(subgoals):
        fixed_subgoals = []
        for subgoal in subgoals:
            subgoal_dict = {k: getattr(subgoal, k) for k in subgoal.__dict__ if not k.startswith('_')}
            
            # Fix tasks in subgoal
            if 'tasks' in subgoal_dict and subgoal_dict['tasks']:
                subgoal_dict['tasks'] = fix_is_starred_in_tasks(subgoal_dict['tasks'])
                
            # Fix nested subgoals recursively
            if 'subgoals' in subgoal_dict and subgoal_dict['subgoals']:
                subgoal_dict['subgoals'] = fix_is_starred_in_subgoals(subgoal_dict['subgoals'])
                
            fixed_subgoals.append(subgoal_dict)
        return fixed_subgoals
    
    # Fix is_starred in subgoals
    if 'subgoals' in goal_dict and goal_dict['subgoals']:
        goal_dict['subgoals'] = fix_is_starred_in_subgoals(goal_dict['subgoals'])
    
    # Fix contributions_list in metrics if it's a list instead of a string
    if 'metrics' in goal_dict and goal_dict['metrics']:
        for metric in goal_dict['metrics']:
            if hasattr(metric, 'contributions_list') and isinstance(metric.contributions_list, list):
                metric.contributions_list = str(metric.contributions_list)
    
    return GoalWithAIRecommendation(
        **goal_dict,
        ai_confidence=0.7,
        reasoning=reasoning,
        importance_score=importance,
        urgency_score=urgency,
        next_steps=next_steps
    )


async def get_top_goal_recommendations(goals: List[Goal], provider: str = "openrouter", top_n: int = 3) -> List[GoalWithAIRecommendation]:
    """
    Get the top N goal recommendations based on priority, targets, and deadlines.
    
    Args:
        goals: List of goals to analyze
        provider: AI provider to use (openrouter, etc.)
        top_n: Number of top goals to return
        
    Returns:
        List of GoalWithAIRecommendation objects for the top N goals
    """
    if not goals:
        return []
    
    # If there are fewer goals than requested, return all of them
    if len(goals) <= top_n:
        recommendations = []
        for goal in goals:
            try:
                recommendation = await get_goal_recommendation([goal], provider)
                recommendations.append(recommendation)
            except Exception as e:
                logger.error(f"Error getting recommendation for goal {goal.id}: {str(e)}")
                # Use fallback for this goal
                fallback_recommendation = create_fallback_goal_recommendation([goal])
                recommendations.append(fallback_recommendation)
        return recommendations
    
    # For performance reasons, use the fallback method to rank all goals
    # This avoids making multiple API calls to the LLM
    goal_scores = []
    current_time = datetime.now()
    
    for goal in goals:
        # Base importance score based on priority
        importance_score = 5.0  # Default medium importance
        if goal.priority == "high":
            importance_score = 8.0
        elif goal.priority == "low":
            importance_score = 3.0
        
        # Urgency score based on target deadlines and time since update
        urgency_score = 5.0  # Default medium urgency
        closest_deadline_days = None
        approaching_deadlines = 0
        
        # Check for approaching deadlines in targets
        for target in goal.targets:
            if target.deadline:
                days_until_deadline = (target.deadline - current_time).days
                
                # Update closest deadline if this is the closest one
                if closest_deadline_days is None or days_until_deadline < closest_deadline_days:
                    closest_deadline_days = days_until_deadline
                
                # Count approaching deadlines (within a week)
                if days_until_deadline <= 7:
                    approaching_deadlines += 1
                    
                # Increase urgency for very close deadlines
                if days_until_deadline <= 3:
                    urgency_score += 2.0
                elif days_until_deadline <= 7:
                    urgency_score += 1.0
        
        # Adjust importance based on metrics
        for metric in goal.metrics:
            if metric.target_value and metric.target_value > 0:
                progress_percentage = (metric.current_value / metric.target_value) * 100
                
                # Increase importance for metrics with low progress
                if progress_percentage < 25:
                    importance_score += 0.5
                
                # Increase importance for metrics with high targets
                if metric.target_value > 100:
                    importance_score += 0.5
        
        # Adjust importance based on task count
        incomplete_tasks = [task for task in goal.tasks if not task.completed]
        if len(incomplete_tasks) > 5:
            importance_score += 1.0  # Many tasks pending
        
        # Adjust urgency based on time since last update (goal inactivity)
        days_since_update = (current_time - goal.updated_at).days
        if days_since_update > 14:  # Not updated in over 2 weeks
            urgency_score += 1.5
        elif days_since_update > 7:  # Not updated in over a week
            urgency_score += 0.8
        
        # Calculate final score (weighted combination of importance and urgency)
        final_score = (importance_score * 0.6) + (urgency_score * 0.4)
        
        # Store scores for this goal
        goal_scores.append({
            "goal": goal,
            "score": final_score,
            "importance_score": importance_score,
            "urgency_score": urgency_score,
            "closest_deadline_days": closest_deadline_days,
            "approaching_deadlines": approaching_deadlines,
            "days_since_update": days_since_update,
            "incomplete_tasks": len(incomplete_tasks)
        })
    
    # Sort by score (descending)
    goal_scores.sort(key=lambda x: x["score"], reverse=True)
    
    # Get the top N goals
    top_goals = goal_scores[:top_n]
    
    # Create recommendations for the top goals
    recommendations = []
    for goal_score in top_goals:
        goal = goal_score["goal"]
        importance = goal_score["importance_score"]
        urgency = goal_score["urgency_score"]
        closest_deadline = goal_score["closest_deadline_days"]
        approaching_deadlines = goal_score["approaching_deadlines"]
        days_since_update = goal_score["days_since_update"]
        incomplete_tasks = goal_score["incomplete_tasks"]
        
        # Generate reasoning based on the goal's characteristics
        reasoning_parts = []
        
        # Check which scenarios apply and add them to reasoning
        
        # Scenario 1: Goal Inactivity
        if days_since_update > 7 and goal.priority in ["high", "medium"]:
            reasoning_parts.append(f"this {goal.priority} priority goal hasn't been updated in {days_since_update} days")
        
        # Scenario 2: Approaching Deadlines
        if approaching_deadlines > 0:
            deadline_text = "deadline" if approaching_deadlines == 1 else "deadlines"
            reasoning_parts.append(f"it has {approaching_deadlines} approaching {deadline_text}")
            if closest_deadline is not None and closest_deadline <= 3:
                reasoning_parts.append(f"with the closest deadline only {closest_deadline} days away")
        
        # Scenario 3: Workload Analysis
        if incomplete_tasks > 5:
            reasoning_parts.append(f"it has {incomplete_tasks} incomplete tasks that need attention")
        
        # Scenario 4: Progress Tracking
        has_metrics_with_progress = False
        for metric in goal.metrics:
            if metric.target_value and metric.target_value > 0:
                progress_percentage = (metric.current_value / metric.target_value) * 100
                if progress_percentage > 0:
                    has_metrics_with_progress = True
                    break
        
        if has_metrics_with_progress:
            reasoning_parts.append("you've made progress on metrics that should be maintained")
        
        # Scenario 5: Missing Definitions
        if not goal.targets:
            reasoning_parts.append("it would benefit from defining specific targets")
        
        # Add priority if it's high
        if goal.priority == "high":
            reasoning_parts.append("it's marked as high priority")
        
        # Construct the final reasoning
        if reasoning_parts:
            reasoning = f"This goal is recommended because {reasoning_parts[0]}"
            if len(reasoning_parts) > 1:
                for i, part in enumerate(reasoning_parts[1:], 1):
                    if i == len(reasoning_parts) - 1:
                        reasoning += f", and {part}"
                    else:
                        reasoning += f", {part}"
            reasoning += "."
        else:
            reasoning = "Based on priority, targets, and deadlines."
        
        # Generate next steps based on the goal's state
        next_steps = []
        
        # If there are targets with approaching deadlines, suggest focusing on them
        approaching_deadline_targets = [
            target for target in goal.targets 
            if target.deadline and (target.deadline - current_time).days <= 7
        ]
        
        if approaching_deadline_targets:
            # Sort by closest deadline
            approaching_deadline_targets.sort(key=lambda t: t.deadline)
            next_steps.append({
                "description": f"Focus on target: {approaching_deadline_targets[0].title}",
                "type": "target"
            })
        
        # If there are incomplete tasks, suggest working on them
        if incomplete_tasks:
            # Sort by priority and due date
            incomplete_task_list = [task for task in goal.tasks if not task.completed]
            incomplete_task_list.sort(
                key=lambda t: (
                    0 if t.priority == "high" else (1 if t.priority == "medium" else 2),
                    t.due_date if t.due_date else current_time + timedelta(days=365)
                )
            )
            next_steps.append({
                "description": f"Complete task: {incomplete_task_list[0].title}",
                "type": "task"
            })
        
        # If there are metrics with targets not yet reached, suggest working on them
        for metric in goal.metrics:
            if metric.target_value and metric.current_value < metric.target_value:
                next_steps.append({
                    "description": f"Improve metric: {metric.name}",
                    "type": "metric"
                })
                break
        
        # If no targets exist, suggest creating them
        if not goal.targets:
            next_steps.append({
                "description": "Create specific targets for this goal",
                "type": "strategy"
            })
        # If no specific next steps were found, suggest creating a strategy
        elif not next_steps:
            next_steps.append({
                "description": "Create a strategy for this goal",
                "type": "strategy"
            })
        
        # Fix is_starred fields in tasks and subtasks recursively
        def fix_is_starred_in_tasks(tasks):
            fixed_tasks = []
            for task in tasks:
                task_dict = {k: getattr(task, k) for k in task.__dict__ if not k.startswith('_')}
                
                # Set is_starred to False if it's None
                if task_dict.get('is_starred') is None:
                    task_dict['is_starred'] = False
                    
                # Fix subtasks recursively
                if 'subtasks' in task_dict and task_dict['subtasks']:
                    task_dict['subtasks'] = fix_is_starred_in_tasks(task_dict['subtasks'])
                    
                fixed_tasks.append(task_dict)
            return fixed_tasks
        
        # Create a clean copy of the goal dictionary
        goal_dict = {k: getattr(goal, k) for k in goal.__dict__ if not k.startswith('_')}
        
        # Fix is_starred in tasks
        if 'tasks' in goal_dict and goal_dict['tasks']:
            goal_dict['tasks'] = fix_is_starred_in_tasks(goal_dict['tasks'])
        
        # Fix is_starred in subgoals recursively
        def fix_is_starred_in_subgoals(subgoals):
            fixed_subgoals = []
            for subgoal in subgoals:
                subgoal_dict = {k: getattr(subgoal, k) for k in subgoal.__dict__ if not k.startswith('_')}
                
                # Fix tasks in subgoal
                if 'tasks' in subgoal_dict and subgoal_dict['tasks']:
                    subgoal_dict['tasks'] = fix_is_starred_in_tasks(subgoal_dict['tasks'])
                    
                # Fix nested subgoals recursively
                if 'subgoals' in subgoal_dict and subgoal_dict['subgoals']:
                    subgoal_dict['subgoals'] = fix_is_starred_in_subgoals(subgoal_dict['subgoals'])
                    
                fixed_subgoals.append(subgoal_dict)
            return fixed_subgoals
        
        # Fix is_starred in subgoals
        if 'subgoals' in goal_dict and goal_dict['subgoals']:
            goal_dict['subgoals'] = fix_is_starred_in_subgoals(goal_dict['subgoals'])
        
        # Fix contributions_list in metrics if it's a list instead of a string
        if 'metrics' in goal_dict and goal_dict['metrics']:
            for metric in goal_dict['metrics']:
                if hasattr(metric, 'contributions_list') and isinstance(metric.contributions_list, list):
                    metric.contributions_list = str(metric.contributions_list)
        
        # Create the recommendation
        recommendation = GoalWithAIRecommendation(
            **goal_dict,
            ai_confidence=0.7 + (goal_score["score"] / 20),  # Adjust confidence based on score
            reasoning=reasoning,
            importance_score=importance,
            urgency_score=urgency,
            next_steps=next_steps
        )
        
        recommendations.append(recommendation)
    
    # Try to get a more detailed recommendation for the top goal using the AI
    if provider and provider.lower() != "none":
        try:
            # Get detailed recommendation for the top goal only
            top_goal = top_goals[0]["goal"]
            detailed_recommendation = await get_goal_recommendation([top_goal], provider)
            
            # Replace the first recommendation with the detailed one
            recommendations[0] = detailed_recommendation
        except Exception as e:
            logger.error(f"Error getting detailed recommendation for top goal: {str(e)}")
            # Keep the fallback recommendation
    
    return recommendations


async def breakdown_task(
    task_title: str, 
    task_description: str = None, 
    custom_prompt: str = None, 
    messages: List[dict] = None,
    provider: str = "openrouter"
) -> dict:
    """
    Break down a task into subtasks using an LLM.
    
    Args:
        task_title: The title of the task to break down
        task_description: Optional description of the task
        custom_prompt: Optional custom prompt to use instead of the default
        messages: Optional conversation history
        provider: LLM provider to use ("openrouter" or "sambanova")
        
    Returns:
        dict: Contains subtasks, AI response, and success status
    """
    if provider == "sambanova" and settings.SAMBANOVA_API_KEY:
        try:
            return await breakdown_task_sambanova(task_title, task_description, custom_prompt, messages)
        except Exception as e:
            print(f"Error with SambaNova API: {e}. Falling back to OpenRouter.")
            # Fall back to OpenRouter if SambaNova fails
            if settings.OPENROUTER_API_KEY:
                return await breakdown_task_openrouter(task_title, task_description, custom_prompt, messages)
            else:
                return {"subtasks": [], "response": f"Error: {str(e)}", "success": False}
    elif provider == "openrouter" and settings.OPENROUTER_API_KEY:
        try:
            return await breakdown_task_openrouter(task_title, task_description, custom_prompt, messages)
        except Exception as e:
            print(f"Error with OpenRouter API: {e}.")
            return {"subtasks": [], "response": f"Error: {str(e)}", "success": False}
    else:
        return {
            "subtasks": [], 
            "response": "No API keys available for AI services", 
            "success": False
        }


async def breakdown_task_sambanova(
    task_title: str, 
    task_description: str = None, 
    custom_prompt: str = None, 
    messages: List[dict] = None
) -> dict:
    """Break down a task into subtasks using SambaNova's API"""
    try:
        print(f"Starting breakdown_task_sambanova for: {task_title}")
        print(f"Description: {task_description}")
        print(f"Custom prompt: {custom_prompt}")
        print(f"Messages: {messages}")

        system_prompt = """You are a task breakdown assistant. Help users break down tasks into smaller, actionable subtasks.
Follow these rules:
1. Each subtask should be clear and actionable
2. Keep subtask titles concise (under 10 words)
3. Provide 3-5 subtasks initially
4. Format subtasks as a bullet point list with each subtask on a new line starting with '-'
5. If the user asks for changes or clarification, adjust your suggestions accordingly
6. Always maintain a helpful and collaborative tone"""

        # Build conversation history
        conversation = [
            {"role": "system", "content": system_prompt}
        ]
        
        if messages:
            print("Using provided message history")
            conversation.extend(messages)
        else:
            print("Creating new conversation")
            user_prompt = f"Break down this task into subtasks: {task_title}"
            if task_description:
                user_prompt += f"\nDescription: {task_description}"
            conversation.append({
                "role": "user",
                "content": custom_prompt or user_prompt
            })

        print(f"Final conversation: {conversation}")

        # Create SSL context that skips verification
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        # Call SambaNova API with SSL context
        connector = aiohttp.TCPConnector(ssl=ssl_context)
        async with aiohttp.ClientSession(connector=connector) as session:
            api_url = 'https://api.sambanova.ai/v1/chat/completions'
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {settings.SAMBANOVA_API_KEY}'
            }
            payload = {
                'messages': conversation,
                'model': 'Meta-Llama-3.1-405B-Instruct',
                'stream': False,
                'temperature': 0.7,
                'max_tokens': 500
            }
            
            print(f"Calling SambaNova API at: {api_url}")
            print(f"Headers: {headers}")
            print(f"Payload: {payload}")
            
            async with session.post(api_url, headers=headers, json=payload) as response:
                print(f"SambaNova API Response Status: {response.status}")
                response_text = await response.text()
                print(f"SambaNova API Response: {response_text}")
                
                if response.status != 200:
                    error_msg = f"Error from SambaNova API: Status {response.status}, Response: {response_text}"
                    print(error_msg)
                    return {"subtasks": [], "response": error_msg, "success": False}
                
                result = await response.json()
                print(f"Parsed JSON result: {result}")
                
                try:
                    # Get AI's response from the choices
                    response_text = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                    print(f"Parsed response text: {response_text}")
                    
                    # Extract any subtasks if they exist in the response
                    subtasks = []
                    for line in response_text.split('\n'):
                        line = line.strip()
                        if line and line.startswith('-'):
                            # Remove leading dash and whitespace
                            title = line.lstrip('- ').strip()
                            if title:
                                subtasks.append({"title": title})
                    
                    print(f"Parsed subtasks: {subtasks}")
                    
                    # Return both the response and any subtasks found
                    return {
                        "subtasks": subtasks,
                        "response": response_text,
                        "success": True
                    }
                except (KeyError, IndexError) as e:
                    error_msg = f"Error parsing AI response: {e}, Response structure: {result}"
                    print(error_msg)
                    return {"subtasks": [], "response": error_msg, "success": False}
    except Exception as e:
        error_msg = f"Unexpected error in breakdown_task_sambanova: {str(e)}"
        print(error_msg)
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {"subtasks": [], "response": error_msg, "success": False}


async def breakdown_task_openrouter(
    task_title: str, 
    task_description: str = None, 
    custom_prompt: str = None, 
    messages: List[dict] = None
) -> dict:
    """Break down a task into subtasks using DeepSeek via OpenRouter API"""
    try:
        print(f"Starting breakdown_task_openrouter for: {task_title}")
        print(f"Description: {task_description}")
        print(f"Custom prompt: {custom_prompt}")
        print(f"Messages: {messages}")

        system_prompt = """You are a task breakdown assistant. Help users break down tasks into smaller, actionable subtasks.
Follow these rules:
1. Each subtask should be clear and actionable
2. Keep subtask titles concise (under 10 words)
3. Provide 3-5 subtasks initially
4. Format subtasks as a bullet point list with each subtask on a new line starting with '-'
5. If the user asks for changes or clarification, adjust your suggestions accordingly
6. Always maintain a helpful and collaborative tone"""

        # Build conversation
        if messages:
            # Use provided conversation history but ensure system prompt is first
            conversation = [{"role": "system", "content": system_prompt}]
            for msg in messages:
                if msg["role"] != "system":  # Skip any existing system messages
                    conversation.append(msg)
        else:
            # Create new conversation
            user_prompt = f"Break down this task into subtasks: {task_title}"
            if task_description:
                user_prompt += f"\nDescription: {task_description}"
            
            conversation = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": custom_prompt or user_prompt}
            ]

        print(f"Final conversation: {conversation}")
        
        # Call OpenRouter API
        url = "https://openrouter.ai/api/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://ai-todo-app.com",
            "X-Title": "AI-Todo App",
        }
        
        payload = {
            "model": "deepseek/deepseek-r1-zero:free",
            "messages": conversation,
            "temperature": 0.7,
            "max_tokens": 800
        }
        
        print(f"Calling OpenRouter API at: {url}")
        
        response = requests.post(url, headers=headers, json=payload)
        
        print(f"OpenRouter API Response Status: {response.status_code}")
        
        if response.status_code != 200:
            error_msg = f"Error from OpenRouter API: Status {response.status_code}, Response: {response.text}"
            print(error_msg)
            return {"subtasks": [], "response": error_msg, "success": False}
        
        result = response.json()
        
        try:
            # Get AI's response from the choices
            message = result.get("choices", [{}])[0].get("message", {})
            content = message.get("content", "")
            
            # Check if content is empty but reasoning is available
            if not content and "reasoning" in message:
                content = message["reasoning"]
            
            # Clean up the response if needed
            if content.startswith("\\boxed{") and content.endswith("}"):
                content = content[len("\\boxed{"):].rstrip("}")
            
            # If content is still empty, try to extract from the raw response
            if not content:
                print("Warning: Empty content in OpenRouter API response")
                # Try to extract content from the raw response
                if "choices" in result and len(result["choices"]) > 0:
                    # Try to get any text from the response
                    for key in ["text", "message", "completion"]:
                        if key in result["choices"][0]:
                            content = result["choices"][0][key]
                            if isinstance(content, dict) and "content" in content:
                                content = content["content"]
                            break
                
                # If still empty, use a fallback message
                if not content:
                    content = "I couldn't break down this task. Please try again with more details."
            
            print(f"Final content: {content}")
            
            # Extract subtasks from the content
            subtasks = []
            for line in content.split('\n'):
                line = line.strip()
                if line and (line.startswith('-') or line.startswith('•')):
                    # Remove leading dash/bullet and whitespace
                    title = line.lstrip('-•* ').strip()
                    if title:
                        subtasks.append({"title": title})
            
            # If no subtasks were found with bullet points, try to find numbered items
            if not subtasks:
                import re
                # Look for numbered items like "1. Task description"
                numbered_items = re.findall(r'^\d+\.\s+(.+)$', content, re.MULTILINE)
                for item in numbered_items:
                    if item.strip():
                        subtasks.append({"title": item.strip()})
            
            print(f"Extracted subtasks: {subtasks}")
            
            # Return both the response and any subtasks found
            return {
                "subtasks": subtasks,
                "response": content,
                "success": True
            }
        except Exception as e:
            error_msg = f"Error parsing OpenRouter API response: {str(e)}"
            print(error_msg)
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return {"subtasks": [], "response": error_msg, "success": False}
    except Exception as e:
        error_msg = f"Unexpected error in breakdown_task_openrouter: {str(e)}"
        print(error_msg)
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {"subtasks": [], "response": error_msg, "success": False}

async def chat_about_goals(message: str, goals_data: List[dict], provider: str = "openrouter") -> str:
    """
    Chat with the AI about goals and get personalized advice.
    
    Args:
        message: The user's message
        goals_data: List of formatted goal data
        provider: LLM provider to use ("openrouter" for DeepSeek via OpenRouter or "sambanova")
        
    Returns:
        str: The AI's response
    """
    if provider == "sambanova":
        # Not implemented yet
        raise NotImplementedError("SambaNova provider not implemented for goal chat")
    else:
        return await chat_about_goals_openrouter(message, goals_data)

async def chat_about_goals_openrouter(message: str, goals_data: List[dict]) -> str:
    """Chat with the AI about goals using DeepSeek via OpenRouter API"""
    
    # Prepare the prompt with goals data
    goals_summary = "\n".join([
        f"Goal {i+1}: {goal['title']} (Priority: {goal['priority'] or 'None'})" +
        f"\n   Description: {goal['description'] or 'No description'}" +
        f"\n   Targets: {', '.join([t['title'] for t in goal['targets']]) if goal['targets'] else 'No targets'}" +
        f"\n   Tasks: {goal['completed_tasks_count']}/{goal['tasks_count']} completed"
        for i, goal in enumerate(goals_data)
    ])
    
    prompt = f"""
You are an AI goal coach for a productivity app. The user has the following goals:

{goals_summary}

The user's message is: "{message}"

Provide helpful, actionable advice based on their goals and message. Consider:
1. Goal priorities and deadlines
2. Progress on tasks and targets
3. Potential obstacles or challenges
4. Specific next steps they could take
5. Goal structure recommendations (e.g., adding targets, metrics, or breaking down into smaller tasks)

Your response should be conversational, encouraging, and focused on helping them make progress.
"""
    
    # Call OpenRouter API
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-todo-app.com",
        "X-Title": "AI-Todo App",
    }
    
    payload = {
        "model": "deepseek/deepseek-r1-zero:free",
        "messages": [
            {"role": "system", "content": "You are a helpful AI goal coach for a productivity app."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,  # Slightly higher temperature for more conversational responses
        "max_tokens": 1000
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f"OpenRouter API returned status {response.status_code}: {response.text}")
        
        result = response.json()
        
        # Extract the assistant's message
        if "choices" in result and len(result["choices"]) > 0:
            message = result["choices"][0]["message"]
            content = message.get("content", "")
            
            return content
        else:
            raise Exception("Invalid response format from OpenRouter API")
            
    except Exception as e:
        logger.error(f"Error in chat_about_goals_openrouter: {str(e)}")
        raise
