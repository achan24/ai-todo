"""
Utility functions for the application.
"""
import logging
from typing import Any, Union
from uuid import UUID

logger = logging.getLogger(__name__)

def normalize_user_id(user_id: Union[str, UUID, Any]) -> str:
    """
    Normalize a user ID to a consistent string format.
    
    This function handles different formats of user IDs (UUID objects, strings with hyphens, etc.)
    and converts them to a consistent lowercase string without hyphens for comparison.
    
    Args:
        user_id: The user ID to normalize, can be a UUID object, string, or other type
        
    Returns:
        A normalized string representation of the user ID
    """
    try:
        logger.info(f"Normalizing user ID: {user_id}, type: {type(user_id)}")
        
        # Handle None values
        if user_id is None:
            logger.warning("Received None user ID")
            return ""
            
        # Convert to string first
        user_id_str = str(user_id)
        logger.info(f"User ID as string: {user_id_str}")
        
        # Remove hyphens and convert to lowercase
        normalized = user_id_str.lower().replace('-', '')
        logger.info(f"Normalized user ID: {normalized}")
        return normalized
    except Exception as e:
        logger.warning(f"Error normalizing user ID {user_id}: {str(e)}")
        return str(user_id)

def compare_user_ids(id1: Union[str, UUID, Any], id2: Union[str, UUID, Any]) -> bool:
    """
    Compare two user IDs for equality after normalization.
    
    Args:
        id1: First user ID
        id2: Second user ID
        
    Returns:
        True if the normalized IDs are equal, False otherwise
    """
    norm_id1 = normalize_user_id(id1)
    norm_id2 = normalize_user_id(id2)
    result = norm_id1 == norm_id2
    
    logger.info(f"Comparing user IDs: {id1} vs {id2}")
    logger.info(f"Normalized: {norm_id1} vs {norm_id2}")
    logger.info(f"Result: {result}")
    
    return result
