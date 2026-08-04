# Migrated Enterprise Smart Attendance System Walkthrough

We have successfully rebuilt the smart attendance prototype into a production-grade enterprise system. Below is a summary of the new stack components, directory layouts, and execution workflows.

---

## What We Built

### 1. ML Biometrics & Analytics Layer (`ml_service/`)
Exposes FastAPI routes wrapping Python face analysis libraries:
- **Face Detection ([detector.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/ml_service/app/detector.py))**: Implements both OpenCV ResNet SSD DNN and Haar Cascade classifiers.
- **Biometric Embeddings ([embedder.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/ml_service/app/embedder.py))**: Generates standard 512-dimensional vectors using ONNX ArcFace models (with deterministic local random projection fallbacks).
- **Liveness Detection ([liveness.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/ml_service/app/liveness.py))**: Leverages MediaPipe FaceMesh to enforce challenge-response actions (blink counts, head turning angles, smile width calculations).
- **FAISS Database ([vector_db.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/ml_service/app/vector_db.py))**: Stores face templates and runs cosine similarity lookups.

### 2. Backend Gateway (`backend/`)
Serves as the central API gateway:
- **Security & JWT ([auth.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/backend/app/auth.py))**: Implements pure python-bcrypt password hashing (no passlib compiler warnings) and token encryption.
- **Relational Schemas ([models.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/backend/app/models.py))**: Map database models (User, FaceEnrollment, AttendanceLog, GeofenceRule, RuleConfiguration) to PostgreSQL/SQLite.
- **Distance Checker ([main.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/backend/app/main.py))**: Uses the Haversine formula to compute user check-in geofence boundaries.

### 3. Frontend Web Interface (`frontend/`)
A dashboard created with **React (TypeScript) + Tailwind CSS**:
- **Identity Portal ([CheckInCamera.tsx](file:///c:/Users/HP/Documents/smart%20attendance%20system/frontend/src/components/CheckInCamera.tsx))**: Operates the web camera, overlaying face scanning brackets, rendering blinking requests, and playing audio cues.
- **Analytics Charts ([Dashboard.tsx](file:///c:/Users/HP/Documents/smart%20attendance%20system/frontend/src/pages/Dashboard.tsx))**: Connects to the gateway to chart weekly present/absent logs using Recharts.
- **Steppers ([EnrollmentStudio.tsx](file:///c:/Users/HP/Documents/smart%20attendance%20system/frontend/src/components/EnrollmentStudio.tsx))**: Steers the admin through recording 5 specific face angles to register vectors.
- **Brand Palette (uTest Platform)**: Remapped Tailwind color utility styles to mirror the uTest brand palette (featuring teal `#00A8CC` highlights, neon green validations, and dark-theme panels).
- **Usage Guide Panels**: Added a sliding glassmorphic sidebar drawer dynamically displaying step-by-step walkthrough guides customized for both Administrators and Employees.

---

## Code Base Verification

The monorepo structure is complete:
1. **Dockerized Setup**: Created individual Dockerfiles for each service and a root-level `docker-compose.yml`.
2. **Clean Repository**: Tidy-up completed, replacing the static files (`index.html`, `app.js`, `styles.css`, `manifest.json`) at the root level.
3. **Admin Credential Seed**: Automatically creates a default admin account on startup (`EMP-1011` / `admin123`).

## Running the App

You can boot up the entire stack locally with:
```bash
docker-compose up --build
```
Or run the services manually using Python virtual environments and Vite (check instructions in [README.md](file:///c:/Users/HP/Documents/smart%20attendance%2520system/README.md)).
