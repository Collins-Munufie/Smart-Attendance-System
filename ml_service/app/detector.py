import cv2
import numpy as np
import logging
from typing import List, Tuple, Dict
from app.config import settings

logger = logging.getLogger(__name__)

class FaceDetector:
    def __init__(self):
        self.mode = settings.ML_ENGINE_MODE
        logger.info(f"Initializing FaceDetector in {self.mode} mode")
        
        # Load Haar Cascade as a universal reliable base
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        if self.mode == "production":
            try:
                # Production could load MTCNN or OpenCV's ResNet SSD DNN
                # Let's write a robust OpenCV DNN detector which is production grade
                # and doesn't require compiling complex C-libs.
                model_dir = settings.DATA_DIR
                prototxt_path = os.path.join(model_dir, "deploy.prototxt")
                caffemodel_path = os.path.join(model_dir, "res10_300x300_ssd_iter_140000.caffemodel")
                
                # Check if model files exist, if not, we will fall back or download
                if os.path.exists(prototxt_path) and os.path.exists(caffemodel_path):
                    self.net = cv2.dnn.readNetFromCaffe(prototxt_path, caffemodel_path)
                    self.has_dnn = True
                    logger.info("OpenCV DNN Face Detector initialized successfully.")
                else:
                    self.has_dnn = False
                    logger.warning("DNN face model files not found. Using Haar Cascades as fallback.")
            except Exception as e:
                self.has_dnn = False
                logger.error(f"Failed to load DNN Detector: {e}. Defaulting to Haar Cascades.")
        else:
            self.has_dnn = False

    def detect(self, img: np.ndarray) -> List[Dict[str, any]]:
        """
        Detects faces in a numpy image (BGR).
        Returns a list of dicts: [{'box': [x, y, w, h], 'confidence': float}]
        """
        h, w = img.shape[:2]
        results = []
        
        if self.has_dnn:
            # OpenCV ResNet SSD DNN detection
            blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
            self.net.setInput(blob)
            detections = self.net.forward()
            
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence > settings.DETECTION_CONFIDENCE_THRESHOLD:
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    (startX, startY, endX, endY) = box.astype("int")
                    # Ensure coordinates are within image
                    startX = max(0, startX)
                    startY = max(0, startY)
                    endX = min(w - 1, endX)
                    endY = min(h - 1, endY)
                    
                    results.append({
                        "box": [int(startX), int(startY), int(endX - startX), int(endY - startY)],
                        "confidence": float(confidence)
                    })
        else:
            # Haar Cascade detection
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray, 
                scaleFactor=1.1, 
                minNeighbors=5, 
                minSize=(30, 30)
            )
            for (x, y, w_box, h_box) in faces:
                results.append({
                    "box": [int(x), int(y), int(w_box), int(h_box)],
                    "confidence": 1.0  # Haar Cascade doesn't supply numerical probabilities easily
                })
                
        return results

# Singleton instance
detector = FaceDetector()
