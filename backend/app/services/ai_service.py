from typing import List
from ..models.task import Task
from ..schemas.task import TaskWithAIRecommendation
import aiohttp
from ..core.config import settings
import ssl
import json

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

async def breakdown_task(task_title: str, task_description: str = None, custom_prompt: str = None, messages: List[dict] = None) -> dict:
    """
    Break down a task into subtasks using SambaNova's chat API.
    Returns a dict with subtasks and AI response.
    """
    try:
        print(f"Starting breakdown_task for: {task_title}")
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
                    return {"subtasks": [], "response": error_msg}
                
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
                        "success": True  # Add success flag
                    }
                except (KeyError, IndexError) as e:
                    error_msg = f"Error parsing AI response: {e}, Response structure: {result}"
                    print(error_msg)
                    return {"subtasks": [], "response": error_msg, "success": False}
    except Exception as e:
        error_msg = f"Unexpected error in breakdown_task: {str(e)}"
        print(error_msg)
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {"subtasks": [], "response": error_msg, "success": False}
