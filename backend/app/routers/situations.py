from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..dependencies import get_db
from ..schemas.situation import Situation as SituationSchema, SituationCreate, SituationUpdate
from ..schemas.situation import Phase as PhaseSchema, PhaseCreate, PhaseUpdate
from ..services import situation_service

router = APIRouter(
    prefix="/api",
    tags=["situations"],
    responses={404: {"description": "Not found"}},
)

# Situation endpoints
@router.get("/goals/{goal_id}/situations", response_model=List[SituationSchema])
def get_situations_for_goal(goal_id: int, db: Session = Depends(get_db)):
    """Get all situations for a specific goal."""
    return situation_service.get_situations(db, goal_id)

@router.post("/goals/{goal_id}/situations", response_model=SituationSchema, status_code=status.HTTP_201_CREATED)
def create_situation_for_goal(goal_id: int, situation: SituationCreate, db: Session = Depends(get_db)):
    """Create a new situation for a specific goal."""
    # Ensure the situation is associated with the correct goal
    situation.goal_id = goal_id
    return situation_service.create_situation(db, situation)

@router.get("/situations/{situation_id}", response_model=SituationSchema)
def get_situation(situation_id: int, db: Session = Depends(get_db)):
    """Get a specific situation by ID."""
    db_situation = situation_service.get_situation(db, situation_id)
    if db_situation is None:
        raise HTTPException(status_code=404, detail="Situation not found")
    return db_situation

@router.put("/situations/{situation_id}", response_model=SituationSchema)
def update_situation(situation_id: int, situation: SituationUpdate, db: Session = Depends(get_db)):
    """Update a specific situation."""
    db_situation = situation_service.update_situation(db, situation_id, situation)
    if db_situation is None:
        raise HTTPException(status_code=404, detail="Situation not found")
    return db_situation

@router.delete("/situations/{situation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_situation(situation_id: int, db: Session = Depends(get_db)):
    """Delete a specific situation."""
    success = situation_service.delete_situation(db, situation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Situation not found")
    return None

# Phase endpoints
@router.get("/situations/{situation_id}/phases", response_model=List[PhaseSchema])
def get_phases_for_situation(situation_id: int, db: Session = Depends(get_db)):
    """Get all phases for a specific situation."""
    return situation_service.get_phases(db, situation_id)

@router.post("/situations/{situation_id}/phases", response_model=PhaseSchema, status_code=status.HTTP_201_CREATED)
def create_phase_for_situation(situation_id: int, phase: PhaseCreate, db: Session = Depends(get_db)):
    """Create a new phase for a specific situation."""
    # Ensure the phase is associated with the correct situation
    phase.situation_id = situation_id
    return situation_service.create_phase(db, phase)

@router.get("/phases/{phase_id}", response_model=PhaseSchema)
def get_phase(phase_id: int, db: Session = Depends(get_db)):
    """Get a specific phase by ID."""
    db_phase = situation_service.get_phase(db, phase_id)
    if db_phase is None:
        raise HTTPException(status_code=404, detail="Phase not found")
    return db_phase

@router.put("/phases/{phase_id}", response_model=PhaseSchema)
def update_phase(phase_id: int, phase: PhaseUpdate, db: Session = Depends(get_db)):
    """Update a specific phase."""
    db_phase = situation_service.update_phase(db, phase_id, phase)
    if db_phase is None:
        raise HTTPException(status_code=404, detail="Phase not found")
    return db_phase

@router.delete("/phases/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase(phase_id: int, db: Session = Depends(get_db)):
    """Delete a specific phase."""
    success = situation_service.delete_phase(db, phase_id)
    if not success:
        raise HTTPException(status_code=404, detail="Phase not found")
    return None
