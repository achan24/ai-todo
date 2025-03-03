import os
import jwt
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Set up logging
logger = logging.getLogger(__name__)

# Get JWT secret from environment variables
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validate the JWT token from Supabase and extract the user ID.
    This replaces the previous OAuth2 password flow.
    """
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        user_id = payload.get("sub")
        logger.info(f"Decoded JWT token, user_id: {user_id}, type: {type(user_id)}")
        logger.info(f"Full payload: {payload}")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
