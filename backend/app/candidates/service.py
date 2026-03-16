import uuid
from datetime import datetime
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models import Candidate

def _to_dict(c: Candidate) -> Dict:
    if not c: return None
    return {
        "id": str(c.id),
        "candidate_id": c.candidate_id,
        "name": c.name or "",
        "email": c.email or "",
        "phone_number": c.phone_number or "",
        "dob": c.dob or "",
        "gender": c.gender or "",
        "address": c.address or "",
        "profile_photo": c.profile_photo or "",
        "cv_url": c.cv_url or "",
        "status": c.status or "",
        "joined_date": c.joined_date or "",
        "token": c.token or "",
        "assigned_exam_id": c.assigned_exam_id or "",
        "exam_title": c.exam.title if c.exam else "No Exam Assigned",
        "score": c.score,
        "total_questions": c.total_questions,
        "violations": c.violations if c.violations is not None else 0,
        "device_id": c.device_id or ""
    }

def get_all_candidates(db: Session) -> List[Dict]:
    from sqlalchemy.orm import joinedload
    from app.core.redis import get_cached_data, set_cached_data
    
    # Try cache first
    cached = get_cached_data("all_candidates_list")
    if cached:
        return cached

    # Use joinedload to fetch exam data in ONE query instead of many
    candidates = db.query(Candidate).options(joinedload(Candidate.exam)).order_by(Candidate.id.desc()).all()
    res = [_to_dict(c) for c in candidates]
    
    # Store in cache for 5 minutes
    set_cached_data("all_candidates_list", res, expire=300)
    return res

def create_candidate(db: Session, name: str, email: str, phone_number: str = "", dob: str = "", gender: str = "", address: str = "", profile_photo: str = "", cv_url: str = "", device_id: str = "") -> Dict:
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
    return _to_dict(new_cand)

def assign_exam_to_candidate(db: Session, candidate_id: str, exam_id: str) -> Dict | None:
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return None
    c = db.query(Candidate).filter(Candidate.id == cand_id_int).first()
    if c:
        c.assigned_exam_id = exam_id
        db.commit()
        db.refresh(c)
        return _to_dict(c)
    return None

def get_candidate_by_token(db: Session, token: str) -> Dict | None:
    c = db.query(Candidate).filter(Candidate.token == token).first()
    return _to_dict(c)

def update_candidate_status(db: Session, token: str, status: str) -> bool:
    c = db.query(Candidate).filter(Candidate.token == token).first()
    if c:
        c.status = status
        db.commit()
        return True
    return False

def delete_candidate(db: Session, candidate_id: str) -> bool:
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return False
    c = db.query(Candidate).filter(Candidate.id == cand_id_int).first()
    if c:
        db.delete(c)
        db.commit()
        return True
    return False

def update_candidate_details(db: Session, candidate_id: str, data: Dict) -> Dict | None:
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
        return _to_dict(c)
    return None

def update_candidate_result(db: Session, token: str, score: int, total: int, violations: int = 0) -> bool:
    c = db.query(Candidate).filter(Candidate.token == token).first()
    if c:
        c.score = score
        c.total_questions = total
        c.violations = violations
        c.status = "Completed"
        db.commit()
        return True
    return False

def reset_candidate_for_retest(db: Session, candidate_id: str) -> Dict | None:
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
        return _to_dict(c)
    return None
