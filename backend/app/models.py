import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True, nullable=False) # e.g. "EMP-1002"
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="employee")  # "employer" (Admin) or "employee" (Staff)
    group = Column(String, default="Unassigned")  # Department
    rfid_card = Column(String, unique=True, index=True, nullable=True)
    avatar_url = Column(String, default="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150")
    is_active = Column(Boolean, default=True)
    is_enrolled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    attendance_logs = relationship("AttendanceLog", back_populates="user", cascade="all, delete-orphan")
    enrollments = relationship("FaceEnrollment", back_populates="user", cascade="all, delete-orphan")


class FaceEnrollment(Base):
    __tablename__ = "face_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    samples_count = Column(Integer, default=5)
    enrolled_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="enrollments")


class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String, nullable=False) # Copied denormalized for speed
    name = Column(String, nullable=False)
    group = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    action_type = Column(String, default="CHECK_IN")  # "CHECK_IN" or "CHECK_OUT"
    status = Column(String, default="ON TIME")  # "ON TIME" or "LATE" or "CHECK OUT"
    method = Column(String, default="AI Face ID")  # "AI Face ID", "GPS Geofence", "QR Badge Pass"
    location = Column(String, default="HQ Main Door")
    verification_score = Column(Float, nullable=True) # Cosine similarity score

    user = relationship("User", back_populates="attendance_logs")


class GeofenceRule(Base):
    __tablename__ = "geofence_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="HQ Boundary")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, default=100.0)
    is_active = Column(Boolean, default=True)


class RuleConfiguration(Base):
    __tablename__ = "rule_configurations"

    id = Column(Integer, primary_key=True, index=True)
    late_threshold_minutes = Column(Integer, default=15) # minutes past shift start (e.g. 09:00 -> 09:15)
    grace_period_minutes = Column(Integer, default=10) # extra buffer (e.g. 10 minutes)
    shift_start_time = Column(String, default="09:00") # HH:MM format
