from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routers import tasks, goals, metrics, experiences, strategies
from .database import engine, Base
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error handler caught: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )

def create_app():
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Add routers
    app.include_router(tasks.router, prefix="/api", tags=["tasks"])
    app.include_router(goals.router, prefix="/api", tags=["goals"])
    app.include_router(metrics.router, prefix="/api", tags=["metrics"])
    app.include_router(experiences.router, prefix="/api", tags=["experiences"])
    app.include_router(strategies.router, prefix="/api", tags=["strategies"])
    
    @app.get("/")
    async def root():
        return {"message": "Welcome to the AI Todo API"}

create_app()
