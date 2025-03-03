from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routers import tasks, goals, metrics, experiences, strategies, conversations
from .database import engine, Base
from .core.config import settings
from .auth import get_current_user, User
import logging
import os
import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set app-specific modules to DEBUG level
for module in ['app.routers.goals', 'app.auth']:
    logging.getLogger(module).setLevel(logging.DEBUG)

def create_app():
    # Create FastAPI app
    app = FastAPI()

    # Configure CORS with origins from environment variable or settings
    cors_origins = os.getenv("BACKEND_CORS_ORIGINS")
    if cors_origins:
        try:
            # Try to parse the environment variable as a JSON list
            import json
            origins = json.loads(cors_origins)
            logger.info(f"Using CORS origins from environment: {origins}")
        except json.JSONDecodeError:
            # If not valid JSON, split by comma
            origins = [origin.strip() for origin in cors_origins.split(",")]
            logger.info(f"Using CORS origins from environment (comma-separated): {origins}")
    else:
        # Fall back to settings
        origins = settings.BACKEND_CORS_ORIGINS
        logger.info(f"Using CORS origins from settings: {origins}")
    
    # Add wildcard for development only
    is_development = os.getenv("ENVIRONMENT", "development").lower() == "development"
    if is_development and "*" not in origins:
        origins.append("*")
        logger.warning("Added wildcard (*) to CORS origins for development environment only")
    
    logger.info(f"Final CORS origins: {origins}")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Add routers
    app.include_router(tasks.router, prefix="/api", tags=["tasks"])
    app.include_router(goals.router, prefix="/api", tags=["goals"])
    app.include_router(metrics.router, prefix="/api", tags=["metrics"])
    app.include_router(experiences.router, prefix="/api", tags=["experiences"])
    app.include_router(strategies.router, prefix="/api", tags=["strategies"])
    app.include_router(conversations.router, prefix="/api", tags=["conversations"])
    
    # Add a test endpoint for CORS
    @app.get("/api/cors-test")
    async def cors_test():
        return {"message": "CORS is working!"}
        
    # Add health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint for monitoring and deployment platforms"""
        return {
            "status": "ok",
            "timestamp": datetime.datetime.now().isoformat(),
            "version": os.getenv("APP_VERSION", "development")
        }
    
    # Exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Global error handler caught: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc)},
        )
    
    @app.get("/")
    async def root():
        return {"message": "Welcome to the AI Todo API"}

    return app

app = create_app()
