import os
import cv2
import numpy as np
import logging
from typing import List, Tuple, Dict
from app.config import settings

logger = logging.getLogger(__name__)

# Check if MediaPipe is available
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

class FaceDetector:
    def __init__(self):
        self.mode = settings.ML_ENGINE_MODE
        logger.info(f"Initializing FaceDetector in {self.mode} mode")
        
        # Load Haar Cascade as a universal fallback
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        # Try initializing MediaPipe Face Detection
        self.has_mediapipe = False
        if MEDIAPIPE_AVAILABLE:
            try:
                self.mp_face_detection = mp.solutions.face_detection
                self.face_detector = self.mp_face_detection.FaceDetection(
                    model_selection=0, min_detection_confidence=0.4
                )
                self.has_mediapipe = True
                logger.info("MediaPipe Face Detection initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize MediaPipe Face Detection: {e}")

        # Check DNN model
        self.has_dnn = False
        if self.mode == "production":
            try:
                model_dir = settings.DATA_DIR
                prototxt_path = os.path.join(model_dir, "deploy.prototxt")
                caffemodel_path = os.path.join(model_dir, "res10_300x300_ssd_iter_140000.caffemodel")
                
                if os.path.exists(prototxt_path) and os.path.exists(caffemodel_path):
                    self.net = cv2.dnn.readNetFromCaffe(prototxt_path, caffemodel_path)
                    self.has_dnn = True
                    logger.info("OpenCV DNN Face Detector initialized successfully.")
                else:
                    logger.warning("DNN face model files not found. Using MediaPipe/Haar Cascades as fallback.")
            except Exception as e:
                logger.error(f"Failed to load DNN Detector: {e}.")

    def detect(self, img: np.ndarray) -> List[Dict[str, any]]:
        """
        Detects faces in a numpy image (BGR).
        Returns a list of dicts: [{'box': [x, y, w, h], 'confidence': float}]
        """
        h, w = img.shape[:2]
        results = []
        
        # 1. Primary: MediaPipe Face Detection
        if self.has_mediapipe:
            try:
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                mp_results = self.face_detector.process(img_rgb)
                if mp_results and mp_results.detections:
                    for detection in mp_results.detections:
                        bboxC = detection.location_data.relative_bounding_box
                        score = detection.score[0] if detection.score else 0.9
                        
                        startX = int(max(0, bboxC.xmin * w))
                        startY = int(max(0, bboxC.ymin * h))
                        boxW = int(min(w - startX, bboxC.width * w))
                        boxH = int(min(h - startY, bboxC.height * h))
                        
                        if boxW > 15 and boxH > 15:
                            results.append({
                                "box": [startX, startY, boxW, boxH],
                                "confidence": float(score)
                            })
                    if results:
                        return results
            except Exception as e:
                logger.error(f"MediaPipe detection error: {e}")

        # 2. Secondary: OpenCV ResNet SSD DNN detection
        if self.has_dnn:
            try:
                blob = cv2.dnn.blobFromImage(cv2.resize(img, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
                self.net.setInput(blob)
                detections = self.net.forward()
                
                for i in range(detections.shape[2]):
                    confidence = detections[0, 0, i, 2]
                    if confidence > settings.DETECTION_CONFIDENCE_THRESHOLD:
                        box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                        (startX, startY, endX, endY) = box.astype("int")
                        startX = max(0, startX)
                        startY = max(0, startY)
                        endX = min(w - 1, endX)
                        endY = min(h - 1, endY)
                        
                        results.append({
                            "box": [int(startX), int(startY), int(endX - startX), int(endY - startY)],
                            "confidence": float(confidence)
                        })
                if results:
                    return results
            except Exception as e:
                logger.error(f"DNN detection error: {e}")

        # 3. Tertiary: Multi-stage Haar Cascade detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Pass A: Standard Haar Cascade
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=4, 
            minSize=(30, 30)
        )
        
        # Pass B: Histogram Equalization for poor lighting if Pass A returned nothing
        if len(faces) == 0:
            gray_eq = cv2.equalizeHist(gray)
            faces = self.face_cascade.detectMultiScale(
                gray_eq, 
                scaleFactor=1.05, 
                minNeighbors=3, 
                minSize=(25, 25)
            )
            
        for (x, y, w_box, h_box) in faces:
            results.append({
                "box": [int(x), int(y), int(w_box), int(h_box)],
                "confidence": 0.85
            })

        return results

# Singleton instance
detector = FaceDetector()

