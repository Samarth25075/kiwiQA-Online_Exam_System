# app/candidates/router.py
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, BackgroundTasks
import shutil
import os
import base64
import hashlib
import time
from email.message import EmailMessage
import smtplib

# Load environment variables from .env
from dotenv import load_dotenv
load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://kiwiqa-online-exam-system.onrender.com").rstrip("/")
BACKEND_URL = os.getenv("BACKEND_URL", "https://kiwiqa-api.onrender.com").rstrip("/")

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
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))]
):
    """Delete a candidate."""
    success = delete_candidate(candidate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Candidate deleted"}

@router.put("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: str,
    candidate_in: CandidateCreate,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))]
):
    """Update candidate details."""
    updated = update_candidate_details(candidate_id, candidate_in.dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _format_candidate(updated)

@router.post("/{candidate_id}/upload-cv")
async def upload_cv(
    candidate_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    file: UploadFile = File(...),
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
    update_candidate_details(candidate_id, {"cv_url": cv_url})
    
    return {"message": "File uploaded", "cv_url": cv_url}

@router.post("/test/{token}/status")
@router.get("/test/{token}/status") # Dual support for sendBeacon
async def set_candidate_status(token: str, status: str):
    """Update candidate status electronically (Live/Completed)."""
    print(f"DEBUG: Status update for {token}: {status}")
    success = update_candidate_status(token, status)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": f"Status updated to {status}"}
    
def send_screenshot_email(receiver_email: str, screenshot_path: str | None, candidate_name: str):
    try:
        msg = EmailMessage()
        msg['Subject'] = 'Your Exam Screenshot has been recorded'
        msg['From'] = os.environ.get("SMTP_EMAIL", 'exam-admin@example.com')
        msg['To'] = receiver_email
        msg.set_content(f"Hello {candidate_name},\n\nYour exam has concluded.{ ' Attached is the final screenshot taken at the moment of submission.' if screenshot_path else ''}\n\nThank you.")

        if screenshot_path and os.path.exists(screenshot_path):
            with open(screenshot_path, 'rb') as f:
                img_data = f.read()
                msg.add_attachment(img_data, maintype='image', subtype='png', filename='final_screenshot.png')

        # Since we don't have real credentials, we just log it. 
        # To make it function with real SMTP, configure SMTP_SERVER, PORT, EMAIL, PASSWORD here.
        print(f"DEBUG: Email built for {receiver_email}. Attempting to send...")
        
        from dotenv import load_dotenv
        load_dotenv()
        
        smtp_server = os.environ.get("SMTP_SERVER")
        smtp_port = os.environ.get("SMTP_PORT", 587)
        smtp_email = os.environ.get("SMTP_EMAIL")
        smtp_password = os.environ.get("SMTP_PASSWORD")
        
        if smtp_server and smtp_email and smtp_password:
            with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
            print(f"DEBUG: Screenshot email sent successfully to {receiver_email}.")
        else:
            print("DEBUG: Screenshot Email sent module finished (simulated/no-smtp credentials present).")
    except Exception as e:
        print(f"Error sending email: {e}")

def send_otp_email(receiver_email: str, candidate_name: str, otp: str):
    try:
        msg = EmailMessage()
        msg['Subject'] = 'Your Exam Portal Verification Code'
        msg['From'] = os.environ.get("SMTP_EMAIL", 'exam-admin@example.com')
        msg['To'] = receiver_email
        msg.set_content(f"Hello {candidate_name},\n\nYour verification code is: {otp}\nIt expires in 10 minutes.\n\nThank you.")

        print(f"DEBUG: OTP email built for {receiver_email}. Attempting to send...")
        
        from dotenv import load_dotenv
        load_dotenv()
        
        smtp_server = os.environ.get("SMTP_SERVER")
        smtp_port = os.environ.get("SMTP_PORT", 587)
        smtp_email = os.environ.get("SMTP_EMAIL")
        smtp_password = os.environ.get("SMTP_PASSWORD")
        
        if smtp_server and smtp_email and smtp_password:
            with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
            print(f"DEBUG: OTP email sent successfully to {receiver_email}.")
        else:
            print("DEBUG: OTP Email sent module finished (simulated/no-smtp credentials present).")
            print(f"==================================================")
            print(f"MOCK Email to {receiver_email}: OTP is {otp}")
            print(f"==================================================")
    except Exception as e:
        print(f"Error sending OTP email: {e}")

def send_invitation_email(receiver_email: str, candidate_name: str, test_link: str):
    try:
        msg = EmailMessage()
        msg['Subject'] = 'Invitation to Take Your Assessment'
        msg['From'] = os.environ.get("SMTP_EMAIL", 'exam-admin@example.com')
        msg['To'] = receiver_email
        msg.set_content(f"Hello {candidate_name},\n\nYou have been invited to complete an online assessment. Please use the link below to begin your test:\n\n{test_link}\n\nGood luck!")

        smtp_server = os.environ.get("SMTP_SERVER")
        smtp_port = os.environ.get("SMTP_PORT", 587)
        smtp_email = os.environ.get("SMTP_EMAIL")
        smtp_password = os.environ.get("SMTP_PASSWORD")
        
        if smtp_server and smtp_email and smtp_password:
            with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.send_message(msg)
            print(f"DEBUG: Invitation email sent successfully to {receiver_email}.")
        else:
             print(f"==================================================")
             print(f"MOCK Email to {receiver_email}: Link is {test_link}")
             print(f"==================================================")
    except Exception as e:
        print(f"Error sending invitation email: {e}")

@router.post("/test/{token}/submit")
async def submit_test(token: str, result: CandidateResult, background_tasks: BackgroundTasks):
    """Submit test results for a candidate."""
    success = update_candidate_result(token, result.score, result.total_questions, result.violations)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    candidate = get_candidate_by_token(token)
    
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
async def resend_test_results(token: str, background_tasks: BackgroundTasks):
    """Resend the test results email with screenshot."""
    candidate = get_candidate_by_token(token)
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
async def read_candidates(current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))]):
    """Fetch list of all candidates (Admin only)."""
    candidates = get_all_candidates()
    return [_format_candidate(c) for c in candidates]



@router.post("/{candidate_id}/assign-exam", response_model=CandidateResponse)
async def assign_exam(
    candidate_id: str, 
    assignment: CandidateAssign,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))]
):
    """Assign an exam to a candidate."""
    # Only validate if an exam_id is provided
    if assignment.exam_id:
        exam = get_exam_by_id(assignment.exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        
    updated = assign_exam_to_candidate(candidate_id, assignment.exam_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _format_candidate(updated)

@router.post("/{candidate_id}/send-link")
async def send_candidate_link(
    candidate_id: str,
    background_tasks: BackgroundTasks,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))]
):
    """Send (or resend) the unique exam link to the candidate's email."""
    candidates = get_all_candidates()
    candidate = next((c for c in candidates if str(c["id"]) == str(candidate_id)), None)
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    if not candidate.get("assigned_exam_id"):
        raise HTTPException(status_code=400, detail="No exam assigned to this candidate yet.")

    # Generate link
    test_link = f"{FRONTEND_URL}/test/{candidate['token']}"
    
    # Enqueue email task
    background_tasks.add_task(send_invitation_email, candidate['email'], candidate['name'], test_link)
    
    return {"message": "Exam link sent successfully"}

@router.post("/{candidate_id}/retest", response_model=CandidateResponse)
async def retest_candidate(
    candidate_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))]
):
    """Reset a completed candidate back to 'Not Started' so they can retake the exam."""
    updated = reset_candidate_for_retest(candidate_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _format_candidate(updated)

@router.get("/test/{token}")
async def get_test(token: str, device_id: str = None):
    """Public endpoint for candidates to fetch their assigned exam."""
    candidate = get_candidate_by_token(token)
    if not candidate or not candidate.get("assigned_exam_id"):
        raise HTTPException(status_code=404, detail="Test not found or not assigned")
    
    if candidate.get("status") == "Completed":
        raise HTTPException(status_code=403, detail="Your exam has already been submitted and cannot be retaken.")

    if device_id:
        # Prevent ANOTHER person from using this device, but allow the same email
        all_cands = get_all_candidates()
        for c in all_cands:
            if c.get("device_id") == device_id and c["email"] != candidate["email"]:
                raise HTTPException(status_code=403, detail="This device has already been used by another candidate. You cannot take the exam on this device.")

        saved_device = candidate.get("device_id")
        
        if not saved_device:
            update_candidate_details(candidate["id"], {"device_id": device_id})
        elif saved_device != device_id:
            raise HTTPException(status_code=403, detail="This exam link is bound to another device. You cannot access it from a different device.")

    exam = get_exam_by_id(candidate["assigned_exam_id"])
    if not exam:
        raise HTTPException(status_code=404, detail="Assigned exam not found")
        
    return {
        "candidate_name": candidate["name"],
        "exam": exam
    }

# Simple in-memory OTP store
# Format: { "email@example.com": { "otp": "123456", "expires_at": datetime } }
OTP_STORE = {}

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

def get_exam_and_check_expiry(exam_id: str):
    exam = get_exam_by_id(exam_id)
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
async def request_enroll_otp(exam_id: str, req: CandidateEnrollOTPRequest, background_tasks: BackgroundTasks, device_id: str = None):
    """Generate and send an OTP for candidate self-enrollment."""
    get_exam_and_check_expiry(exam_id)
    
    existing = get_all_candidates()
    
    # 1. Check if email is already enrolled for THIS specific exam
    if any(c["email"] == req.email and c.get("assigned_exam_id") == exam_id for c in existing):
        raise HTTPException(
            status_code=400, 
            detail="You are already registered for this specific exam. Please check your email or contact the admin."
        )

    # 2. Check if device is already used by another candidate
    if device_id:
        if any(c.get("device_id") == device_id and c["email"] != req.email for c in existing):
             raise HTTPException(
                status_code=403, 
                detail="This device has already been used to register or take an exam by another candidate. You cannot proceed using this device."
            )

    import random
    from datetime import datetime, timedelta
    
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.now() + timedelta(minutes=10)
    
    OTP_STORE[req.email] = {
        "otp": otp,
        "expires_at": expires_at
    }
    
    # Send email natively in background task
    background_tasks.add_task(send_otp_email, req.email, req.name, otp)
    
    return {"message": f"OTP sent to {req.email}"}

@router.post("/enroll/{exam_id}/verify-otp")
async def verify_enroll_otp(exam_id: str, req: CandidateEnrollOTPVerify):
    """Verify OTP and complete candidate enrollment."""
    get_exam_and_check_expiry(exam_id)

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
    existing = get_all_candidates()
    if any(c["email"] == req.email and c.get("assigned_exam_id") == exam_id for c in existing):
        raise HTTPException(status_code=400, detail="You are already registered for this exam.")
        
    # Clear OTP
    if req.email in OTP_STORE:
        del OTP_STORE[req.email]
    
    # Create candidate
    candidate = create_candidate(
        req.name, 
        req.email, 
        req.phone_number or "", 
        req.cv_url or ""
    )
    
    # Assign exam
    updated = assign_exam_to_candidate(str(candidate["id"]), exam_id)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to assign exam.")
        
    return _format_candidate(updated)
