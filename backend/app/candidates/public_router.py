# app/candidates/public_router.py
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import os
import base64
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import BACKEND_URL
from app.candidates.schemas import (
    CandidateResult, CandidateEnrollOTPRequest, CandidateEnrollOTPVerify
)
from app.candidates.service import (
    get_candidate_by_token, update_candidate_status, 
    update_candidate_result, update_candidate_details,
    get_all_candidates, create_candidate, assign_exam_to_candidate,
    get_candidate_by_token_summary, is_device_used_for_exam
)
from .utils import (
    _format_candidate, send_screenshot_email, send_otp_email, 
    get_admin_otp, get_exam_and_check_expiry
)
import random
from datetime import datetime, timedelta

router = APIRouter(tags=["candidate-testing"])

# Simple in-memory OTP store (Moved from original router)
OTP_STORE: Dict[str, dict] = {}

@router.post("/test/{token}/status")
@router.get("/test/{token}/status")
async def set_candidate_status(token: str, status: str, db: Session = Depends(get_db)):
    """Update candidate status electronically (Live/Completed)."""
    success = update_candidate_status(db, token, status)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": f"Status updated to {status}"}

@router.post("/test/{token}/submit")
async def submit_test(token: str, result: CandidateResult, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Submit test results for a candidate with proctoring snapshots and answers."""
    screenshots = {}
    screenshots_dir = os.path.join("static", "uploads", "screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)

    for shot_type in ["start", "mid", "end"]:
        shot_data = getattr(result, f"screenshot_{shot_type}")
        if shot_data:
            try:
                header, encoded = shot_data.split(",", 1) if "," in shot_data else ("", shot_data)
                file_name = f"screenshot_{token}_{shot_type}.png"
                file_path = os.path.join(screenshots_dir, file_name)
                with open(file_path, "wb") as fh:
                    fh.write(base64.b64decode(encoded))
                screenshots[shot_type] = f"{BACKEND_URL}/static/uploads/screenshots/{file_name}"
            except Exception as e:
                print(f"Error saving {shot_type} screenshot: {e}")

    if not result.screenshot_end and result.screenshot:
        try:
             header, encoded = result.screenshot.split(",", 1) if "," in result.screenshot else ("", result.screenshot)
             file_name = f"screenshot_{token}_end.png"
             file_path = os.path.join(screenshots_dir, file_name)
             with open(file_path, "wb") as fh:
                 fh.write(base64.b64decode(encoded))
             screenshots["end"] = f"{BACKEND_URL}/static/uploads/screenshots/{file_name}"
        except: pass

    success = update_candidate_result(
        db, token, result.score, result.total_questions, result.total_marks, result.violations, 
        answers=result.answers, screenshots=screenshots
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    candidate = get_candidate_by_token(db, token)
    if screenshots.get("end") and candidate:
        background_tasks.add_task(send_screenshot_email, candidate['email'], os.path.join(screenshots_dir, f"screenshot_{token}_end.png"), candidate['name'])

    return {"message": "Results submitted successfully"}

@router.post("/test/{token}/resend-results")
async def resend_test_results(token: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Resend the test results email with screenshot."""
    candidate = get_candidate_by_token(db, token)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.get("status") != "Completed":
        raise HTTPException(status_code=400, detail="Exam not completed yet.")

    screenshots_dir = os.path.join("static", "uploads", "screenshots")
    file_name = f"screenshot_{token}.png" # Note: check if this naming is correct in the original
    file_path = os.path.join(screenshots_dir, file_name)
    
    background_tasks.add_task(send_screenshot_email, candidate['email'], file_path if os.path.exists(file_path) else None, candidate['name'])
    return {"message": "Email resent successfully"}

@router.get("/test/{token}")
async def get_test(token: str, device_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Public endpoint for candidates to fetch their assigned exam."""
    # Use optimized summary fetch
    candidate = get_candidate_by_token_summary(db, token)
    if not candidate or not candidate.get("assigned_exam_id"):
        raise HTTPException(status_code=404, detail="Test not found or not assigned")
    
    if candidate.get("status") == "Completed":
        raise HTTPException(status_code=403, detail="Your exam has already been submitted and cannot be retaken.")

    if device_id:
        # Optimized direct DB check instead of O(n) scan
        if is_device_used_for_exam(db, device_id, candidate["email"], candidate["assigned_exam_id"]):
            raise HTTPException(status_code=403, detail="This device has already been used by another candidate for this exam.")

        saved_device = candidate.get("device_id")
        if not saved_device:
            update_candidate_details(db, candidate["id"], {"device_id": device_id})
        elif saved_device != device_id:
            raise HTTPException(status_code=403, detail="This exam link is bound to another device.")

    from app.exams.service import get_exam_by_id
    exam = get_exam_by_id(db, candidate["assigned_exam_id"])
    if not exam:
        raise HTTPException(status_code=404, detail="Assigned exam not found")
        
    return {
        "candidate_name": candidate["name"],
        "exam": exam
    }

@router.post("/enroll/{exam_id}/request-otp")
async def request_enroll_otp(exam_id: str, req: CandidateEnrollOTPRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), device_id: Optional[str] = None):
    """Generate and send an OTP for candidate self-enrollment."""
    from app.models import Candidate
    get_exam_and_check_expiry(db, exam_id)
    
    # Optimized direct DB checks
    already_registered = db.query(Candidate).filter(
        Candidate.email == req.email,
        Candidate.assigned_exam_id == exam_id
    ).first() is not None
    
    if already_registered:
        raise HTTPException(status_code=400, detail="You are already registered for this specific exam.")

    if device_id:
        device_conflict = db.query(Candidate).filter(
            Candidate.device_id == device_id,
            Candidate.email != req.email,
            Candidate.assigned_exam_id == exam_id
        ).first() is not None
        
        if device_conflict:
             raise HTTPException(status_code=403, detail="This device has already been used to register for this exam.")

    otp = str(random.randint(100000, 999999))
    expires_at = datetime.now() + timedelta(minutes=10)
    
    OTP_STORE[req.email] = {
        "otp": otp,
        "expires_at": expires_at,
        "data": req.dict()
    }
    
    send_otp_email(req.email, req.name, otp)
    return {"message": f"OTP processed for {req.email}"}

@router.post("/enroll/{exam_id}/verify-otp")
async def verify_enroll_otp(exam_id: str, req: CandidateEnrollOTPVerify, db: Session = Depends(get_db)):
    """Verify OTP and complete candidate enrollment."""
    get_exam_and_check_expiry(db, exam_id)
    record = OTP_STORE.get(req.email)
    if not record:
        raise HTTPException(status_code=400, detail="No OTP requested.")
        
    if datetime.now() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP has expired.")
        
    admin_otp = get_admin_otp()
    if record["otp"] != req.otp and req.otp != admin_otp:
        raise HTTPException(status_code=400, detail="Invalid OTP.")
        
    existing = get_all_candidates(db)
    if any(c["email"] == req.email and c.get("assigned_exam_id") == exam_id for c in existing):
        raise HTTPException(status_code=400, detail="Already registered.")
        
    OTP_STORE.pop(req.email, None)
    candidate_data = record.get("data", {})
    candidate = create_candidate(
        db=db,
        name=str(candidate_data.get("name", record.get("name", ""))), 
        email=str(candidate_data.get("email", record.get("email", ""))), 
        country_code=str(candidate_data.get("country_code", "")),
        phone_number=str(candidate_data.get("phone_number", "")), 
        dob=str(candidate_data.get("dob", "")),
        gender=str(candidate_data.get("gender", "")),
        address=str(candidate_data.get("address", "")),
        profile_photo=str(candidate_data.get("profile_photo", "")),
        cv_url="", 
        device_id=str(req.device_id or "")
    )
    
    updated = assign_exam_to_candidate(db, str(candidate["id"]), exam_id)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to assign exam.")
    return _format_candidate(updated)
