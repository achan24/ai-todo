from typing import List
from ..models.task import Task
from ..schemas.task import TaskWithAIRecommendation
import aiohttp
from ..core.config import settings

async def get_task_recommendation(tasks: List[Task]) -> TaskWithAIRecommendation:
    """
    Get AI recommendation for which task to do next.
    Uses SambaNova's API to analyze tasks and provide intelligent recommendations.
    """
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
                # Fallback to simple priority-based recommendation if AI fails
                return create_fallback_recommendation(tasks)
            
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
