import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App General Settings
    APP_NAME: str = "SmartSAS Core Backend"
    SECRET_KEY: str = "SUPER_SECRET_JWT_KEY_CHANGE_IN_PRODUCTION_123456"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # DB settings
    # Default to sqlite local if POSTGRES_DB is not defined
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    # Redis settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # ML service endpoint
    ML_SERVICE_URL: str = os.getenv("ML_SERVICE_URL", "http://localhost:8001")

    @property
    def DATABASE_URL(self) -> str:
        if self.POSTGRES_DB:
            return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        # Fallback to local SQLite for instant out-of-box run
        return "sqlite:///./smart_attendance.db"

settings = Settings()

# Setup database engine
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite requires connect_args for multithreading
    engine = create_engine(
        settings.DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
