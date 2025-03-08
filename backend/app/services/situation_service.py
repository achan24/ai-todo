from sqlalchemy.orm import Session
from typing import List, Optional
from ..models import Situation, Phase
from ..schemas.situation import SituationCreate, SituationUpdate, PhaseCreate, PhaseUpdate

def get_situations(db: Session, goal_id: int, skip: int = 0, limit: int = 100):
    """Get all situations for a specific goal."""
    return db.query(Situation).filter(Situation.goal_id == goal_id).offset(skip).limit(limit).all()

def get_situation(db: Session, situation_id: int):
    """Get a specific situation by ID."""
    return db.query(Situation).filter(Situation.id == situation_id).first()

def create_situation(db: Session, situation: SituationCreate):
    """Create a new situation with optional phases."""
    # Create the situation
    db_situation = Situation(
        title=situation.title,
        description=situation.description,
        situation_type=situation.situation_type,
        start_time=situation.start_time,
        end_time=situation.end_time,
        outcome=situation.outcome,
        score=situation.score,
        lessons_learned=situation.lessons_learned,
        goal_id=situation.goal_id
    )
    db.add(db_situation)
    db.commit()
    db.refresh(db_situation)
    
    # Create phases if provided
    if situation.phases:
        for phase_data in situation.phases:
            db_phase = Phase(
                phase_name=phase_data.phase_name,
                approach_used=phase_data.approach_used,
                effectiveness_score=phase_data.effectiveness_score,
                response_outcome=phase_data.response_outcome,
                notes=phase_data.notes,
                situation_id=db_situation.id
            )
            db.add(db_phase)
        
        db.commit()
        db.refresh(db_situation)
    
    return db_situation

def update_situation(db: Session, situation_id: int, situation: SituationUpdate):
    """Update an existing situation."""
    db_situation = get_situation(db, situation_id)
    if db_situation is None:
        return None
    
    # Update situation fields if they are provided
    for key, value in situation.dict(exclude_unset=True).items():
        setattr(db_situation, key, value)
    
    db.commit()
    db.refresh(db_situation)
    return db_situation

def delete_situation(db: Session, situation_id: int):
    """Delete a situation."""
    db_situation = get_situation(db, situation_id)
    if db_situation is None:
        return False
    
    db.delete(db_situation)
    db.commit()
    return True

# Phase-related functions

def get_phases(db: Session, situation_id: int, skip: int = 0, limit: int = 100):
    """Get all phases for a specific situation."""
    return db.query(Phase).filter(Phase.situation_id == situation_id).offset(skip).limit(limit).all()

def get_phase(db: Session, phase_id: int):
    """Get a specific phase by ID."""
    return db.query(Phase).filter(Phase.id == phase_id).first()

def create_phase(db: Session, phase: PhaseCreate):
    """Create a new phase."""
    db_phase = Phase(
        phase_name=phase.phase_name,
        approach_used=phase.approach_used,
        effectiveness_score=phase.effectiveness_score,
        response_outcome=phase.response_outcome,
        notes=phase.notes,
        situation_id=phase.situation_id
    )
    db.add(db_phase)
    db.commit()
    db.refresh(db_phase)
    return db_phase

def update_phase(db: Session, phase_id: int, phase: PhaseUpdate):
    """Update an existing phase."""
    db_phase = get_phase(db, phase_id)
    if db_phase is None:
        return None
    
    # Update phase fields if they are provided
    for key, value in phase.dict(exclude_unset=True).items():
        setattr(db_phase, key, value)
    
    db.commit()
    db.refresh(db_phase)
    return db_phase

def delete_phase(db: Session, phase_id: int):
    """Delete a phase."""
    db_phase = get_phase(db, phase_id)
    if db_phase is None:
        return False
    
    db.delete(db_phase)
    db.commit()
    return True
