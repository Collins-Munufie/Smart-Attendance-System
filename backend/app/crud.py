import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Optional

from app.models import User, FaceEnrollment, AttendanceLog, GeofenceRule, RuleConfiguration
from app.schemas import UserCreate, UserUpdate, GeofenceRuleCreate, RuleConfigurationCreate
from app.auth import get_password_hash

# --- User CRUD ---
def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_employee_id(db: Session, employee_id: str) -> Optional[User]:
    return db.query(User).filter(User.employee_id == employee_id).first()

def get_user_by_rfid(db: Session, rfid_card: str) -> Optional[User]:
    return db.query(User).filter(User.rfid_card == rfid_card).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user_in: UserCreate) -> User:
    hashed_pwd = get_password_hash(user_in.password)
    db_user = User(
        employee_id=user_in.employee_id,
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_pwd,
        role=user_in.role,
        group=user_in.group,
        rfid_card=user_in.rfid_card,
        avatar_url=user_in.avatar_url or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_in: UserUpdate) -> Optional[User]:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
        
    update_data = user_in.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        db_user.hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    db.delete(db_user)
    db.commit()
    return True

# --- Face Enrollment CRUD ---
def enroll_user_face(db: Session, user_id: int, samples_count: int = 5) -> FaceEnrollment:
    # Set user flag
    db_user = get_user_by_id(db, user_id)
    if db_user:
        db_user.is_enrolled = True
        
    # Delete previous enrollments
    db.query(FaceEnrollment).filter(FaceEnrollment.user_id == user_id).delete()
    
    db_enroll = FaceEnrollment(user_id=user_id, samples_count=samples_count)
    db.add(db_enroll)
    db.commit()
    db.refresh(db_enroll)
    return db_enroll

# --- Attendance Logs CRUD ---
def get_attendance_logs(db: Session, skip: int = 0, limit: int = 100, employee_id: Optional[str] = None) -> List[dict]:
    query = db.query(AttendanceLog, User.avatar_url).outerjoin(User, AttendanceLog.user_id == User.id)
    if employee_id:
        query = query.filter(AttendanceLog.employee_id == employee_id)
    results = query.order_by(AttendanceLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    logs = []
    for log, avatar_url in results:
        log_dict = {
            "id": log.id,
            "user_id": log.user_id,
            "employee_id": log.employee_id,
            "name": log.name,
            "group": log.group,
            "action_type": log.action_type,
            "status": log.status,
            "method": log.method,
            "location": log.location,
            "verification_score": log.verification_score,
            "timestamp": log.timestamp,
            "avatar_url": avatar_url or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        }
        logs.append(log_dict)
    return logs

def create_attendance_log(db: Session, user_id: int, employee_id: str, name: str, group: str, status: str, method: str, location: str, score: Optional[float] = None, action_type: str = "CHECK_IN") -> dict:
    db_log = AttendanceLog(
        user_id=user_id,
        employee_id=employee_id,
        name=name,
        group=group,
        action_type=action_type,
        status=status,
        method=method,
        location=location,
        verification_score=score
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)

    user = get_user_by_id(db, user_id)
    avatar_url = user.avatar_url if user else "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"

    return {
        "id": db_log.id,
        "user_id": db_log.user_id,
        "employee_id": db_log.employee_id,
        "name": db_log.name,
        "group": db_log.group,
        "action_type": db_log.action_type,
        "status": db_log.status,
        "method": db_log.method,
        "location": db_log.location,
        "verification_score": db_log.verification_score,
        "timestamp": db_log.timestamp,
        "avatar_url": avatar_url
    }

def get_user_today_attendance_status(db: Session, employee_id: str) -> dict:
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
    latest_log = db.query(AttendanceLog).filter(
        AttendanceLog.employee_id == employee_id,
        AttendanceLog.timestamp >= today_start
    ).order_by(AttendanceLog.timestamp.desc()).first()

    if not latest_log:
        return {"is_checked_in": False, "last_action": None, "last_log_time": None}

    is_checked_in = (latest_log.action_type == "CHECK_IN")
    return {
        "is_checked_in": is_checked_in,
        "last_action": latest_log.action_type,
        "last_log_time": latest_log.timestamp
    }

def update_user_profile(db: Session, user_id: int, avatar_url: str) -> Optional[User]:
    db_user = get_user_by_id(db, user_id)
    if db_user:
        db_user.avatar_url = avatar_url
        db.commit()
        db.refresh(db_user)
    return db_user

# --- Geofence Rules CRUD ---
def get_geofence_rules(db: Session) -> List[GeofenceRule]:
    return db.query(GeofenceRule).all()

def create_geofence_rule(db: Session, rule: GeofenceRuleCreate) -> GeofenceRule:
    db_rule = GeofenceRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

def delete_geofence_rule(db: Session, rule_id: int) -> bool:
    db_rule = db.query(GeofenceRule).filter(GeofenceRule.id == rule_id).first()
    if not db_rule:
        return False
    db.delete(db_rule)
    db.commit()
    return True

# --- System Configurations CRUD ---
def get_rule_config(db: Session) -> RuleConfiguration:
    # Always ensure at least one config row exists
    config = db.query(RuleConfiguration).first()
    if not config:
        config = RuleConfiguration(late_threshold_minutes=15, grace_period_minutes=10, shift_start_time="09:00")
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def update_rule_config(db: Session, config_in: RuleConfigurationCreate) -> RuleConfiguration:
    config = get_rule_config(db)
    config.late_threshold_minutes = config_in.late_threshold_minutes
    config.grace_period_minutes = config_in.grace_period_minutes
    config.shift_start_time = config_in.shift_start_time
    db.commit()
    db.refresh(config)
    return config

# --- Analytics / Dashboard Queries ---
def get_dashboard_stats(db: Session) -> Dict[str, any]:
    # Active registered employees count
    total_employees = db.query(User).filter(User.role == "employee", User.is_active == True).count()
    
    # Logs today
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)
    
    logs_today = db.query(AttendanceLog).filter(
        AttendanceLog.timestamp >= today_start,
        AttendanceLog.timestamp < today_end
    ).all()
    
    # Distinct employees logged today
    employees_present = set(log.user_id for log in logs_today)
    active_today = len(employees_present)
    
    # Late vs On time counts
    # We find the first check-in log per employee today to count late vs ontime correctly
    employee_first_log_status = {}
    for log in sorted(logs_today, key=lambda l: l.timestamp):
        if log.user_id not in employee_first_log_status:
            employee_first_log_status[log.user_id] = log.status
            
    late_today = list(employee_first_log_status.values()).count("LATE")
    on_time_today = list(employee_first_log_status.values()).count("ON TIME")
    
    absent_today = max(0, total_employees - active_today)
    
    attendance_rate = (active_today / total_employees * 100.0) if total_employees > 0 else 100.0
    
    return {
        "total_employees": total_employees,
        "active_today": active_today,
        "on_time_today": on_time_today,
        "late_today": late_today,
        "absent_today": absent_today,
        "attendance_rate": round(attendance_rate, 1)
    }

def get_weekly_logs_chart(db: Session) -> List[Dict[str, any]]:
    chart_data = []
    # Fetch stats for the last 7 calendar days
    today = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_employees = db.query(User).filter(User.role == "employee", User.is_active == True).count()
    
    for i in range(6, -1, -1):
        day_start = today - datetime.timedelta(days=i)
        day_end = day_start + datetime.timedelta(days=1)
        day_label = day_start.strftime("%a (%m/%d)")
        
        day_logs = db.query(AttendanceLog).filter(
            AttendanceLog.timestamp >= day_start,
            AttendanceLog.timestamp < day_end
        ).all()
        
        logged_users = set()
        on_time = 0
        late = 0
        
        for log in sorted(day_logs, key=lambda l: l.timestamp):
            if log.user_id not in logged_users:
                logged_users.add(log.user_id)
                if log.status == "LATE":
                    late += 1
                else:
                    on_time += 1
                    
        present = len(logged_users)
        absent = max(0, total_employees - present)
        
        chart_data.append({
            "date": day_label,
            "on_time": on_time,
            "late": late,
            "absent": absent
        })
        
    return chart_data
