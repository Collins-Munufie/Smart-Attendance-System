# Fix Face Login Detection, Add Check-In/Check-Out System & Profile Customization

This plan addresses three key requirements:
1. **Fix "No face detected in the image for search" error**: Enhancing the ML service face detector to use MediaPipe face detection as primary with multi-stage Haar Cascade fallbacks (histogram equalization & lower neighbor constraints).
2. **Check-In / Check-Out System**: Adding `action_type` (`CHECK_IN` vs `CHECK_OUT`) support to attendance logs and backend validation, enforcing that **Check-Out is only available when a user has an active, successful Check-In**.
3. **Employee Profile Customization**: Adding profile picture upload and preset customization capabilities for employees so they can replace default avatars.

---

## User Review Required

> [!IMPORTANT]
> - **Check-Out Rule Enforcement**: Check-out attempts will be rejected by both the backend API and frontend controls if the employee has not performed a successful check-in earlier for the current day.
> - **MediaPipe Integration in ML Detector**: `detector.py` will leverage MediaPipe Face Detection (already bundled with `mediapipe`) alongside multi-parameter OpenCV Haar cascades to drastically boost detection rate for webcam frames.

---

## Open Questions

None at present. Requirements are clear and fully specified.

---

## Proposed Changes

### ML Service Component (`ml_service`)

#### [MODIFY] [detector.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/ml_service/app/detector.py)
- Upgrade `FaceDetector` class:
  - Add MediaPipe Face Detection (`mp.solutions.face_detection`) as primary face detector when `mediapipe` is available.
  - Upgrade OpenCV Haar Cascade fallback with multi-pass detection:
    - Pass 1: Standard grayscale detection with adaptive parameters (`scaleFactor=1.1`, `minNeighbors=4`).
    - Pass 2: Histogram equalized grayscale image (`cv2.equalizeHist`) for low-contrast webcam feeds.
    - Pass 3: Sensitive fallback (`minNeighbors=3`, `scaleFactor=1.05`) to prevent false negatives.

#### [MODIFY] [main.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/ml_service/app/main.py)
- Improve error detail & face cropping in `/search-image` endpoint to give helpful feedback if an image is completely black or unreadable.

---

### Backend Component (`backend`)

#### [MODIFY] [models.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/backend/app/models.py)
- Update `AttendanceLog` model to include `action_type` column (String, default `"CHECK_IN"`, values: `"CHECK_IN"`, `"CHECK_OUT"`).

#### [MODIFY] [schemas.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/backend/app/schemas.py)
- Update `AttendanceLogResponse` schema to include `action_type: str`.
- Update `FaceCheckInRequest` and `RFIDCheckInRequest` to accept `action_type: Optional[str] = "CHECK_IN"`.
- Add `UserProfileUpdate` schema (`avatar_url: str`).

#### [MODIFY] [crud.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/backend/app/crud.py)
- Update `create_attendance_log` to accept `action_type`.
- Add helper `get_user_today_attendance_status(db, user_id)`: returns whether the employee has checked in today, their current status (`CHECKED_IN` vs `CHECKED_OUT`), and latest log.
- Add `update_user_profile(db, user_id, avatar_url)` to save customized avatars.

#### [MODIFY] [main.py](file:///c:/Users/HP/Documents/smart%20attendance%20system/backend/app/main.py)
- Update `/api/v1/check-in/face` and `/api/v1/check-in/rfid`:
  - Require a successful prior `CHECK_IN` log for today before allowing a `CHECK_OUT`. If missing, return `400 Bad Request` ("Cannot check out without a successful check in").
- Add endpoint `GET /api/v1/attendance/my-status`: returns current check-in/check-out status for the logged-in employee.
- Add endpoint `PUT /api/v1/users/me/profile`: allows employees to update their avatar URL / custom profile photo.

---

### Frontend Component (`frontend`)

#### [MODIFY] [CheckInCamera.tsx](file:///c:/Users/HP/Documents/smart%20attendance%20system/frontend/src/components/CheckInCamera.tsx)
- Add Check-In / Check-Out selection controls.
- Fetch user's status via `/api/v1/attendance/my-status`.
- Disable / gray out the **Check Out** button when the user has not checked in today.
- Enable the **Check Out** button only after a successful check-in.
- Support both Check-In and Check-Out execution with appropriate visual status feedback.

#### [MODIFY] [Settings.tsx](file:///c:/Users/HP/Documents/smart%20attendance%20system/frontend/src/pages/Settings.tsx)
- Add a **Profile Customization** card allowing employees (and admins) to change their profile avatar:
  - Upload custom image / take photo or select from curated avatar presets or enter image URL.
  - Save changes to update profile picture across the application instantly.

#### [MODIFY] [Layout.tsx](file:///c:/Users/HP/Documents/smart%20attendance%20system/frontend/src/components/Layout.tsx)
- Update top navigation user profile display to read `avatar_url` dynamically from user state and react to profile changes.

#### [MODIFY] [Logs.tsx](file:///c:/Users/HP/Documents/smart%20attendance%20system/frontend/src/pages/Logs.tsx) & [Dashboard.tsx](file:///c:/Users/HP/Documents/smart%20attendance%20system/frontend/src/pages/Dashboard.tsx)
- Display `action_type` (`CHECK_IN` badge vs `CHECK_OUT` badge) in attendance log tables and live feeds.

---

## Verification Plan

### Automated Tests
- Test face detection with sample test images via `pytest ml_service/app`.
- Test API endpoints for check-in validation rules and profile updates.

### Manual Verification
1. **Face Login / Search Verification**:
   - Open Check-In Portal, present face, click verify. Verify that face detection succeeds reliably without "No face detected in the image for search" error.
2. **Check-In / Check-Out Rules**:
   - Open Check-In camera page when user has not checked in today. Verify that "Check Out" button is disabled/locked.
   - Perform a Check In. Verify successful log creation.
   - Verify that "Check Out" button becomes enabled and clickable.
   - Perform Check Out. Verify status updates to Checked Out and log displays `CHECK_OUT`.
3. **Profile Picture Customization**:
   - Navigate to Settings -> Profile Customization.
   - Upload/select a new avatar image and save.
   - Verify that header avatar, roster avatar, and settings update immediately.
