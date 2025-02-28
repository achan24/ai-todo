from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json
from datetime import datetime
import sys
import os

# Add the parent directory to sys.path so we can import our app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.models.task import Task
from app.models.goal import Metric, Goal
from app.models.experience import Experience
from app.models.strategy import Strategy
from app.database import Base

# Create database connection
DATABASE_URL = "sqlite:///./sql_app.db"  # Use the same database as the main app
engine = create_engine(DATABASE_URL)

# Create tables if they don't exist
print("Ensuring database tables exist...")
Base.metadata.create_all(bind=engine)

SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

def fix_metric_contributions():
    print("Checking all completed tasks with metrics...")
    
    # Get all completed tasks that have metrics
    completed_tasks = db.query(Task).filter(
        Task.completed == True,
        Task.metric_id.isnot(None),
        Task.contribution_value.isnot(None)
    ).all()
    
    print(f"Found {len(completed_tasks)} completed tasks with metrics")
    
    for task in completed_tasks:
        metric = db.query(Metric).filter(Metric.id == task.metric_id).first()
        if not metric:
            print(f"Warning: Task {task.id} references non-existent metric {task.metric_id}")
            continue
            
        try:
            contributions = json.loads(metric.contributions_list or '[]')
        except json.JSONDecodeError:
            contributions = []
            
        # Check if this task's contribution is already recorded
        task_contribution = next((c for c in contributions if c.get('task_id') == task.id), None)
        
        if not task_contribution:
            print(f"Adding missing contribution for task {task.id} to metric {metric.id}")
            # Add the contribution with the task's completion time
            contributions.append({
                "value": float(task.contribution_value),
                "task_id": task.id,
                "timestamp": task.completion_time.isoformat() if task.completion_time else datetime.utcnow().isoformat()
            })
            metric.contributions_list = json.dumps(contributions)
            db.add(metric)
            
    db.commit()
    print("Done fixing metric contributions")

if __name__ == "__main__":
    fix_metric_contributions()
