from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routers import tasks, goals, metrics, experiences, strategies, conversations, notes, situations
from .database import engine, Base
from .core.config import settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    # Create FastAPI app
    app = FastAPI()

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
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
    app.include_router(notes.router)
    app.include_router(situations.router)
    
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
