from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Todo"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3005", "http://localhost:8005"]
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/ai_todo")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # SambaNova AI
    SAMBANOVA_API_KEY: str = os.getenv("SAMBANOVA_API_KEY", "")
    SAMBANOVA_API_URL: str = os.getenv("SAMBANOVA_API_URL", "")
    
    # OpenRouter API (for DeepSeek LLM)
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

    class Config:
        case_sensitive = True

settings = Settings()
