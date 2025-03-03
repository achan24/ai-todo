from pydantic import BaseModel, validator
from typing import Any
from uuid import UUID
import json

class BaseModelWithValidators(BaseModel):
    """Base model with common validators for UUID and JSON handling"""
    
    @validator('user_id', pre=True, check_fields=False)
    def convert_uuid_to_str(cls, v):
        """Convert UUID objects to strings"""
        if isinstance(v, UUID):
            return str(v)
        return v
    
    @validator('contributions_list', pre=True, check_fields=False)
    def ensure_contributions_list_is_string(cls, v):
        """Ensure contributions_list is a valid JSON string"""
        if v is None:
            return "[]"
        if isinstance(v, list):
            return json.dumps(v)
        if isinstance(v, str):
            # Validate that it's a valid JSON string
            try:
                json.loads(v)
                return v
            except json.JSONDecodeError:
                return "[]"
        return "[]"
    
    class Config:
        from_attributes = True
