from sqlalchemy.orm import Session
from ..models import Note
from ..schemas.note import NoteCreate, NoteUpdate

def get_notes(db: Session, goal_id: int, skip: int = 0, limit: int = 100):
    """Get all notes for a specific goal."""
    return db.query(Note).filter(Note.goal_id == goal_id).offset(skip).limit(limit).all()

def get_note(db: Session, note_id: int):
    """Get a specific note by ID."""
    return db.query(Note).filter(Note.id == note_id).first()

def create_note(db: Session, note: NoteCreate):
    """Create a new note."""
    db_note = Note(
        content=note.content,
        pinned=note.pinned,
        goal_id=note.goal_id
    )
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note

def update_note(db: Session, note_id: int, note: NoteUpdate):
    """Update an existing note."""
    db_note = get_note(db, note_id)
    if db_note is None:
        return None
    
    # Update fields if they are provided
    if note.content is not None:
        db_note.content = note.content
    if note.pinned is not None:
        db_note.pinned = note.pinned
    
    db.commit()
    db.refresh(db_note)
    return db_note

def delete_note(db: Session, note_id: int):
    """Delete a note."""
    db_note = get_note(db, note_id)
    if db_note is None:
        return False
    
    db.delete(db_note)
    db.commit()
    return True

def prepare_note_for_response(note):
    """Convert note object to a dictionary for API response."""
    return {
        "id": note.id,
        "content": note.content,
        "pinned": note.pinned,
        "goal_id": note.goal_id,
        "created_at": note.created_at,
        "updated_at": note.updated_at
    }
