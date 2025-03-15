"""
Router for AI recommender service endpoints.
This is separate from any existing AI services.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models.task import Task
from ..models.goal import Goal
from ..schemas.task import TaskWithAIRecommendation
from ..schemas.goal import GoalWithAIRecommendation
from ..services import ai_recommender_service

router = APIRouter(
    prefix="/api/ai-recommender",
    tags=["AI Recommender"]
)

class ChatMessage(BaseModel):
    message: str

@router.post("/recommend-task", response_model=TaskWithAIRecommendation)
async def recommend_task(
    db: Session = Depends(get_db),
    provider: str = "openrouter"  # Default to OpenRouter/DeepSeek
):
    """
    Get AI recommendation for which task to do next.
    Uses the specified LLM provider to analyze tasks and provide intelligent recommendations.
    """
    # Get all tasks from the database
    tasks = db.query(Task).all()
    
    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks found")
    
    # Get recommendation from the AI recommender service
    recommendation = await ai_recommender_service.get_task_recommendation(tasks, provider)
    
    if not recommendation:
        raise HTTPException(status_code=500, detail="Failed to get AI recommendation")
    
    return recommendation

@router.post("/breakdown-task")
async def breakdown_task(
    task_id: int,
    custom_prompt: Optional[str] = None,
    provider: str = "openrouter",  # Default to OpenRouter/DeepSeek
    db: Session = Depends(get_db)
):
    """
    Break down a task into subtasks using the AI recommender service.
    """
    # Get the task from the database
    task = db.query(Task).filter(Task.id == task_id).first()
    
    if not task:
        raise HTTPException(status_code=404, detail=f"Task with ID {task_id} not found")
    
    # Call the AI recommender service to break down the task
    result = await ai_recommender_service.breakdown_task(
        task_title=task.title,
        task_description=task.description,
        custom_prompt=custom_prompt,
        provider=provider
    )
    
    return result

@router.post("/recommend-goal")
async def recommend_goal(
    db: Session = Depends(get_db),
    provider: str = "openrouter"  # Default to OpenRouter/DeepSeek
):
    """
    Get AI recommendation for which goal to focus on next.
    Uses the specified LLM provider to analyze goals and provide intelligent recommendations.
    """
    # Get all goals from the database
    goals = db.query(Goal).all()
    
    if not goals:
        raise HTTPException(status_code=404, detail="No goals found")
    
    # Get recommendation from the AI recommender service
    recommendations = await ai_recommender_service.get_top_goal_recommendations(goals, provider, top_n=3)
    
    if not recommendations:
        raise HTTPException(status_code=500, detail="Failed to get AI recommendation")
    
    return recommendations

@router.post("/chat-with-goals")
async def chat_with_goals(
    message: ChatMessage,
    db: Session = Depends(get_db),
    provider: str = "openrouter"  # Default to OpenRouter/DeepSeek
):
    """
    Chat with the AI about goals and get personalized advice.
    """
    # Get all goals from the database
    goals = db.query(Goal).all()
    
    if not goals:
        raise HTTPException(status_code=404, detail="No goals found")
    
    # Format goals data for the AI
    goals_data = []
    for goal in goals:
        goal_data = {
            "id": goal.id,
            "title": goal.title,
            "description": goal.description,
            "priority": goal.priority,
            "created_at": goal.created_at.isoformat(),
            "updated_at": goal.updated_at.isoformat(),
            "targets": [{"title": t.title, "deadline": t.deadline.isoformat() if t.deadline else None} for t in goal.targets],
            "tasks_count": len(goal.tasks) if goal.tasks else 0,
            "completed_tasks_count": len([t for t in goal.tasks if t.completed]) if goal.tasks else 0
        }
        goals_data.append(goal_data)
    
    # Call the OpenRouter API to get a response
    try:
        response = await ai_recommender_service.chat_about_goals(message.message, goals_data, provider)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get AI response: {str(e)}")
