import pytest
from datetime import datetime, timedelta
from app.schemas.task import TaskCreate, PriorityEnum
from app.models.task import Task

def test_create_task(client, test_user):
    task_data = {
        "title": "Test Task",
        "description": "Test Description",
        "priority": "high",
        "due_date": (datetime.utcnow() + timedelta(days=1)).isoformat()
    }
    
    response = client.post(
        "/api/tasks/",
        json=task_data,
        headers={"Authorization": f"Bearer {test_user['access_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == task_data["title"]
    assert data["description"] == task_data["description"]
    assert data["priority"] == task_data["priority"]
    assert "id" in data
    assert data["user_id"] == test_user["id"]

def test_get_tasks(client, test_user, db):
    # Create some test tasks
    tasks = [
        Task(
            title=f"Test Task {i}",
            priority=PriorityEnum.medium,
            user_id=test_user["id"]
        )
        for i in range(3)
    ]
    for task in tasks:
        db.add(task)
    db.commit()

    response = client.get(
        "/api/tasks/",
        headers={"Authorization": f"Bearer {test_user['access_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert all(task["user_id"] == test_user["id"] for task in data)

def test_update_task(client, test_user, db):
    # Create a test task
    task = Task(
        title="Original Title",
        priority=PriorityEnum.low,
        user_id=test_user["id"]
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    update_data = {
        "title": "Updated Title",
        "priority": "high"
    }
    
    response = client.put(
        f"/api/tasks/{task.id}",
        json=update_data,
        headers={"Authorization": f"Bearer {test_user['access_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["priority"] == update_data["priority"]

def test_delete_task(client, test_user, db):
    # Create a test task
    task = Task(
        title="Task to Delete",
        priority=PriorityEnum.medium,
        user_id=test_user["id"]
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    response = client.delete(
        f"/api/tasks/{task.id}",
        headers={"Authorization": f"Bearer {test_user['access_token']}"}
    )
    
    assert response.status_code == 204
    # Verify task is deleted
    deleted_task = db.query(Task).filter(Task.id == task.id).first()
    assert deleted_task is None

def test_get_next_task(client, test_user, db):
    # Create multiple tasks with different priorities
    tasks = [
        Task(
            title="High Priority Task",
            priority=PriorityEnum.high,
            due_date=datetime.utcnow() + timedelta(days=1),
            user_id=test_user["id"]
        ),
        Task(
            title="Medium Priority Task",
            priority=PriorityEnum.medium,
            due_date=datetime.utcnow() + timedelta(days=2),
            user_id=test_user["id"]
        ),
        Task(
            title="Low Priority Task",
            priority=PriorityEnum.low,
            due_date=datetime.utcnow() + timedelta(days=3),
            user_id=test_user["id"]
        )
    ]
    for task in tasks:
        db.add(task)
    db.commit()

    response = client.get(
        "/api/tasks/next",
        headers={"Authorization": f"Bearer {test_user['access_token']}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "ai_confidence" in data
    assert "reasoning" in data
    assert data["priority"] == "high"  # Should recommend highest priority task

def test_unauthorized_access(client):
    response = client.get("/api/tasks/")
    assert response.status_code == 401

def test_access_other_user_task(client, test_user, db):
    # Create a task for another user
    other_task = Task(
        title="Other User's Task",
        priority=PriorityEnum.medium,
        user_id=test_user["id"] + 1  # Different user ID
    )
    db.add(other_task)
    db.commit()
    db.refresh(other_task)

    response = client.get(
        f"/api/tasks/{other_task.id}",
        headers={"Authorization": f"Bearer {test_user['access_token']}"}
    )
    
    assert response.status_code == 404  # Task should not be found for this user
