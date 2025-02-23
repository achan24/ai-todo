from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .routers import tasks, goals
from .database import engine, Base
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    # Create FastAPI app
    app = FastAPI(title="AI Todo API")
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3005"],  
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
    )
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Add routers
    app.include_router(tasks.router, prefix="/api")
    app.include_router(goals.router, prefix="/api")
    
    @app.get("/")
    async def root():
        return {"message": "AI Todo Backend API"}
        
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        logger.info(f"Request: {request.method} {request.url}")
        logger.info(f"Headers: {request.headers}")
        try:
            response = await call_next(request)
            logger.info(f"Response status: {response.status_code}")
            return response
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"detail": str(e)}
            )
    
    return app

app = create_app()
