import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock
from app.services.ai_service import get_task_recommendation, create_fallback_recommendation
from app.models.task import Task, PriorityEnum

@pytest.fixture
def sample_tasks():
    return [
        Task(
            id=1,
            title="Urgent Task",
            description="This needs to be done ASAP",
            priority=PriorityEnum.high,
            due_date=datetime.utcnow() + timedelta(days=1),
            created_at=datetime.utcnow(),
            user_id=1
        ),
        Task(
            id=2,
            title="Regular Task",
            description="Normal priority task",
            priority=PriorityEnum.medium,
            due_date=datetime.utcnow() + timedelta(days=3),
            created_at=datetime.utcnow(),
            user_id=1
        ),
        Task(
            id=3,
            title="Low Priority Task",
            description="Can wait",
            priority=PriorityEnum.low,
            due_date=datetime.utcnow() + timedelta(days=7),
            created_at=datetime.utcnow(),
            user_id=1
        )
    ]

@pytest.mark.asyncio
async def test_ai_recommendation_success(sample_tasks):
    mock_response = {
        "task_id": 1,
        "confidence": 0.95,
        "reasoning": "This task is urgent and high priority"
    }
    
    with patch('aiohttp.ClientSession.post') as mock_post:
        mock_post.return_value.__aenter__.return_value.status = 200
        mock_post.return_value.__aenter__.return_value.json = AsyncMock(
            return_value=mock_response
        )
        
        result = await get_task_recommendation(sample_tasks)
        
        assert result.id == 1
        assert result.ai_confidence == 0.95
        assert "urgent" in result.reasoning.lower()

@pytest.mark.asyncio
async def test_ai_recommendation_failure_fallback(sample_tasks):
    with patch('aiohttp.ClientSession.post') as mock_post:
        mock_post.return_value.__aenter__.return_value.status = 500
        
        result = await get_task_recommendation(sample_tasks)
        
        # Should fall back to highest priority task
        assert result.id == 1
        assert result.priority == PriorityEnum.high
        assert result.ai_confidence == 0.7  # Default fallback confidence

def test_fallback_recommendation(sample_tasks):
    result = create_fallback_recommendation(sample_tasks)
    
    # Should choose the high priority task with earliest due date
    assert result.id == 1
    assert result.priority == PriorityEnum.high
    assert result.ai_confidence == 0.7
    assert "priority" in result.reasoning.lower()

@pytest.mark.asyncio
async def test_ai_recommendation_empty_tasks():
    with pytest.raises(IndexError):
        await get_task_recommendation([])

@pytest.mark.asyncio
async def test_ai_recommendation_single_task(sample_tasks):
    single_task = [sample_tasks[0]]
    result = await get_task_recommendation(single_task)
    
    assert result.id == single_task[0].id
    assert result.ai_confidence > 0
    assert result.reasoning
