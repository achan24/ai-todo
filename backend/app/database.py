import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Get database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Check if using PostgreSQL (Supabase)
if DATABASE_URL.startswith("postgresql"):
    # Add SSL mode for PostgreSQL connections if not already present
    if "sslmode=" not in DATABASE_URL:
        DATABASE_URL += "?sslmode=require"
    
    # Create engine with connection pooling settings
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,     # Check connection before using
        pool_recycle=300,       # Recycle connections every 5 minutes
        pool_size=5,            # Base pool size
        max_overflow=10,        # Allow up to 10 additional connections
        connect_args={"connect_timeout": 10}  # Connection timeout in seconds
    )
    logger.info("Using PostgreSQL database with connection pooling")
else:
    # Fallback to SQLite for development
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    logger.info("Using SQLite database")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_fresh_db():
    """Get a fresh database session that can be used outside of FastAPI dependency injection"""
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        logger.error(f"Error creating fresh database session: {str(e)}")
        db.close()
        raise
