import uuid
from datetime import datetime
from typing import List, Dict
from sqlalchemy.orm import Session, joinedload, defer
from app.models import Candidate

def _to_summary_dict(c: Candidate) -> Dict:
    """Lightweight mapping for list views (excludes base64/JSON if possible, but includes performance metadata)."""
    if not c: return None
    
    # Calculate incorrect question indices (1-indexed) if answers are available
    incorrect_nums = []
    if c.status == "Completed" and c.answers and c.exam and c.exam.questions:
        try:
            questions = c.exam.questions
            ans_lookup = {a.get("question_index"): a.get("selected_index") for a in c.answers if "question_index" in a}
            for idx, q in enumerate(questions):
                selected = ans_lookup.get(idx)
                # If no choice made or choice is different from correct one
                correct_idx = next((i for i, opt in enumerate(q.get("options", [])) if opt.get("is_correct")), None)
                if selected is None or selected != correct_idx:
                    incorrect_nums.append(idx + 1)
        except Exception as e:
            print(f"Error calculating incorrect_nums: {e}")
            
    return {
        "id": str(c.id),
        "candidate_id": c.candidate_id,
        "name": c.name or "",
        "email": c.email or "",
        "phone_number": c.phone_number or "",
        "status": c.status or "",
        "joined_date": c.joined_date or "",
        "token": c.token or "",
        "assigned_exam_id": c.assigned_exam_id or "",
        "exam_title": c.exam.title if c.exam else "No Exam Assigned",
        "score": c.score,
        "total_questions": c.total_questions,
        "total_marks": c.total_marks,
        "violations": c.violations if c.violations is not None else 0,
        "incorrect_question_nums": incorrect_nums
    }

def _to_full_dict(c: Candidate) -> Dict:
    """Full mapping including heavy proctoring and result data."""
    if not c: return None
    data = _to_summary_dict(c)
    data.update({
        "dob": c.dob or "",
        "gender": c.gender or "",
        "address": c.address or "",
        "profile_photo": c.profile_photo or "",
        "cv_url": c.cv_url or "",
        "device_id": c.device_id or "",
        "answers": c.answers or [],
        "screenshot_start": c.screenshot_start or "",
        "screenshot_mid": c.screenshot_mid or "",
        "screenshot_end": c.screenshot_end or ""
    })
    return data

def get_all_candidates(db: Session, **kwargs) -> List[Dict]:
    bypass_cache = kwargs.get("bypass_cache", False)
    """Fetch all candidates from DB. Supports bypass_cache for real-time dashboard updates."""
    from sqlalchemy.orm import joinedload, undefer
    from app.core.redis import get_cached_data, set_cached_data
    from app.models import Exam
    
    # Cache key for summary list
    if not bypass_cache:
        cached = get_cached_data("all_candidates_list_summary")
        if cached:
            return cached

    # Use joinedload and fetch essential result data needed for 'incorrect question numbers'
    # We undefer answers and exam.questions to calculate the metadata on the fly
    candidates = db.query(Candidate).options(
        joinedload(Candidate.exam).undefer(Exam.questions),
        undefer(Candidate.answers),
        defer(Candidate.profile_photo),
        defer(Candidate.screenshot_start),
        defer(Candidate.screenshot_mid),
        defer(Candidate.screenshot_end)
    ).order_by(Candidate.id.desc()).all()
    res = [_to_summary_dict(c) for c in candidates]
    
    set_cached_data("all_candidates_list_summary", res, expire=300)
    return res
    
    set_cached_data("all_candidates_list_summary", res, expire=300)
    return res

def create_candidate(db: Session, name: str, email: str, phone_number: str = "", dob: str = "", gender: str = "", address: str = "", profile_photo: str = "", cv_url: str = "", device_id: str = "") -> Dict:
    from app.core.redis import redis_client
    current_year = datetime.now().year
    
    highest_id = db.query(Candidate).order_by(Candidate.id.desc()).first()
    numeric_id = (highest_id.id if highest_id else 0) + 1
    
    candidate_id_str = f"CAND-{current_year}-{str(numeric_id).zfill(3)}"
    
    new_cand = Candidate(
        candidate_id=candidate_id_str,
        name=name,
        email=email,
        phone_number=phone_number,
        dob=dob,
        gender=gender,
        address=address,
        profile_photo=profile_photo,
        cv_url=cv_url,
        status="Not Started",
        joined_date=datetime.now().strftime("%Y-%m-%d"),
        token=str(uuid.uuid4()),
        assigned_exam_id=None,
        score=None,
        total_questions=None,
        violations=0,
        device_id=device_id
    )
    db.add(new_cand)
    db.commit()
    db.refresh(new_cand)
    
    if redis_client:
        redis_client.delete("all_candidates_list", "exams_with_counts")
        
    return _to_full_dict(new_cand)

def assign_exam_to_candidate(db: Session, candidate_id: str, exam_id: str) -> Dict | None:
    from app.core.redis import redis_client
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return None
    c = db.query(Candidate).filter(Candidate.id == cand_id_int).first()
    if c:
        c.assigned_exam_id = exam_id
        db.commit()
        db.refresh(c)
        if redis_client:
            redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return _to_full_dict(c)
    return None

def get_candidate_by_token(db: Session, token: str) -> Dict | None:
    c = db.query(Candidate).filter(Candidate.token == token).first()
    return _to_full_dict(c) if c else None

def get_candidate_by_token_summary(db: Session, token: str) -> Dict | None:
    """Optimized fetch that avoids loading heavy deferred fields."""
    c = db.query(Candidate).filter(Candidate.token == token).first()
    return _to_summary_dict(c) if c else None

def is_device_used_for_exam(db: Session, device_id: str, exclude_email: str, exam_id: str) -> bool:
    """Direct database check for device usage instead of fetching all candidates."""
    exists = db.query(Candidate).filter(
        Candidate.device_id == device_id,
        Candidate.email != exclude_email,
        Candidate.assigned_exam_id == exam_id
    ).first() is not None
    return exists

def update_candidate_status(db: Session, token: str, status: str) -> bool:
    from app.core.redis import redis_client
    c = db.query(Candidate).filter(Candidate.token == token).first()
    if c:
        c.status = status
        db.commit()
        if redis_client:
            redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return True
    return False

def delete_candidate(db: Session, candidate_id: str) -> bool:
    from app.core.redis import redis_client
    import os
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return False
    c = db.query(Candidate).filter(Candidate.id == cand_id_int).first()
    if c:
        # Delete screenshots from disk if they exist
        for attr in ["screenshot_start", "screenshot_mid", "screenshot_end"]:
            url = getattr(c, attr)
            if url and "/static/uploads/screenshots/" in url:
                file_name = url.split("/")[-1]
                file_path = os.path.join("static", "uploads", "screenshots", file_name)
                if os.path.exists(file_path):
                    try: os.remove(file_path)
                    except: pass
        
        db.delete(c)
        db.commit()
        if redis_client:
            redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return True
    return False

def update_candidate_details(db: Session, candidate_id: str, data: Dict) -> Dict | None:
    from app.core.redis import redis_client
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return None
    c = db.query(Candidate).filter(Candidate.id == cand_id_int).first()
    if c:
        for k, v in data.items():
            if hasattr(c, k):
                setattr(c, k, v)
        db.commit()
        db.refresh(c)
        if redis_client:
            redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return _to_full_dict(c)
    return None

def update_candidate_result(db: Session, token: str, score: float, total: int, total_marks: float, violations: int = 0, answers: list = None, screenshots: dict = None) -> bool:
    from app.core.redis import redis_client
    c = db.query(Candidate).filter(Candidate.token == token).first()
    if c:
        c.score = score
        c.total_questions = total
        c.total_marks = total_marks
        c.violations = violations
        c.status = "Completed"
        if answers is not None:
            c.answers = answers
        if screenshots:
            c.screenshot_start = screenshots.get("start")
            c.screenshot_mid = screenshots.get("mid")
            c.screenshot_end = screenshots.get("end")
            
        db.commit()
        if redis_client:
            redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return True
    return False

def cleanup_candidate_screenshots(db: Session, candidate_id: str) -> bool:
    from app.core.redis import redis_client
    import os
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return False
    c = db.query(Candidate).filter(Candidate.id == cand_id_int).first()
    if c:
        # Delete files from disk
        for attr in ["screenshot_start", "screenshot_mid", "screenshot_end"]:
            url = getattr(c, attr)
            if url and "/static/uploads/screenshots/" in url:
                file_name = url.split("/")[-1]
                file_path = os.path.join("static", "uploads", "screenshots", file_name)
                if os.path.exists(file_path):
                    try: os.remove(file_path)
                    except: pass
            setattr(c, attr, None) # Clear in DB
            
        db.commit()
        if redis_client:
            redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return True
    return False

def reset_candidate_for_retest(db: Session, candidate_id: str) -> Dict | None:
    from app.core.redis import redis_client
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return None
    c = db.query(Candidate).filter(Candidate.id == cand_id_int).first()
    if c:
        c.status = "Not Started"
        c.score = None
        c.total_questions = None
        c.violations = 0
        c.device_id = ""
        db.commit()
        db.refresh(c)
        if redis_client:
            redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return _to_full_dict(c)
    return None
