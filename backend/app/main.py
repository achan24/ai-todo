from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import tasks, users, ai
from .core.config import settings

app = FastAPI(
    title="AI Todo API",
    description="API for AI-powered ADHD productivity system",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
