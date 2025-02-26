from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.goal import Metric
from ..schemas.goal import MetricCreate, Metric as MetricSchema, MetricUpdate

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.get("/", response_model=List[MetricSchema])
def get_metrics(db: Session = Depends(get_db)):
    """Get all metrics for the current user"""
    return db.query(Metric).filter(Metric.user_id == 1).all()

@router.post("/", response_model=MetricSchema)
def create_metric(metric: MetricCreate, db: Session = Depends(get_db)):
    """Create a new metric"""
    try:
        db_metric = Metric(
            name=metric.name,
            description=metric.description,
            type=metric.type,
            unit=metric.unit,
            target_value=metric.target_value,
            current_value=metric.current_value,
            goal_id=metric.goal_id,
            user_id=1
        )
        db.add(db_metric)
        db.commit()
        db.refresh(db_metric)
        return db_metric
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{metric_id}", response_model=MetricSchema)
def get_metric(metric_id: int, db: Session = Depends(get_db)):
    """Get a specific metric"""
    metric = db.query(Metric).filter(Metric.id == metric_id, Metric.user_id == 1).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    return metric

@router.put("/{metric_id}", response_model=MetricSchema)
def update_metric(metric_id: int, metric: MetricUpdate, db: Session = Depends(get_db)):
    """Update a metric"""
    db_metric = db.query(Metric).filter(Metric.id == metric_id, Metric.user_id == 1).first()
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

@router.delete("/{metric_id}")
def delete_metric(metric_id: int, db: Session = Depends(get_db)):
    """Delete a metric"""
    db_metric = db.query(Metric).filter(Metric.id == metric_id, Metric.user_id == 1).first()
    if not db_metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    try:
        db.delete(db_metric)
        db.commit()
        return {"message": "Metric deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
