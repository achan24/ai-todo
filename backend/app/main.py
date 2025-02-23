from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import tasks
from .database import create_tables

app = FastAPI(title="AI Todo API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3005"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])

# Create tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

@app.get("/")
async def root():
    return {"message": "Welcome to AI Todo API"}
