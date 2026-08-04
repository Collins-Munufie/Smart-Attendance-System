# SmartSAS - Enterprise Smart Attendance System

An enterprise-grade, production-ready identity and attendance system utilizing high-performance face recognition, challenge-response liveness detection, and geolocation boundaries.

## Architecture Highlights
- **Recognition Layer (`ml_service`)**: Exposes microservice routes for RetinaFace/MTCNN face detection, ArcFace/FaceNet embeddings extraction, MediaPipe biometric liveness challenge verification, and vector similarities mapping.
- **Vector Database**: Implements **FAISS (Facebook AI Similarity Search)** to run fast vector lookups at scale.
- **Backend Core Gateway (`backend`)**: Uses **Python FastAPI** to handle JWT-based session security, user CRUD operations, geofence coordinates validation, and database records.
- **Database Engine**: Uses **PostgreSQL** for persistence and **Redis** for liveness challenge queues.
- **Frontend Panel (`frontend`)**: Rebuilt using **React + TypeScript + Tailwind CSS** featuring dynamic analytical dashboards, a biometric enrollment stepper, and camera scan verification feeds.

---

## Technical Stack
- **AI Models**: RetinaFace / Haar Cascades (Face detection), ArcFace (512-dim embedding), MediaPipe FaceMesh (Eye aspect ratio & Head pose yaw/pitch estimation).
- **APIs**: FastAPI (ASGI servers on Uvicorn).
- **Frontend**: Vite, React, TypeScript, Tailwind CSS, Recharts (Charts).
- **Database**: PostgreSQL (Data persistence), Redis (Session queues), FAISS (Vector search).
- **Containers**: Docker and Docker Compose.

---

## Directory Structure
```text
├── backend/               # FastAPI gateway, DB mappings, auth models
│   ├── app/
│   │   ├── auth.py        # OAuth2 password flow & JWT helper
│   │   ├── crud.py        # Database operations & chart aggregate queries
│   │   ├── database.py    # SQLAlchemy connection manager
│   │   ├── main.py        # Gateway routers & geofence Haversine math
│   │   ├── models.py      # SQLAlchemy relational schemas
│   │   └── schemas.py     # Pydantic data schemas
│   ├── Dockerfile
│   └── requirements.txt
├── ml_service/            # Face analysis & FAISS vector matching service
│   ├── app/
│   │   ├── config.py      # Path settings & threshold levels
│   │   ├── detector.py    # OpenCV DNN & Haar detection handlers
│   │   ├── embedder.py    # ArcFace ONNX / LSH random projection models
│   │   ├── liveness.py    # MediaPipe liveness checker (yaw, pitch, blink EAR)
│   │   ├── main.py        # Face registration and verification endpoints
│   │   └── vector_db.py   # FAISS index and local metadata mappings
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/              # Vite React dashboard and check-in panels
│   ├── src/
│   │   ├── components/    # Layout, check-in camera, enrollment studio
│   │   ├── pages/         # Analytics, logs, settings, roster management
│   │   └── services/      # Axios endpoints client
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml     # Orchestrates full stack local environment
```

---

## Getting Started

### Option A: Running with Docker Compose (Recommended)
Ensure you have Docker and Docker Desktop running on your machine, then run:

```bash
docker-compose up --build
```

This commands spins up:
- PostgreSQL database on port `5432`
- Redis server on port `6379`
- Face recognition ML engine on `http://localhost:8001`
- Gateway REST API on `http://localhost:8000`
- Web Dashboard on `http://localhost:5173`

---

### Option B: Local Setup & Manual Run

#### 1. Start Database & Redis
Ensure standard PostgreSQL and Redis servers are running locally on their default ports.

#### 2. Run ML inference Service
```bash
cd ml_service
python -m venv venv
venv\Scripts\activate      # On Windows
pip install -r requirements.txt
python app/main.py
```

#### 3. Run Backend Gateway Service
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # On Windows
pip install -r requirements.txt
python app/main.py
```

#### 4. Run React Web Interface
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Seed Accounts & Credentials

By default, the gateway seeds an initial Administrator profile to log in and register other employees:
- **Employee ID:** `EMP-1011`
- **Password:** `admin123`

Log in with this admin ID, navigate to the **Employee Roster** tab, register your personnel, and click **Enroll Face** to capture their biometric vectors!
