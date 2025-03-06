import sys
import os
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.task import Task
from app.database import Base

# Create the database engine
DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def add_sample_starred_tasks():
    db = SessionLocal()
    
    try:
        # Get existing tasks
        tasks = db.query(Task).all()
        
        # If there are no tasks, create some sample tasks
        if not tasks:
            print("No tasks found. Creating sample tasks...")
            
            # Create sample tasks
            tasks = [
                Task(
                    title="Complete project proposal",
                    description="Draft the project proposal document with timeline and budget",
                    priority="high",
                    is_starred=True,
                    scheduled_time=datetime.datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
                ),
                Task(
                    title="Review code PR",
                    description="Review pull request #123 for the authentication module",
                    priority="medium",
                    is_starred=True,
                    scheduled_time=datetime.datetime.now().replace(hour=14, minute=0, second=0, microsecond=0)
                ),
                Task(
                    title="Team meeting",
                    description="Weekly team sync meeting",
                    priority="medium",
                    is_starred=True,
                    scheduled_time=datetime.datetime.now().replace(hour=15, minute=30, second=0, microsecond=0)
                ),
                Task(
                    title="Exercise",
                    description="30 minutes of cardio",
                    priority="low",
                    is_starred=True,
                    scheduled_time=datetime.datetime.now().replace(hour=18, minute=0, second=0, microsecond=0)
                ),
                Task(
                    title="Read documentation",
                    description="Read through the new API documentation",
                    priority="low",
                    is_starred=False
                )
            ]
            
            db.add_all(tasks)
            db.commit()
            print("Sample tasks created successfully!")
        else:
            # Star some existing tasks and add scheduled times
            for i, task in enumerate(tasks[:4]):  # Star the first 4 tasks
                task.is_starred = True
                # Schedule tasks throughout the day
                hour = 9 + (i * 2)  # 9am, 11am, 1pm, 3pm
                task.scheduled_time = datetime.datetime.now().replace(hour=hour, minute=0, second=0, microsecond=0)
            
            db.commit()
            print(f"Updated {min(4, len(tasks))} existing tasks with star status and scheduled times!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_sample_starred_tasks()
