# app/candidates/admin_router.py
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, BackgroundTasks
import os
import shutil
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import BACKEND_URL, FRONTEND_URL
from app.auth.router import get_current_admin, check_permission
from app.auth.schemas import AdminUser
from app.candidates.schemas import CandidateCreate, CandidateResponse, CandidateAssign
from app.models import Candidate
from app.candidates.service import (
    get_all_candidates, create_candidate, assign_exam_to_candidate, 
    delete_candidate, update_candidate_details,
    reset_candidate_for_retest, cleanup_candidate_screenshots,
    _to_full_dict, _to_summary_dict
)
from app.exams.service import get_exam_by_id
from .utils import _format_candidate, send_invitation_email, send_email

router = APIRouter(prefix="/candidates", tags=["admin-candidates"])

def check_any_authority(required_perms: list):
    async def authority_dependency(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
        if current_admin.role == "admin":
            return current_admin
        if any(p in current_admin.permissions for p in required_perms):
            return current_admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. You need one of these authorities: {', '.join(required_perms)}"
        )
    return authority_dependency

@router.get("", response_model=List[CandidateResponse])
async def read_candidates(
    current_admin: Annotated[AdminUser, Depends(check_any_authority(["manage candidates", "send invitation", "view results"]))], 
    db: Session = Depends(get_db)
):
    """Fetch list of all candidates (Admin only)."""
    candidates = get_all_candidates(db)
    return [_format_candidate(c) for c in candidates]

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
        country_code=candidate_in.country_code or "",
        phone_number=candidate_in.phone_number or "",
        dob=candidate_in.dob or "",
        gender=candidate_in.gender or "",
        address=candidate_in.address or "",
        profile_photo=candidate_in.profile_photo or "",
        admin_name=current_admin.full_name
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

@router.post("/{candidate_id}/upload-cv")
async def upload_cv(
    candidate_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a CV file for a candidate."""
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"cv_{candidate_id}{file_ext}"
    file_path = os.path.join("static", "uploads", "cvs", file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    cv_url = f"{BACKEND_URL}/static/uploads/cvs/{file_name}"
    update_candidate_details(db, candidate_id, {"cv_url": cv_url})
    
    return {"message": "File uploaded", "cv_url": cv_url}

@router.post("/{candidate_id}/cleanup-screenshots")
async def cleanup_screenshots(
    candidate_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Delete proctoring images from disk and clear DB references search for the candidate."""
    success = cleanup_candidate_screenshots(db, candidate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"message": "Proctoring data cleaned up"}

@router.get("/{candidate_id}/report")
async def get_candidate_report(
    candidate_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("view results"))],
    db: Session = Depends(get_db)
):
    """Generate a detailed report for a candidate including proctoring and performance stats."""
    candidate_obj = db.query(Candidate).filter(Candidate.id == int(candidate_id)).first()
    if not candidate_obj:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate = _to_full_dict(candidate_obj)
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    if candidate.get("status") != "Completed":
         raise HTTPException(status_code=400, detail="Candidate has not completed the exam yet.")

    exam = get_exam_by_id(db, candidate["assigned_exam_id"])
    if not exam:
        raise HTTPException(status_code=404, detail="Exam data not found")

    # performance stats by category
    stats = {}
    questions = exam.get("questions", [])
    answers = candidate.get("answers", [])
    
    # Create a lookup for answers by original question index
    # We use string keys and also handle any empty/None answers
    ans_lookup = {}
    if answers:
        for a in answers:
            if a and "question_index" in a:
                ans_lookup[str(a["question_index"])] = a

    report_questions = []
    for idx, q in enumerate(questions):
        cat = q.get("category", "General")
        marks = q.get("marks", 1.0)
        q_type = str(q.get("type", "multiple-choice")).lower()
        
        if cat not in stats:
            stats[cat] = {"correct": 0, "total": 0, "count": 0, "attempted": 0}
        
        stats[cat]["count"] += 1
        stats[cat]["total"] += marks
        
        # Robust lookup by index
        curr_ans = ans_lookup.get(str(idx))
        is_correct = False
        
        if curr_ans:
             stats[cat]["attempted"] += 1
             if q_type == 'coding':
                 results = curr_ans.get("test_results", [])
                 passed_count = len([r for r in results if r.get("passed")])
                 total_test_cases = len(results)
                 pass_pct = (passed_count / total_test_cases * 100) if total_test_cases > 0 else 0
                 
                 threshold = q.get("threshold_pct", 100)
                 if pass_pct >= threshold:
                     is_correct = True
                     stats[cat]["correct"] += marks
             else:
                 selected = curr_ans.get("selected_option_index")
                 options = q.get("options", [])
                 if selected is not None and 0 <= selected < len(options):
                     if options[selected].get("is_correct"):
                         is_correct = True
                         stats[cat]["correct"] += marks

        report_questions.append({
            "text": q["text"],
            "type": q_type,
            "options": q.get("options", []),
            "selected_index": curr_ans.get("selected_option_index") if curr_ans else None,
            "code": curr_ans.get("code") if curr_ans else None,
            "language": curr_ans.get("language", q.get("language", "javascript")) if curr_ans else q.get("language", "javascript"),
            "test_results": curr_ans.get("test_results") if curr_ans else None,
            "category": cat,
            "marks": marks,
            "explanation": q.get("explanation"),
            "is_correct": is_correct
        })

    return {
        "candidate": candidate,
        "exam_title": exam["title"],
        "passing_score": exam.get("passing_score", 50),
        "stats": stats,
        "questions": report_questions,
        "proctoring": {
            "start": candidate.get("screenshot_start"),
            "mid": candidate.get("screenshot_mid"),
            "end": candidate.get("screenshot_end")
        }
    }

@router.post("/{candidate_id}/assign-exam", response_model=CandidateResponse)
async def assign_exam(
    candidate_id: str, 
    assignment: CandidateAssign,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Assign an exam to a candidate."""
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
    current_admin: Annotated[AdminUser, Depends(check_permission("send invitation"))],
    db: Session = Depends(get_db)
):
    """Send (or resend) the unique exam link to the candidate's email."""
    # Optimized direct fetch from DB
    candidate_obj = db.query(Candidate).filter(Candidate.id == int(candidate_id)).first()
    if not candidate_obj:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate = _to_summary_dict(candidate_obj)
    if not candidate.get("assigned_exam_id"):
        raise HTTPException(status_code=400, detail="No exam assigned to this candidate yet.")

    test_link = f"{FRONTEND_URL}/#/test/{candidate['token']}"
    
    # Record the invitation for tracking
    from app.models import ExamInvitation
    from datetime import datetime
    inv = ExamInvitation(
        exam_id=candidate['assigned_exam_id'],
        email=candidate['email'],
        sent_at=datetime.now().isoformat()
    )
    db.add(inv)
    db.commit()

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

@router.get("/current-admin-otp")
async def get_current_admin_otp(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
    """Return the current Admin OTP rotation code."""
    import hashlib
    import time
    window = int(time.time() / 80)
    secret = os.environ.get("ADMIN_OTP_SECRET", "kiwi-admin-portal-otp-default-secret")
    hash_hex = hashlib.sha256(f"{secret}-{window}".encode()).hexdigest()
    admin_otp = str(int(hash_hex[:8], 16) % 1000000).zfill(6)
    return {"admin_otp": admin_otp, "expires_in": 80 - (int(time.time()) % 80)}

@router.get("/debug-smtp")
async def debug_smtp(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
    """Diagnose SMTP config on Render."""
    from app.core.config import SMTP_SERVER, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD
    config_status = {
        "SMTP_SERVER": SMTP_SERVER,
        "SMTP_PORT": SMTP_PORT,
        "SMTP_EMAIL": SMTP_EMAIL if SMTP_EMAIL else "NOT SET",
        "SMTP_PASSWORD": f"SET (length={len(SMTP_PASSWORD)})" if SMTP_PASSWORD else "NOT SET",
    }
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        return {"config": config_status, "send_test": "SKIPPED"}
    success = send_email(SMTP_EMAIL, "Render SMTP Debug Test", "Test")
    return {"config": config_status, "send_test": "SUCCESS" if success else "FAILED"}
