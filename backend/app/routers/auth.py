from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import os
import jwt

from ..dependencies import get_db
from ..models.user import User
from ..core.supabase_auth import get_current_user

router = APIRouter()

@router.get("/me", response_model=dict)
async def get_current_user_info(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information about the currently authenticated user.
    This endpoint validates the Supabase JWT token and returns user info.
    """
    # Check if user exists in our database
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        # Create a new user record if this is their first login
        user = User(id=user_id, email="")  # Email will be updated from Supabase
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name
    }

@router.get("/validate-token")
async def validate_token(user_id: str = Depends(get_current_user)):
    """
    Simple endpoint to validate if a token is valid.
    Returns the user ID from the token if valid.
    """
    return {"valid": True, "user_id": user_id}
