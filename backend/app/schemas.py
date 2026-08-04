from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    employee_id: Optional[str] = None
    role: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    employee_id: str
    name: str
    email: Optional[EmailStr] = None
    role: str = "employee"
    group: str = "Unassigned"
    rfid_card: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    group: Optional[str] = None
    rfid_card: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    is_enrolled: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Face Enrollment Schemas
class FaceEnrollmentResponse(BaseModel):
    id: int
    user_id: int
    samples_count: int
    enrolled_at: datetime

    class Config:
        from_attributes = True

# Attendance Log Schemas
class AttendanceLogBase(BaseModel):
    employee_id: str
    status: str
    method: str
    location: str
    verification_score: Optional[float] = None

class AttendanceLogCreate(AttendanceLogBase):
    user_id: int
    name: str
    group: str

class AttendanceLogResponse(AttendanceLogBase):
    id: int
    name: str
    group: str
    timestamp: datetime

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_employees: int
    active_today: int
    on_time_today: int
    late_today: int
    absent_today: int
    attendance_rate: float

class DailyLogChartItem(BaseModel):
    date: str
    on_time: int
    late: int
    absent: int

class DepartmentStats(BaseModel):
    department: str
    total: int
    present: int
    rate: float

# Geofence Schemas
class GeofenceRuleBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    radius_meters: float
    is_active: bool = True

class GeofenceRuleCreate(GeofenceRuleBase):
    pass

class GeofenceRuleResponse(GeofenceRuleBase):
    id: int

    class Config:
        from_attributes = True

# Configuration Schemas
class RuleConfigurationBase(BaseModel):
    late_threshold_minutes: int
    grace_period_minutes: int
    shift_start_time: str

class RuleConfigurationCreate(RuleConfigurationBase):
    pass

class RuleConfigurationResponse(RuleConfigurationBase):
    id: int

    class Config:
        from_attributes = True

# Check-in Requests
class FaceCheckInRequest(BaseModel):
    image: str = Field(..., description="Base64 frame or data URL of the face")
    latitude: Optional[float] = Field(None, description="GPS Latitude")
    longitude: Optional[float] = Field(None, description="GPS Longitude")
    location_name: str = Field("HQ Entrance", description="Check-in location")

class RFIDCheckInRequest(BaseModel):
    rfid_card: str = Field(..., description="RFID card unique identification tag")
    location_name: str = Field("RFID Gate Reader", description="Check-in reader location")
