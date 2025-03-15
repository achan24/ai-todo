"""
Test script for the AI Recommender Service
This script tests the DeepSeek LLM integration via OpenRouter
"""

import os
import sys
import json
import asyncio
from dotenv import load_dotenv
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from backend/.env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from app.services import ai_recommender_service

# Create a mock Task class to avoid SQLAlchemy relationship issues
@dataclass
class MockTask:
    id: int
    title: str
    description: str = None
    priority: str = "medium"
    due_date: datetime = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    completed: bool = False
    tags: List[str] = field(default_factory=list)
    is_starred: bool = False
    has_reminders: bool = False
    user_id: int = 1
    subtasks: List['MockTask'] = field(default_factory=list)
    parent_id: Optional[int] = None
    estimated_minutes: Optional[int] = None
    goal_id: Optional[int] = None
    metric_id: Optional[int] = None
    contribution_value: Optional[float] = None
    scheduled_time: Optional[datetime] = None
    completion_time: Optional[datetime] = None
    completion_order: Optional[int] = None
    
    # Convert to dictionary for easier handling
    def to_dict(self):
        return asdict(self)
    
    # Allow attribute access like SQLAlchemy model
    def __getattr__(self, name):
        if name in self.__dict__:
            return self.__dict__[name]
        return None

# Create mock classes for Goal, GoalTarget, and Metric
@dataclass
class MockMetric:
    id: int
    name: str
    description: str = ""
    type: str = "target"
    unit: str = ""
    target_value: Optional[float] = None
    current_value: float = 0
    goal_id: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    contributions_list: str = '[]'
    
    def __getattr__(self, name):
        if name in self.__dict__:
            return self.__dict__[name]
        return None

@dataclass
class MockGoalTarget:
    id: str
    title: str
    description: str = None
    deadline: Optional[datetime] = None
    status: str = "active"
    notes: str = '[]'
    goaltarget_parent_id: Optional[str] = None
    position: int = 0
    goal_id: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    children: List['MockGoalTarget'] = field(default_factory=list)
    
    def __getattr__(self, name):
        if name in self.__dict__:
            return self.__dict__[name]
        return None

@dataclass
class MockGoal:
    id: int
    title: str
    description: str = None
    priority: str = "medium"
    parent_id: Optional[int] = None
    current_strategy_id: Optional[int] = None
    user_id: int = 1
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    tasks: List[MockTask] = field(default_factory=list)
    metrics: List[MockMetric] = field(default_factory=list)
    targets: List[MockGoalTarget] = field(default_factory=list)
    experiences: List[Any] = field(default_factory=list)
    strategies: List[Any] = field(default_factory=list)
    conversations: List[Any] = field(default_factory=list)
    subgoals: List['MockGoal'] = field(default_factory=list)
    
    def __getattr__(self, name):
        if name in self.__dict__:
            return self.__dict__[name]
        return None

# Create some sample tasks for testing
def create_sample_tasks():
    """Create sample mock tasks for testing the AI recommender service"""
    now = datetime.now()
    
    tasks = [
        MockTask(
            id=1,
            title="Finish project report",
            description="Complete the quarterly project report with all metrics and analysis",
            priority="high",
            due_date=now + timedelta(days=1),
            created_at=now - timedelta(days=5),
            completed=False
        ),
        MockTask(
            id=2,
            title="Buy groceries",
            description="Get milk, eggs, bread, and vegetables",
            priority="medium",
            due_date=now + timedelta(days=2),
            created_at=now - timedelta(days=2),
            completed=False
        ),
        MockTask(
            id=3,
            title="Schedule dentist appointment",
            description="Call dentist to schedule annual checkup",
            priority="low",
            due_date=now + timedelta(days=14),
            created_at=now - timedelta(days=1),
            completed=False
        ),
        MockTask(
            id=4,
            title="Prepare presentation",
            description="Create slides for the team meeting next week",
            priority="high",
            due_date=now + timedelta(days=5),
            created_at=now - timedelta(days=3),
            completed=False
        )
    ]
    
    return tasks

# Create sample goals for testing
def create_sample_goals():
    """Create sample mock goals with varying structures for testing the AI recommender service"""
    now = datetime.now()
    
    # Create tasks for each goal
    fitness_tasks = [
        MockTask(
            id=101,
            title="Research gym memberships",
            description="Find the best gym membership options in the area",
            priority="medium",
            due_date=now + timedelta(days=3),
            created_at=now - timedelta(days=2),
            completed=False
        ),
        MockTask(
            id=102,
            title="Buy workout clothes",
            description="Get new shoes, shorts, and shirts for the gym",
            priority="low",
            due_date=now + timedelta(days=5),
            created_at=now - timedelta(days=1),
            completed=False
        )
    ]
    
    career_tasks = [
        MockTask(
            id=201,
            title="Update resume",
            description="Add recent projects and skills to resume",
            priority="high",
            due_date=now + timedelta(days=1),
            created_at=now - timedelta(days=3),
            completed=False
        ),
        MockTask(
            id=202,
            title="Prepare for interview",
            description="Research company and practice common questions",
            priority="high",
            due_date=now + timedelta(days=2),
            created_at=now - timedelta(days=1),
            completed=False
        )
    ]
    
    learning_tasks = [
        MockTask(
            id=301,
            title="Complete Python course module 3",
            description="Finish the advanced Python programming module",
            priority="medium",
            due_date=now + timedelta(days=7),
            created_at=now - timedelta(days=10),
            completed=False
        )
    ]
    
    # Create metrics for goals
    fitness_metrics = [
        MockMetric(
            id=1,
            name="Weekly workouts",
            description="Number of workouts completed per week",
            type="process",
            unit="workouts",
            target_value=4,
            current_value=2,
            goal_id=1
        ),
        MockMetric(
            id=2,
            name="Weight",
            description="Current weight",
            type="target",
            unit="kg",
            target_value=75,
            current_value=82,
            goal_id=1
        )
    ]
    
    career_metrics = [
        MockMetric(
            id=3,
            name="Job applications",
            description="Number of job applications submitted",
            type="process",
            unit="applications",
            target_value=10,
            current_value=3,
            goal_id=2
        )
    ]
    
    # Create targets for goals
    fitness_targets = [
        MockGoalTarget(
            id="t1",
            title="Run 5K without stopping",
            description="Build endurance to run 5 kilometers without breaks",
            deadline=now + timedelta(days=30),
            status="active",
            goal_id=1
        ),
        MockGoalTarget(
            id="t2",
            title="Bench press 100kg",
            description="Build strength to bench press 100kg",
            deadline=now + timedelta(days=90),
            status="active",
            goal_id=1
        )
    ]
    
    career_targets = [
        MockGoalTarget(
            id="t3",
            title="Get a job offer",
            description="Receive at least one job offer in the tech industry",
            deadline=now + timedelta(days=14),
            status="active",
            goal_id=2
        )
    ]
    
    learning_targets = [
        MockGoalTarget(
            id="t4",
            title="Complete Python certification",
            description="Finish the Python developer certification course",
            deadline=now + timedelta(days=60),
            status="active",
            goal_id=3
        )
    ]
    
    # Create goals with varying structures
    goals = [
        # Goal with high priority, targets with deadlines, metrics, and tasks
        MockGoal(
            id=1,
            title="Improve fitness",
            description="Get in better shape and improve overall health",
            priority="high",
            tasks=fitness_tasks,
            metrics=fitness_metrics,
            targets=fitness_targets
        ),
        
        # Goal with high priority, urgent deadline, and tasks
        MockGoal(
            id=2,
            title="Advance career",
            description="Find a better job in the tech industry",
            priority="high",
            tasks=career_tasks,
            metrics=career_metrics,
            targets=career_targets
        ),
        
        # Goal with medium priority, longer-term deadline, no metrics
        MockGoal(
            id=3,
            title="Learn Python programming",
            description="Become proficient in Python programming",
            priority="medium",
            tasks=learning_tasks,
            metrics=[],
            targets=learning_targets
        ),
        
        # Goal with low priority, no targets, no metrics, no tasks
        MockGoal(
            id=4,
            title="Read more books",
            description="Read at least 12 books this year",
            priority="low",
            tasks=[],
            metrics=[],
            targets=[]
        )
    ]
    
    return goals

# Create a custom function to test the OpenRouter recommendation directly
async def test_openrouter_recommendation_direct():
    """Test task recommendation using DeepSeek via OpenRouter directly"""
    print("\n=== Testing OpenRouter (DeepSeek) Task Recommendation ===")
    
    # Check if OpenRouter API key is set
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_api_key:
        print("Error: OPENROUTER_API_KEY environment variable not set")
        print("Make sure to set it in the backend/.env file")
        return
    
    tasks = create_sample_tasks()
    
    # Prepare the task data for the API
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
        "Authorization": f"Bearer {openrouter_api_key}",
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
        import requests
        print("Sending request to OpenRouter API...")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f"Error: OpenRouter API returned status {response.status_code}")
            print(f"Response: {response.text}")
            return None
        
        result = response.json()
        print("\nAPI Response:")
        print(json.dumps(result, indent=2))
        
        # Extract the assistant's message
        if "choices" in result and len(result["choices"]) > 0:
            message = result["choices"][0]["message"]
            content = message.get("content", "")
            reasoning = message.get("reasoning", "")
            
            # If content is empty but reasoning exists, use reasoning
            if not content and reasoning:
                print("\nContent is empty, using reasoning field instead:")
                print(reasoning)
                
                # Try to extract the recommendation from the reasoning text
                # Look for patterns like "task 1 should be prioritized" or "the task that should be done next is"
                import re
                
                # Look for task ID mentions
                task_id_matches = re.findall(r'task (\d+)', reasoning.lower())
                recommended_task_id = None
                
                # Look for conclusive statements about which task to do next
                conclusion_patterns = [
                    r'task (\d+) should be (?:done|prioritized|completed) (?:next|first)',
                    r'the task that should be done next is (?:task )?(\d+)',
                    r'recommend(?:ed)? task (\d+)',
                    r'task (\d+) is (?:the most|highest) (?:important|urgent|priority)',
                ]
                
                for pattern in conclusion_patterns:
                    matches = re.search(pattern, reasoning.lower())
                    if matches:
                        recommended_task_id = matches.group(1)
                        break
                
                # If no conclusive statement, use the most frequently mentioned task ID
                if not recommended_task_id and task_id_matches:
                    # Count occurrences of each task ID
                    from collections import Counter
                    task_counts = Counter(task_id_matches)
                    recommended_task_id = task_counts.most_common(1)[0][0]
                
                if recommended_task_id:
                    print(f"\nExtracted recommendation: Task {recommended_task_id}")
                    
                    # Find the task details
                    recommended_task = next((task for task in tasks if str(task.id) == recommended_task_id), None)
                    if recommended_task:
                        print(f"Title: {recommended_task.title}")
                        print(f"Priority: {recommended_task.priority}")
                        print(f"Due date: {recommended_task.due_date}")
                    else:
                        print(f"Warning: Could not find task with ID {recommended_task_id}")
                else:
                    print("\nWarning: Could not extract a task recommendation from the reasoning")
            else:
                # Parse the JSON response
                try:
                    recommendation = json.loads(content)
                    print("\nRecommendation:")
                    print(json.dumps(recommendation, indent=2))
                    
                    # Find the task details
                    recommended_task_id = recommendation.get("task_id")
                    if recommended_task_id:
                        recommended_task = next((task for task in tasks if str(task.id) == str(recommended_task_id)), None)
                        if recommended_task:
                            print(f"\nRecommended Task: {recommended_task.title}")
                            print(f"Priority: {recommended_task.priority}")
                            print(f"Due date: {recommended_task.due_date}")
                        else:
                            print(f"\nWarning: Could not find task with ID {recommended_task_id}")
                except json.JSONDecodeError:
                    print("\nWarning: Could not parse JSON response")
                    print(f"Content: {content}")
        else:
            print("\nWarning: No choices in API response")
    except Exception as e:
        print(f"\nError: {e}")

# Test the AI recommender service using the service function
async def test_task_recommendation_service():
    """Test task recommendation using the AI recommender service"""
    print("\n=== Testing Task Recommendation Service ===")
    
    # Check if OpenRouter API key is set
    if not os.getenv("OPENROUTER_API_KEY"):
        print("Error: OPENROUTER_API_KEY environment variable not set")
        print("Make sure to set it in the backend/.env file")
        return
    
    tasks = create_sample_tasks()
    
    try:
        # Call the service function
        print("Calling AI recommender service...")
        recommendation = await ai_recommender_service.get_task_recommendation(tasks, provider="openrouter")
        
        if recommendation:
            print("\nRecommendation:")
            print(f"Task ID: {recommendation.id}")
            print(f"Title: {recommendation.title}")
            print(f"Priority: {recommendation.priority}")
            print(f"Due date: {recommendation.due_date}")
            print(f"Confidence: {recommendation.ai_confidence}")
            print(f"Reasoning: {recommendation.reasoning}")
        else:
            print("\nWarning: No recommendation returned")
    except Exception as e:
        print(f"\nError: {e}")

# Test the goal recommendation functionality
async def test_goal_recommendation_service():
    """Test goal recommendation using the AI recommender service"""
    print("\n=== Testing Goal Recommendation Service ===")
    
    # Check if OpenRouter API key is set
    if not os.getenv("OPENROUTER_API_KEY"):
        print("Error: OPENROUTER_API_KEY environment variable not set")
        print("Make sure to set it in the backend/.env file")
        return
    
    goals = create_sample_goals()
    
    try:
        # Call the service function
        print("Calling AI recommender service for goal recommendation...")
        recommendation = await ai_recommender_service.get_goal_recommendation(goals, provider="openrouter")
        
        if recommendation:
            print("\nRecommendation:")
            print(f"Goal ID: {recommendation.id}")
            print(f"Title: {recommendation.title}")
            print(f"Priority: {recommendation.priority}")
            print(f"Confidence: {recommendation.ai_confidence}")
            print(f"Reasoning: {recommendation.reasoning}")
            print(f"Importance Score: {recommendation.importance_score}")
            print(f"Urgency Score: {recommendation.urgency_score}")
            
            if recommendation.next_steps:
                print("\nNext Steps:")
                for step in recommendation.next_steps:
                    print(f"- {step['description']} (Type: {step['type']})")
        else:
            print("\nWarning: No recommendation returned")
    except Exception as e:
        print(f"\nError: {e}")

# Test the fallback goal recommendation functionality
async def test_fallback_goal_recommendation():
    """Test the fallback goal recommendation functionality"""
    print("\n=== Testing Fallback Goal Recommendation ===")
    
    goals = [
        MockGoal(
            id="1",
            title="High Priority Goal with Approaching Deadline",
            description="This is a high priority goal with an approaching deadline",
            priority="high",
            created_at=datetime.now() - timedelta(days=30),
            updated_at=datetime.now() - timedelta(days=10),
            targets=[
                MockGoalTarget(
                    id="1",
                    title="Target with close deadline",
                    description="This target has a deadline coming up soon",
                    deadline=datetime.now() + timedelta(days=3),
                    status="active",
                    created_at=datetime.now() - timedelta(days=20),
                    updated_at=datetime.now() - timedelta(days=5),
                    children=[]
                )
            ],
            metrics=[
                MockMetric(
                    id="1",
                    name="Progress Metric",
                    description="Tracks progress",
                    type="number",
                    unit="points",
                    target_value=100,
                    current_value=25
                )
            ],
            tasks=[
                MockTask(
                    id="1",
                    title="High priority task",
                    description="This is a high priority task",
                    priority="high",
                    due_date=datetime.now() + timedelta(days=2),
                    completed=False,
                    created_at=datetime.now() - timedelta(days=15),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=5),
                    user_id="user1",
                    subtasks=[]
                ),
                MockTask(
                    id="2",
                    title="Completed task",
                    description="This task is already completed",
                    priority="medium",
                    due_date=None,
                    completed=True,
                    created_at=datetime.now() - timedelta(days=20),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=10),
                    user_id="user1",
                    subtasks=[]
                )
            ],
            subgoals=[]
        ),
        MockGoal(
            id="2",
            title="Medium Priority Goal with Inactive Status",
            description="This is a medium priority goal that hasn't been updated in a while",
            priority="medium",
            created_at=datetime.now() - timedelta(days=60),
            updated_at=datetime.now() - timedelta(days=20),
            targets=[],
            metrics=[],
            tasks=[
                MockTask(
                    id="3",
                    title="Medium priority task",
                    description="This is a medium priority task",
                    priority="medium",
                    due_date=None,
                    completed=False,
                    created_at=datetime.now() - timedelta(days=30),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=15),
                    user_id="user1",
                    subtasks=[]
                )
            ],
            subgoals=[]
        ),
        MockGoal(
            id="3",
            title="Low Priority Goal with Many Tasks",
            description="This is a low priority goal with many incomplete tasks",
            priority="low",
            created_at=datetime.now() - timedelta(days=45),
            updated_at=datetime.now() - timedelta(days=5),
            targets=[
                MockGoalTarget(
                    id="2",
                    title="Target with far deadline",
                    description="This target has a deadline far in the future",
                    deadline=datetime.now() + timedelta(days=30),
                    status="active",
                    created_at=datetime.now() - timedelta(days=15),
                    updated_at=datetime.now() - timedelta(days=5),
                    children=[]
                )
            ],
            metrics=[],
            tasks=[
                MockTask(
                    id="4",
                    title="Task 1",
                    description="Task 1",
                    priority="low",
                    due_date=None,
                    completed=False,
                    created_at=datetime.now() - timedelta(days=10),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=5),
                    user_id="user1",
                    subtasks=[]
                ),
                MockTask(
                    id="5",
                    title="Task 2",
                    description="Task 2",
                    priority="low",
                    due_date=None,
                    completed=False,
                    created_at=datetime.now() - timedelta(days=10),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=5),
                    user_id="user1",
                    subtasks=[]
                ),
                MockTask(
                    id="6",
                    title="Task 3",
                    description="Task 3",
                    priority="low",
                    due_date=None,
                    completed=False,
                    created_at=datetime.now() - timedelta(days=10),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=5),
                    user_id="user1",
                    subtasks=[]
                ),
                MockTask(
                    id="7",
                    title="Task 4",
                    description="Task 4",
                    priority="low",
                    due_date=None,
                    completed=False,
                    created_at=datetime.now() - timedelta(days=10),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=5),
                    user_id="user1",
                    subtasks=[]
                ),
                MockTask(
                    id="8",
                    title="Task 5",
                    description="Task 5",
                    priority="low",
                    due_date=None,
                    completed=False,
                    created_at=datetime.now() - timedelta(days=10),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=5),
                    user_id="user1",
                    subtasks=[]
                ),
                MockTask(
                    id="9",
                    title="Task 6",
                    description="Task 6",
                    priority="low",
                    due_date=None,
                    completed=False,
                    created_at=datetime.now() - timedelta(days=10),
                    tags=[],
                    is_starred=False,
                    has_reminders=False,
                    updated_at=datetime.now() - timedelta(days=5),
                    user_id="user1",
                    subtasks=[]
                )
            ],
            subgoals=[]
        )
    ]

    # Get recommendation
    recommendation = ai_recommender_service.create_fallback_goal_recommendation(goals)

    # Verify the recommendation is for the high priority goal with approaching deadline
    assert recommendation.id == "1"
    assert recommendation.ai_confidence is not None
    assert recommendation.reasoning is not None
    assert recommendation.importance_score is not None
    assert recommendation.urgency_score is not None
    assert len(recommendation.next_steps) > 0

    # Verify that the reasoning mentions the approaching deadline
    assert "deadline" in recommendation.reasoning.lower()
    
    # Verify that one of the next steps is to focus on the target with close deadline
    target_step = next((step for step in recommendation.next_steps if step["type"] == "target"), None)
    assert target_step is not None
    assert "target with close deadline" in target_step["description"].lower()

    # Test with empty goals list
    with pytest.raises(ValueError):
        ai_recommender_service.create_fallback_goal_recommendation([])

# Test task breakdown functionality directly
async def test_task_breakdown_direct():
    """Test task breakdown functionality using DeepSeek via OpenRouter directly"""
    print("\n=== Testing Task Breakdown ===")
    
    # Check if OpenRouter API key is set
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_api_key:
        print("Error: OPENROUTER_API_KEY environment variable not set")
        print("Make sure to set it in the backend/.env file")
        return
    
    task_title = "Build a personal website"
    task_description = "Create a portfolio website to showcase my projects and skills"
    
    try:
        # Call the service function
        print("Calling AI task breakdown service...")
        result = await ai_recommender_service.breakdown_task(
            task_title=task_title,
            task_description=task_description,
            provider="openrouter"
        )
        
        if result:
            print("\nTask Breakdown Result:")
            print(f"Success: {result['success']}")
            
            if result['subtasks']:
                print("\nSubtasks:")
                for i, subtask in enumerate(result['subtasks'], 1):
                    print(f"{i}. {subtask}")
            
            if 'error' in result and result['error']:
                print(f"\nError: {result['error']}")
        else:
            print("\nWarning: No result returned")
    except Exception as e:
        print(f"\nError: {e}")

# Run all tests
async def main():
    """Run all tests"""
    # Test task recommendation
    await test_openrouter_recommendation_direct()
    await test_task_recommendation_service()
    
    # Test goal recommendation
    await test_goal_recommendation_service()
    await test_fallback_goal_recommendation()
    
    # Test task breakdown
    await test_task_breakdown_direct()

if __name__ == "__main__":
    asyncio.run(main())
