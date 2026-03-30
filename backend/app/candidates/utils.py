import os
import time
import hashlib
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.core.email import send_email
from app.core.config import FRONTEND_URL, BACKEND_URL
from app.candidates.schemas import CandidateResponse
from app.exams.service import get_exam_by_id

def _format_candidate(c: dict) -> CandidateResponse:
    test_link = f"{FRONTEND_URL}/test/{c['token']}"
    return CandidateResponse(**c, test_link=test_link)

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

def send_report_email(receiver_email: str, candidate_name: str, report_link: str):
    subject = 'Your Assessment Report is Ready'
    content = f"Hello {candidate_name},\n\nYour assessment results and detailed report are now available. You can view them using the secure link below:\n\n{report_link}\n\nThank you for your time."
    send_email(receiver_email, subject, content)

def get_admin_otp():
    """Generate a 6-digit OTP that remains valid for a 80-second window."""
    window = int(time.time() / 80)
    secret = os.environ.get("ADMIN_OTP_SECRET", "kiwi-admin-portal-otp-default-secret")
    hash_hex = hashlib.sha256(f"{secret}-{window}".encode()).hexdigest()
    return str(int(hash_hex[:8], 16) % 1000000).zfill(6)

def get_exam_and_check_expiry(db: Session, exam_id: str):
    exam = get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    if exam.get("link_expiry"):
        expiry_str = exam["link_expiry"]
        if expiry_str.endswith('Z'):
            expiry_str = expiry_str[:-1] + '+00:00'
        expiry_dt = datetime.fromisoformat(expiry_str)
        now_dt = datetime.now(timezone.utc) if expiry_dt.tzinfo else datetime.now()
        if now_dt > expiry_dt:
            raise HTTPException(status_code=400, detail="This exam link has expired.")
    return exam
