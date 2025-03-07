from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..dependencies import get_db
from ..schemas.note import Note as NoteSchema, NoteCreate, NoteUpdate
from ..services import note_service

router = APIRouter(
    prefix="/api",
    tags=["notes"],
    responses={404: {"description": "Not found"}},
)

@router.get("/goals/{goal_id}/notes", response_model=List[NoteSchema])
def get_notes_for_goal(goal_id: int, db: Session = Depends(get_db)):
    """Get all notes for a specific goal."""
    notes = note_service.get_notes(db, goal_id)
    return [note_service.prepare_note_for_response(note) for note in notes]

@router.post("/goals/{goal_id}/notes", response_model=NoteSchema, status_code=status.HTTP_201_CREATED)
def create_note_for_goal(goal_id: int, note: NoteCreate, db: Session = Depends(get_db)):
    """Create a new note for a specific goal."""
    # Ensure the note is associated with the correct goal
    note.goal_id = goal_id
    db_note = note_service.create_note(db, note)
    return note_service.prepare_note_for_response(db_note)

@router.get("/notes/{note_id}", response_model=NoteSchema)
def get_note(note_id: int, db: Session = Depends(get_db)):
    """Get a specific note by ID."""
    db_note = note_service.get_note(db, note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note_service.prepare_note_for_response(db_note)

@router.put("/notes/{note_id}", response_model=NoteSchema)
def update_note(note_id: int, note: NoteUpdate, db: Session = Depends(get_db)):
    """Update a specific note."""
    db_note = note_service.update_note(db, note_id, note)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note_service.prepare_note_for_response(db_note)

@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    """Delete a specific note."""
    success = note_service.delete_note(db, note_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found")
    return None
