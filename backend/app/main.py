import datetime
import math
import logging
import requests
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Optional, Tuple

from app.database import settings, engine, Base, get_db
from app.models import User, AttendanceLog
from app.schemas import (
    Token, UserCreate, UserUpdate, UserResponse,
    AttendanceLogResponse, GeofenceRuleCreate, GeofenceRuleResponse,
    RuleConfigurationCreate, RuleConfigurationResponse, DashboardStats,
    DailyLogChartItem, FaceCheckInRequest, RFIDCheckInRequest
)
from app.auth import (
    create_access_token, get_current_active_user, get_current_admin,
    verify_password, get_password_hash
)
import app.crud as crud

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    description="Enterprise Identity and Attendance Gateway. Connects frontend clients to databases and ML inference layers.",
    version="1.0.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database with initial Admin user if not exists
db = next(get_db())
admin = crud.get_user_by_employee_id(db, "EMP-1011")
if not admin:
    try:
        new_admin = User(
            employee_id="EMP-1011",
            name="David Kim",
            email="david.kim@enterprise.com",
            hashed_password=get_password_hash("admin123"),
            role="employer",
            group="Administration & HR",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            is_enrolled=False
        )
        db.add(new_admin)
        db.commit()
        logger.info("Admin user EMP-1011 seeded successfully.")
    except Exception as e:
        logger.error(f"Error seeding admin user: {e}")
        db.rollback()
db.close()


# Distance utility (Haversine Formula)
def check_geofence(user_lat: float, user_lon: float, rules: list) -> Tuple[bool, float, str]:
    """
    Checks if coordinates are within the radius of any active geofences.
    Returns: (is_inside, minimum_distance, geofence_name)
    """
    if not rules:
        return True, 0.0, ""  # No geofences configured = open access
        
    min_dist = float('inf')
    closest_fence_name = ""
    
    for rule in rules:
        if not rule.is_active:
            continue
            
        # Haversine formula
        R = 6371000.0  # Earth radius in meters
        phi1 = math.radians(user_lat)
        phi2 = math.radians(rule.latitude)
        delta_phi = math.radians(rule.latitude - user_lat)
        delta_lambda = math.radians(rule.longitude - user_lon)
        
        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        dist = R * c
        
        if dist <= rule.radius_meters:
            return True, dist, rule.name
            
        if dist < min_dist:
            min_dist = dist
            closest_fence_name = rule.name
            
    return False, min_dist, closest_fence_name


# --- Auth Endpoints ---
@app.post("/api/v1/auth/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_employee_id(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect Employee ID or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.employee_id, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


# --- User Management ---
@app.post("/api/v1/users", response_model=UserResponse)
def create_new_user(user: UserCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    existing = crud.get_user_by_employee_id(db, user.employee_id)
    if existing:
        raise HTTPException(status_code=400, detail="Employee ID already registered")
    return crud.create_user(db, user)

@app.get("/api/v1/users", response_model=List[UserResponse])
def get_users_list(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return crud.get_users(db, skip, limit)

@app.get("/api/v1/users/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.put("/api/v1/users/{user_id}", response_model=UserResponse)
def edit_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    updated = crud.update_user(db, user_id, user)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated

@app.delete("/api/v1/users/{user_id}")
def delete_user_record(user_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    db_user = crud.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Remove from ML vector database if user is enrolled
    if db_user.is_enrolled:
        try:
            requests.post(f"{settings.ML_SERVICE_URL}/remove-user", params={"user_id": db_user.employee_id}, timeout=5)
        except Exception as e:
            logger.error(f"Failed to remove vector records for {db_user.employee_id}: {e}")
            
    crud.delete_user(db, user_id)
    return {"success": True, "message": "User deleted successfully"}

# --- Face Registration/Enrollment Client Route ---
class ClientEnrollRequest(BaseModel):
    user_id: str
    images: List[str]

@app.post("/api/v1/users/enroll")
def enroll_face_vectors(request: ClientEnrollRequest, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    db_user = crud.get_user_by_employee_id(db, request.user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="Employee not registered in database")
        
    # Forward images to ML service
    try:
        res = requests.post(
            f"{settings.ML_SERVICE_URL}/enroll",
            json={"user_id": request.user_id, "images": request.images},
            timeout=15
        )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.json().get("detail", "ML enrollment failed"))
            
        data = res.json()
        crud.enroll_user_face(db, db_user.id, samples_count=data.get("samples_successful", 5))
        return {"success": True, "samples_registered": data.get("samples_successful")}
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error to ML Service: {e}")
        raise HTTPException(status_code=503, detail="Face recognition engine is temporarily offline")


# --- Geofence Configuration Routes ---
@app.post("/api/v1/geofence", response_model=GeofenceRuleResponse)
def create_geofence(rule: GeofenceRuleCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    return crud.create_geofence_rule(db, rule)

@app.get("/api/v1/geofence", response_model=List[GeofenceRuleResponse])
def get_geofences(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return crud.get_geofence_rules(db)

@app.delete("/api/v1/geofence/{rule_id}")
def delete_geofence(rule_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    success = crud.delete_geofence_rule(db, rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="Geofence rule not found")
    return {"success": True, "message": "Geofence rule deleted"}


# --- Shift/Rules Config ---
@app.get("/api/v1/config", response_model=RuleConfigurationResponse)
def get_config(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return crud.get_rule_config(db)

@app.post("/api/v1/config", response_model=RuleConfigurationResponse)
def update_config(config: RuleConfigurationCreate, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    return crud.update_rule_config(db, config)


# --- Core Face Recognition Check-In ---
@app.post("/api/v1/check-in/face", response_model=AttendanceLogResponse)
def check_in_by_face(request: FaceCheckInRequest, db: Session = Depends(get_db)):
    # 1. Geofence location check
    geofence_rules = db.query(crud.GeofenceRule).filter(crud.GeofenceRule.is_active == True).all()
    if geofence_rules and (request.latitude is None or request.longitude is None):
        raise HTTPException(status_code=400, detail="GPS coordinates required to satisfy active geofence boundaries")
        
    if geofence_rules:
        is_inside, distance, fence_name = check_geofence(request.latitude, request.longitude, geofence_rules)
        if not is_inside:
            logger.warning(f"GPS Geofencing verification failed. User distance: {distance}m from {fence_name}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Out of boundary error: You are {round(distance, 1)}m away from permitted workspace geofence '{fence_name}'"
            )
            
    # 2. Call ML service to match faces
    try:
        res = requests.post(
            f"{settings.ML_SERVICE_URL}/search-image",
            json={"image": request.image, "top_k": 1},
            timeout=10
        )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.json().get("detail", "ML Search failed"))
            
        data = res.json()
        if not data.get("is_match") or not data.get("matched_user"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Face verification failed: Biometric key does not match any registered employee"
            )
            
        matched_emp_id = data["matched_user"]["user_id"]
        score = data["matched_user"]["similarity"]
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error to ML Service: {e}")
        raise HTTPException(status_code=503, detail="Face recognition engine is offline")
        
    # 3. Retrieve user database record
    user = crud.get_user_by_employee_id(db, matched_emp_id)
    if not user:
        raise HTTPException(status_code=404, detail="Matched user record not found in system")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is deactivated")
        
    # 4. Check time limits for ON TIME vs LATE
    config = crud.get_rule_config(db)
    now = datetime.datetime.now()
    
    # Parse shift start time (e.g., "09:00")
    try:
        sh_hour, sh_min = map(int, config.shift_start_time.split(":"))
        shift_time = now.replace(hour=sh_hour, minute=sh_min, second=0, microsecond=0)
    except Exception:
        # Fallback if invalid format
        shift_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
        
    # Add late threshold & grace
    allowed_limit = shift_time + datetime.timedelta(minutes=config.late_threshold_minutes + config.grace_period_minutes)
    
    # Simple check-in check
    status_label = "ON TIME"
    # User is late if check-in is after shift + late threshold + grace, and it is today morning/daytime
    # For a fairer check, if check-in time exceeds shift start time by allowed threshold:
    if now > allowed_limit:
        status_label = "LATE"
        
    # 5. Write log to database
    log = crud.create_attendance_log(
        db,
        user_id=user.id,
        employee_id=user.employee_id,
        name=user.name,
        group=user.group,
        status=status_label,
        method="AI Face ID",
        location=request.location_name,
        score=score
    )
    
    return log


# --- RFID check-in ---
@app.post("/api/v1/check-in/rfid", response_model=AttendanceLogResponse)
def check_in_by_rfid(request: RFIDCheckInRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_rfid(db, request.rfid_card)
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="RFID Card unrecognized: Tag ID does not map to any employee"
        )
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account mapped to RFID tag is deactivated")
        
    config = crud.get_rule_config(db)
    now = datetime.datetime.now()
    
    try:
        sh_hour, sh_min = map(int, config.shift_start_time.split(":"))
        shift_time = now.replace(hour=sh_hour, minute=sh_min, second=0, microsecond=0)
    except Exception:
        shift_time = now.replace(hour=9, minute=0, second=0, microsecond=0)
        
    allowed_limit = shift_time + datetime.timedelta(minutes=config.late_threshold_minutes + config.grace_period_minutes)
    status_label = "ON TIME"
    if now > allowed_limit:
        status_label = "LATE"
        
    log = crud.create_attendance_log(
        db,
        user_id=user.id,
        employee_id=user.employee_id,
        name=user.name,
        group=user.group,
        status=status_label,
        method="QR Badge Pass" if "QR" in request.location_name else "RFID Badge Pass",
        location=request.location_name,
        score=1.0
    )
    return log


# --- Logs and Reports ---
@app.get("/api/v1/logs", response_model=List[AttendanceLogResponse])
def get_logs(skip: int = 0, limit: int = 100, employee_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Regular employees can only view their own logs
    if current_user.role == "employee":
        return crud.get_attendance_logs(db, skip, limit, employee_id=current_user.employee_id)
    return crud.get_attendance_logs(db, skip, limit, employee_id=employee_id)


# --- Dashboard Analytics ---
@app.get("/api/v1/dashboard/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    return crud.get_dashboard_stats(db)

@app.get("/api/v1/dashboard/charts", response_model=List[DailyLogChartItem])
def get_charts(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    return crud.get_weekly_logs_chart(db)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

