import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "SmartSAS ML Inference Engine"
    DEBUG: bool = False
    
    # Path settings
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR: str = os.path.join(BASE_DIR, "data")
    FAISS_INDEX_PATH: str = os.path.join(DATA_DIR, "faiss_index.bin")
    ENROLLMENT_DB_PATH: str = os.path.join(DATA_DIR, "enrollment_db.json")
    
    # ML model parameters
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.5
    FACE_SIMILARITY_THRESHOLD: float = 0.65  # Adjust based on ArcFace cosine distance
    EMBEDDING_DIMENSION: int = 512
    
    # Dual-Mode ML Strategy
    # By default, use lighter face-recognition & Haar cascades if insightface isn't compiled
    ML_ENGINE_MODE: str = os.getenv("ML_ENGINE_MODE", "fallback")  # "production" or "fallback"

    # Liveness settings
    BLINK_THRESHOLD: float = 0.22
    BLINK_CONSEC_FRAMES: int = 3
    MOUTH_OPEN_THRESHOLD: float = 0.35
    HEAD_POSE_ANGLE_THRESHOLD: float = 20.0  # degrees for left/right turns

    class Config:
        env_prefix = "ML_"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.DATA_DIR, exist_ok=True)
