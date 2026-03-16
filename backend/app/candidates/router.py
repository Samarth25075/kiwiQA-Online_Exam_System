# app/candidates/router.py
from typing import Annotated, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks
import shutil
import os
import base64
import hashlib
import time

from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import FRONTEND_URL, BACKEND_URL
from app.core.email import send_email
from app.auth.router import get_current_admin, check_permission
from app.auth.schemas import AdminUser
from app.candidates.schemas import (
    Candidate, CandidateCreate, CandidateResponse, CandidateAssign, CandidateResult,
    CandidateEnrollOTPRequest, CandidateEnrollOTPVerify
)
from app.candidates.service import (
    get_all_candidates, create_candidate, assign_exam_to_candidate, 
    get_candidate_by_token, update_candidate_status, delete_candidate, update_candidate_details,
    update_candidate_result, reset_candidate_for_retest
)
from app.exams.service import get_exam_by_id

router = APIRouter(prefix="/candidates", tags=["candidates"])

@router.delete("/{candidate_id}")
async def remove_candidate(
    candidate_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Delete a candidate."""
    success = delete_candidate(db, candidate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate deleted"}

@router.post("", response_model=CandidateResponse)
async def admin_create_candidate(
    candidate_in: CandidateCreate,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Admin-only: Manually create a candidate."""
    new_cand = create_candidate(
        db=db,
        name=candidate_in.name,
        email=candidate_in.email,
        phone_number=candidate_in.phone_number or "",
        dob=candidate_in.dob or "",
        gender=candidate_in.gender or "",
        address=candidate_in.address or "",
        profile_photo=candidate_in.profile_photo or ""
    )
    return _format_candidate(new_cand)

@router.put("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: str,
    candidate_in: CandidateCreate,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Update candidate details."""
    updated = update_candidate_details(db, candidate_id, candidate_in.dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _format_candidate(updated)

@router.post("/{candidate_id}/upload-cv")
async def upload_cv(
    candidate_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a CV file for a candidate."""
    # Create path
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"cv_{candidate_id}{file_ext}"
    file_path = os.path.join("static", "uploads", "cvs", file_name)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update candidate record with the local URL
    cv_url = f"{BACKEND_URL}/static/uploads/cvs/{file_name}"
    update_candidate_details(db, candidate_id, {"cv_url": cv_url})
    
    return {"message": "File uploaded", "cv_url": cv_url}

@router.post("/test/{token}/status")
@router.get("/test/{token}/status") # Dual support for sendBeacon
async def set_candidate_status(token: str, status: str, db: Session = Depends(get_db)):
    """Update candidate status electronically (Live/Completed)."""
    print(f"DEBUG: Status update for {token}: {status}")
    success = update_candidate_status(db, token, status)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": f"Status updated to {status}"}
    
def send_screenshot_email(receiver_email: str, screenshot_path: str | None, candidate_name: str):
    subject = 'Your Exam Screenshot has been recorded'
    content = f"Hello {candidate_name},\n\nYour exam has concluded.{ ' Attached is the final screenshot taken at the moment of submission.' if screenshot_path else ''}\n\nThank you."
    attachments = [screenshot_path] if screenshot_path else None
    send_email(receiver_email, subject, content, attachments)

def send_otp_email(receiver_email: str, candidate_name: str, otp: str):
    subject = 'Your Exam Portal Verification Code'
    content = f"Hello {candidate_name},\n\nYour verification code is: {otp}\nIt expires in 10 minutes.\n\nThank you."
    send_email(receiver_email, subject, content)

def send_invitation_email(receiver_email: str, candidate_name: str, test_link: str):
    subject = 'Invitation to Take Your Assessment'
    content = f"Hello {candidate_name},\n\nYou have been invited to complete an online assessment. Please use the link below to begin your test:\n\n{test_link}\n\nGood luck!"
    send_email(receiver_email, subject, content)

@router.post("/test/{token}/submit")
async def submit_test(token: str, result: CandidateResult, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Submit test results for a candidate."""
    success = update_candidate_result(db, token, result.score, result.total_questions, result.violations)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    candidate = get_candidate_by_token(db, token)
    
    # Process screenshot if provided
    if result.screenshot and candidate:
        try:
            # Create screenshots directory
            screenshots_dir = os.path.join("static", "uploads", "screenshots")
            os.makedirs(screenshots_dir, exist_ok=True)
            
            # Use candidate ID or token for filename
            file_name = f"screenshot_{token}.png"
            file_path = os.path.join(screenshots_dir, file_name)
            
            # Fix base64 padding/header if present
            header, encoded = result.screenshot.split(",", 1) if "," in result.screenshot else ("", result.screenshot)
            with open(file_path, "wb") as fh:
                fh.write(base64.b64decode(encoded))
            
            # Enqueue email task
            background_tasks.add_task(send_screenshot_email, candidate['email'], file_path, candidate['name'])
        except Exception as e:
            print(f"Error processing screenshot: {e}")

    return {"message": "Results submitted"}

@router.post("/test/{token}/resend-results")
async def resend_test_results(token: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Resend the test results email with screenshot."""
    candidate = get_candidate_by_token(db, token)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    if candidate.get("status") != "Completed":
        raise HTTPException(status_code=400, detail="Exam not completed yet.")

    # Find screenshot
    screenshots_dir = os.path.join("static", "uploads", "screenshots")
    file_name = f"screenshot_{token}.png"
    file_path = os.path.join(screenshots_dir, file_name)
    
    if not os.path.exists(file_path):
        # If no screenshot, just send a text email (optional, or error)
         # For now, let's just send what we have
         pass

    # Enqueue email task
    background_tasks.add_task(send_screenshot_email, candidate['email'], file_path if os.path.exists(file_path) else None, candidate['name'])
    
    return {"message": "Email resent successfully"}

def _format_candidate(c: dict) -> CandidateResponse:
    test_link = f"{FRONTEND_URL}/test/{c['token']}"
    return CandidateResponse(**c, test_link=test_link)

@router.get("", response_model=List[CandidateResponse])
async def read_candidates(current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))], db: Session = Depends(get_db)):
    """Fetch list of all candidates (Admin only)."""
    candidates = get_all_candidates(db)
    return [_format_candidate(c) for c in candidates]



@router.post("/{candidate_id}/assign-exam", response_model=CandidateResponse)
async def assign_exam(
    candidate_id: str, 
    assignment: CandidateAssign,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Assign an exam to a candidate."""
    # Only validate if an exam_id is provided
    if assignment.exam_id:
        exam = get_exam_by_id(db, assignment.exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
    updated = assign_exam_to_candidate(db, candidate_id, assignment.exam_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _format_candidate(updated)

@router.post("/{candidate_id}/send-link")
async def send_candidate_link(
    candidate_id: str,
    background_tasks: BackgroundTasks,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Send (or resend) the unique exam link to the candidate's email."""
    candidates = get_all_candidates(db)
    candidate = next((c for c in candidates if str(c["id"]) == str(candidate_id)), None)
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    if not candidate.get("assigned_exam_id"):
        raise HTTPException(status_code=400, detail="No exam assigned to this candidate yet.")

    # Generate link
    test_link = f"{FRONTEND_URL}/#/test/{candidate['token']}"
    
    # Enqueue email task
    background_tasks.add_task(send_invitation_email, candidate['email'], candidate['name'], test_link)
    
    return {"message": "Exam link sent successfully"}

@router.post("/{candidate_id}/retest", response_model=CandidateResponse)
async def retest_candidate(
    candidate_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Reset a completed candidate back to 'Not Started' so they can retake the exam."""
    updated = reset_candidate_for_retest(db, candidate_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _format_candidate(updated)

@router.get("/test/{token}")
async def get_test(token: str, device_id: str = None, db: Session = Depends(get_db)):
    """Public endpoint for candidates to fetch their assigned exam."""
    candidate = get_candidate_by_token(db, token)
    if not candidate or not candidate.get("assigned_exam_id"):
        raise HTTPException(status_code=404, detail="Test not found or not assigned")
    
    if candidate.get("status") == "Completed":
        raise HTTPException(status_code=403, detail="Your exam has already been submitted and cannot be retaken.")

    if device_id:
        # Prevent ANOTHER person from using this device for the SAME EXAM, but allow the same email
        all_cands = get_all_candidates(db)
        for c in all_cands:
            if c.get("device_id") == device_id and c["email"] != candidate["email"] and c.get("assigned_exam_id") == candidate.get("assigned_exam_id"):
                raise HTTPException(status_code=403, detail="This device has already been used by another candidate for this exam. You cannot take this exam on this device.")

        saved_device = candidate.get("device_id")
        
        if not saved_device:
            update_candidate_details(db, candidate["id"], {"device_id": device_id})
        elif saved_device != device_id:
            raise HTTPException(status_code=403, detail="This exam link is bound to another device. You cannot access it from a different device.")

    exam = get_exam_by_id(db, candidate["assigned_exam_id"])
    if not exam:
        raise HTTPException(status_code=404, detail="Assigned exam not found")
        
    return {
        "candidate_name": candidate["name"],
        "exam": exam
    }

# Simple in-memory OTP store
# Format: { "email@example.com": { "otp": "123456", "expires_at": datetime, "data": dict } }
OTP_STORE: Dict[str, dict] = {}

def get_admin_otp():
    """Generate a 6-digit OTP that remains valid for a 10-minute window."""
    # 10 minute window (600 seconds)
    window = int(time.time() / 600)
    secret = os.environ.get("ADMIN_OTP_SECRET", "kiwi-admin-portal-otp-default-secret")
    hash_input = f"{secret}-{window}".encode()
    hash_hex = hashlib.sha256(hash_input).hexdigest()
    # Take a portion of the hash and format as 6-digit number
    return str(int(hash_hex[:8], 16) % 1000000).zfill(6)

@router.get("/current-admin-otp")
async def get_current_admin_otp(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
    """Return the current Admin OTP rotation code."""
    return {"admin_otp": get_admin_otp(), "expires_in": 600 - (int(time.time()) % 600)}

@router.get("/debug-smtp")
async def debug_smtp(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
    """Diagnose SMTP config on Render."""
    from app.core.config import SMTP_SERVER, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD
    
    config_status = {
        "SMTP_SERVER":   SMTP_SERVER,
        "SMTP_PORT":     SMTP_PORT,
        "SMTP_EMAIL":    SMTP_EMAIL if SMTP_EMAIL else "NOT SET",
        "SMTP_PASSWORD": f"SET (length={len(SMTP_PASSWORD)})" if SMTP_PASSWORD else "NOT SET",
    }

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        return {"config": config_status, "send_test": "SKIPPED — email or password not set"}

    success = send_email(SMTP_EMAIL, "Render SMTP Debug Test", "If you see this, SMTP is working correctly on Render!")
    return {"config": config_status, "send_test": "SUCCESS" if success else "FAILED"}

def get_exam_and_check_expiry(db: Session, exam_id: str):
    exam = get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    from datetime import datetime, timezone
    if exam.get("link_expiry"):
        expiry_str = exam["link_expiry"]
        if expiry_str.endswith('Z'):
            expiry_str = expiry_str[:-1] + '+00:00'
        expiry_dt = datetime.fromisoformat(expiry_str)
        now_dt = datetime.now(timezone.utc) if expiry_dt.tzinfo else datetime.now()
        if now_dt > expiry_dt:
            raise HTTPException(status_code=400, detail="This exam link has expired.")
    return exam

@router.post("/enroll/{exam_id}/request-otp")
async def request_enroll_otp(exam_id: str, req: CandidateEnrollOTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), device_id: str = None):
    """Generate and send an OTP for candidate self-enrollment."""
    get_exam_and_check_expiry(db, exam_id)
    
    existing = get_all_candidates(db)
    
    # 1. Check if email is already enrolled for THIS specific exam
    if any(c["email"] == req.email and c.get("assigned_exam_id") == exam_id for c in existing):
        raise HTTPException(
            status_code=400, 
            detail="You are already registered for this specific exam. Please check your email or contact the admin."
        )

    # 2. Check if device is already used by another candidate FOR THIS EXAM
    if device_id:
        if any(c.get("device_id") == device_id and c["email"] != req.email and c.get("assigned_exam_id") == exam_id for c in existing):
             raise HTTPException(
                status_code=403, 
                detail="This device has already been used to register or take this exam by another candidate. You cannot proceed using this device for this exam."
            )

    import random
    from datetime import datetime, timedelta
    
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.now() + timedelta(minutes=10)
    
    OTP_STORE[req.email] = {
        "otp": otp,
        "expires_at": expires_at,
        "data": req.dict()
    }
    
    # Send email synchronously or use the utility
    success = send_otp_email(req.email, req.name, otp)
    
    # ALWAYS return success so the frontend advances to the OTP entry screen.
    # If the email failed to send, the candidate can still use the Admin OTP fallback.
    return {"message": f"OTP processed for {req.email}"}

@router.post("/enroll/{exam_id}/verify-otp")
async def verify_enroll_otp(exam_id: str, req: CandidateEnrollOTPVerify, db: Session = Depends(get_db)):
    """Verify OTP and complete candidate enrollment."""
    get_exam_and_check_expiry(db, exam_id)

    # Check OTP
    from datetime import datetime
    record = OTP_STORE.get(req.email)
    if not record:
        raise HTTPException(status_code=400, detail="No OTP requested for this email.")
        
    if datetime.now() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
        
    # Validation: Check against both candidate-specific OTP and the current Admin rotation OTP
    admin_otp = get_admin_otp()
    if record["otp"] != req.otp and req.otp != admin_otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    # Check registration again just in case (specifically for this exam)
    existing = get_all_candidates(db)
    if any(c["email"] == req.email and c.get("assigned_exam_id") == exam_id for c in existing):
        raise HTTPException(status_code=400, detail="You are already registered for this exam.")
        
    # Clear OTP
    OTP_STORE.pop(req.email, None)
    
    candidate_data = record.get("data", {})
    candidate = create_candidate(
        db=db,
        name=str(candidate_data.get("name", record.get("name", ""))), 
        email=str(candidate_data.get("email", record.get("email", ""))), 
        phone_number=str(candidate_data.get("phone_number", "")), 
        dob=str(candidate_data.get("dob", "")),
        gender=str(candidate_data.get("gender", "")),
        address=str(candidate_data.get("address", "")),
        profile_photo=str(candidate_data.get("profile_photo", "")),
        cv_url="", # CV upload is separate
        device_id=str(req.device_id or "")
    )
    
    # Assign exam
    updated = assign_exam_to_candidate(db, str(candidate["id"]), exam_id)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to assign exam.")
        
    return _format_candidate(updated)
