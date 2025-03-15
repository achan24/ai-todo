#!/usr/bin/env python3
"""
Simple script to test the enhanced goal recommendation functionality
"""
import sys
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_recommender_service import create_fallback_goal_recommendation
from app.schemas.goal import Goal, GoalTarget, Metric
from app.schemas.task import Task

# Create mock classes for testing
class MockGoal(Goal):
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
        
class MockGoalTarget(GoalTarget):
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
        
class MockMetric(Metric):
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
        
class MockTask(Task):
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)

def main():
    """Test the enhanced goal recommendation functionality"""
    print("\n=== Testing Enhanced Goal Recommendation ===")
    
    # Create test goals
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
            subgoals=[],
            user_id=1
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
            subgoals=[],
            user_id=1
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
            subgoals=[],
            user_id=1
        )
    ]

    try:
        # Get recommendation
        recommendation = create_fallback_goal_recommendation(goals)
        
        # Print the recommendation details
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
                
        # Verify the recommendation is for the high priority goal with approaching deadline
        assert str(recommendation.id) == "1", f"Expected goal 1, got {recommendation.id}"
        assert "deadline" in recommendation.reasoning.lower(), "Reasoning should mention deadline"
        
        # Find the target step
        target_step = next((step for step in recommendation.next_steps if step["type"] == "target"), None)
        assert target_step is not None, "Should have a target step"
        assert "target with close deadline" in target_step["description"].lower(), "Target step should mention close deadline"
        
        print("\n✅ All checks passed!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1
        
    return 0

if __name__ == "__main__":
    sys.exit(main())
