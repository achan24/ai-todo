from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.goal import Metric, Goal
from ..schemas.goal import MetricCreate, Metric as MetricSchema

router = APIRouter()

@router.post("/goals/{goal_id}/metrics", response_model=MetricSchema)
def create_metric(goal_id: int, metric: MetricCreate, db: Session = Depends(get_db)):
    # First check if the goal exists
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    try:
        db_metric = Metric(
            name=metric.name,
            description=metric.description,
            type=metric.type,
            unit=metric.unit,
            target_value=metric.target_value,
            current_value=metric.current_value,
            goal_id=goal_id
        )
        db.add(db_metric)
        db.commit()
        db.refresh(db_metric)
        return db_metric
    except Exception as e:
        db.rollback()
        print(f"Error creating metric: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/metrics/{metric_id}", response_model=MetricSchema)
def update_metric(metric_id: int, metric: MetricCreate, db: Session = Depends(get_db)):
    db_metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not db_metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    try:
        for key, value in metric.dict(exclude_unset=True).items():
            setattr(db_metric, key, value)
        
        db.commit()
        db.refresh(db_metric)
        return db_metric
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/metrics/{metric_id}")
def delete_metric(metric_id: int, db: Session = Depends(get_db)):
    db_metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not db_metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    try:
        db.delete(db_metric)
        db.commit()
        return {"message": "Metric deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
