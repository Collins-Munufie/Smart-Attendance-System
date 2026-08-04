import base64
import cv2
import numpy as np
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

from app.config import settings
from app.detector import detector
from app.embedder import embedder
from app.liveness import liveness_detector
from app.vector_db import vector_db

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="Microservice providing face detection, ArcFace embedding extraction, FAISS vector search, and MediaPipe liveness detection.",
    version="1.0.0"
)

# Enable CORS for cross-service calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to decode images
def decode_base64_image(base64_str: str) -> np.ndarray:
    """Decodes a base64 string or Data URL into an OpenCV image (BGR)."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Decoded image is None")
        return img
    except Exception as e:
        logger.error(f"Image decode failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

# Pydantic schemas
class Base64ImageRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image string or Data URL")

class SearchEmbeddingRequest(BaseModel):
    embedding: List[float] = Field(..., description="512-dimensional face embedding vector")
    top_k: int = Field(1, description="Number of matches to return")

class SearchImageRequest(BaseModel):
    image: str = Field(..., description="Base64 image to search in database")
    top_k: int = Field(1, description="Number of matches to return")

class EnrollRequest(BaseModel):
    user_id: str = Field(..., description="Enterprise User ID")
    images: List[str] = Field(..., description="List of base64 encoded face images for enrollment")

class LivenessChallengeRequest(BaseModel):
    image: str = Field(..., description="Base64 image frame")
    challenge_type: str = Field("blink", description="Type of challenge: blink, turn_left, turn_right, nod_up, smile, center")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "engine_mode": settings.ML_ENGINE_MODE,
        "faiss_count": vector_db.index.ntotal if vector_db.faiss_available else len(vector_db.fallback_vectors),
        "faiss_enabled": vector_db.faiss_available,
        "mediapipe_enabled": liveness_detector.mp_available
    }

@app.post("/detect")
async def detect_faces(request: Base64ImageRequest):
    img = decode_base64_image(request.image)
    faces = detector.detect(img)
    return {"faces": faces, "count": len(faces)}

@app.post("/embed")
async def extract_embeddings(request: Base64ImageRequest):
    img = decode_base64_image(request.image)
    faces = detector.detect(img)
    
    if not faces:
        return {"embeddings": [], "count": 0}
        
    embeddings_list = []
    h, w = img.shape[:2]
    
    for face in faces:
        x, y, fw, fh = face["box"]
        # Ensure crop coordinates are valid
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w, x + fw), min(h, y + fh)
        
        cropped_face = img[y1:y2, x1:x2]
        if cropped_face.size == 0:
            continue
            
        emb = embedder.get_embedding(cropped_face)
        embeddings_list.append({
            "box": face["box"],
            "confidence": face["confidence"],
            "embedding": emb.tolist()
        })
        
    return {"embeddings": embeddings_list, "count": len(embeddings_list)}

@app.post("/search")
async def search_embedding(request: SearchEmbeddingRequest):
    matches = vector_db.search_embedding(request.embedding, request.top_k)
    return {"matches": matches}

@app.post("/search-image")
async def search_image(request: SearchImageRequest):
    img = decode_base64_image(request.image)
    faces = detector.detect(img)
    
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected in the image for search")
        
    # Get embedding for the largest face
    faces.sort(key=lambda f: f["box"][2] * f["box"][3], reverse=True)
    x, y, fw, fh = faces[0]["box"]
    h, w = img.shape[:2]
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(w, x + fw), min(h, y + fh)
    
    cropped_face = img[y1:y2, x1:x2]
    emb = embedder.get_embedding(cropped_face)
    
    matches = vector_db.search_embedding(emb, request.top_k)
    
    # Check if top match is above our similarity threshold
    is_match = False
    top_match = None
    if matches and matches[0]["similarity"] >= settings.FACE_SIMILARITY_THRESHOLD:
        is_match = True
        top_match = matches[0]
        
    return {
        "face_detected": True,
        "box": faces[0]["box"],
        "confidence": faces[0]["confidence"],
        "matches": matches,
        "is_match": is_match,
        "matched_user": top_match
    }

@app.post("/enroll")
async def enroll_user(request: EnrollRequest):
    logger.info(f"Enrolling user {request.user_id} with {len(request.images)} samples")
    
    successful_samples = 0
    embeddings_to_enroll = []
    
    for idx, img_b64 in enumerate(request.images):
        try:
            img = decode_base64_image(img_b64)
            faces = detector.detect(img)
            
            if not faces:
                logger.warning(f"Enroll sample {idx} failed: No face detected")
                continue
                
            # Take the primary face
            faces.sort(key=lambda f: f["box"][2] * f["box"][3], reverse=True)
            x, y, fw, fh = faces[0]["box"]
            h, w = img.shape[:2]
            x1, y1 = max(0, x), max(0, y)
            x2, y2 = min(w, x + fw), min(h, y + fh)
            
            cropped_face = img[y1:y2, x1:x2]
            emb = embedder.get_embedding(cropped_face)
            embeddings_to_enroll.append(emb)
            successful_samples += 1
        except Exception as e:
            logger.error(f"Enroll sample {idx} failed with error: {e}")
            
    if not embeddings_to_enroll:
        raise HTTPException(
            status_code=400, 
            detail="Failed to register face: No valid face samples could be detected"
        )
        
    # Average the embeddings to create a robust single face template for this user
    avg_embedding = np.mean(embeddings_to_enroll, axis=0)
    # Re-normalize average
    norm = np.linalg.norm(avg_embedding)
    if norm > 0:
        avg_embedding = avg_embedding / norm
        
    # Remove existing record if present to avoid duplication
    vector_db.remove_user(request.user_id)
    
    # Save the averaged embedding
    vector_db.add_embedding(request.user_id, avg_embedding)
    
    return {
        "success": True,
        "user_id": request.user_id,
        "samples_processed": len(request.images),
        "samples_successful": successful_samples
    }

@app.post("/remove-user")
async def remove_user(user_id: str):
    success = vector_db.remove_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found in vector database")
    return {"success": True, "message": f"User {user_id} embeddings successfully removed"}

@app.post("/verify-liveness")
async def verify_liveness(request: LivenessChallengeRequest):
    img = decode_base64_image(request.image)
    result = liveness_detector.analyze_frame(img, request.challenge_type)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
