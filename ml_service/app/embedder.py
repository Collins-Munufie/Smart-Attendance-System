import cv2
import numpy as np
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class FaceEmbedder:
    def __init__(self):
        self.mode = settings.ML_ENGINE_MODE
        self.dim = settings.EMBEDDING_DIMENSION
        logger.info(f"Initializing FaceEmbedder in {self.mode} mode")
        
        # Initialize a deterministic random projection matrix for fallback mode
        # This acts as a Locality-Sensitive Hashing (LSH) function, mapping
        # resized pixel space (112*112*3 = 37632) down to 512 dimensions.
        np.random.seed(42)  # Fixed seed ensures repeatability
        self.projection_matrix = np.random.normal(0, 1, (112 * 112 * 3, self.dim))
        
        if self.mode == "production":
            try:
                # Production mode loads an ONNX ArcFace model
                # e.g., insightface resnet50 model or MobileFaceNet
                import onnxruntime as ort
                model_path = os.path.join(settings.DATA_DIR, "arcface_mobilefacenet.onnx")
                if os.path.exists(model_path):
                    self.session = ort.InferenceSession(model_path)
                    self.has_onnx = True
                    logger.info("ONNX ArcFace model loaded successfully.")
                else:
                    self.has_onnx = False
                    logger.warning("ONNX ArcFace model not found at data directory. Falling back to projection mode.")
            except Exception as e:
                self.has_onnx = False
                logger.error(f"Failed to load ONNX embedder: {e}. Defaulting to projection model.")
        else:
            self.has_onnx = False

    def get_embedding(self, face_img: np.ndarray) -> np.ndarray:
        """
        Extracts a normalized 512-dim face embedding from a cropped BGR face image.
        """
        # Resize to standard size (ArcFace standard is 112x112)
        resized = cv2.resize(face_img, (112, 112))
        
        if self.has_onnx:
            try:
                # Preprocess image for ArcFace (normalize to [-1, 1], channel first)
                input_blob = resized.astype(np.float32)
                input_blob = (input_blob - 127.5) / 127.5
                input_blob = np.transpose(input_blob, (2, 0, 1))  # HWC to CHW
                input_blob = np.expand_dims(input_blob, axis=0)  # Add batch dim
                
                inputs = {self.session.get_inputs()[0].name: input_blob}
                embeddings = self.session.run(None, inputs)[0]
                
                # L2 normalize
                embedding = embeddings[0]
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
                return embedding
            except Exception as e:
                logger.error(f"ONNX inference failed: {e}. Using deterministic projection fallback.")
                
        # Deterministic Locality-Sensitive Projection (Fallback)
        # Rescale image pixels to [0, 1]
        flattened = (resized.astype(np.float32) / 255.0).flatten()
        # Compute projection
        projected = np.dot(flattened, self.projection_matrix)
        # Apply non-linearity (soft sigmoid-like clamping)
        projected = np.tanh(projected)
        # L2 normalize
        norm = np.linalg.norm(projected)
        if norm > 0:
            projected = projected / norm
            
        return projected

# Singleton instance
embedder = FaceEmbedder()
