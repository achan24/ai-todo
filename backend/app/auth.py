import os
import jwt
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional

# Set up logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get Supabase JWT secret
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
if not SUPABASE_JWT_SECRET:
    raise ValueError("SUPABASE_JWT_SECRET environment variable is not set")

# Security scheme
security = HTTPBearer()

class User(BaseModel):
    id: str
    email: Optional[str] = None
    role: Optional[str] = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """
    Validate the JWT token from Supabase and return the user information.
    """
    token = credentials.credentials
    try:
        # Decode the JWT token
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"],
            options={"verify_signature": True}
        )
        
        # Extract user information from the token
        user_id = payload.get("sub")
        if not user_id:
            logger.error("No user_id (sub) found in JWT token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Log user ID for debugging
        logger.info(f"Authenticated user ID from JWT: {user_id}, type: {type(user_id)}")
        
        # Get additional user information if available
        user_email = payload.get("email")
        user_role = payload.get("role")
        
        user = User(id=user_id, email=user_email, role=user_role)
        logger.info(f"Created User object with ID: {user.id}, type: {type(user.id)}")
        
        return user
    except jwt.PyJWTError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
