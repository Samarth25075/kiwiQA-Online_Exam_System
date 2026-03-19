# app/exams/router.py
from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from app.auth.router import get_current_admin, check_permission
from app.auth.schemas import AdminUser
from app.exams.schemas import ExamCreate, ExamResponse, ExamFinalize, Question, ExamStatsResponse
from app.exams.service import save_exam, generate_questions, get_all_exams, delete_exam, get_exams_with_candidate_counts
from sqlalchemy.orm import Session
from app.database import get_db
# Remove redundant FastAPICache, using service-level caching instead

router = APIRouter(prefix="/exams", tags=["exams"])

@router.post("/preview", response_model=List[Question])
async def preview_exam(
    exam_in: ExamCreate,
    current_admin: Annotated[AdminUser, Depends(check_permission("generate exam"))]
):
    """Generate questions without saving."""
    return generate_questions(exam_in)

@router.post("", response_model=ExamResponse)
async def add_exam(
    exam_in: ExamFinalize,
    current_admin: Annotated[AdminUser, Depends(check_permission("generate exam"))],
    db: Session = Depends(get_db)
):
    """Finalize and save the exam."""
    res = save_exam(db, exam_in)
    return res

@router.get("", response_model=List[ExamResponse])
async def read_exams(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))], 
    db: Session = Depends(get_db),
    bypass_cache: bool = False
):
    """List all generated exams."""
    return get_all_exams(db, bypass_cache=bypass_cache)

@router.get("/stats", response_model=List[ExamStatsResponse])
async def read_exam_stats(current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))], db: Session = Depends(get_db)):
    """Returns each exam along with the count of candidates assigned to it."""
    return get_exams_with_candidate_counts(db)

@router.get("/{exam_id}", response_model=ExamResponse)
async def read_exam(
    exam_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db: Session = Depends(get_db)
):
    """Fetch a single exam with all questions."""
    from app.exams.service import get_exam_by_id
    exam = get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.delete("/{exam_id}")
async def remove_exam(
    exam_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db: Session = Depends(get_db)
):
    """Delete an exam."""
    success = delete_exam(db, exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"message": "Exam deleted"}

from pydantic import BaseModel

class ExpiryUpdate(BaseModel):
    link_expiry: Optional[str] = None
    auto_delete: Optional[str] = None

@router.put("/{exam_id}/expiry")
async def update_exam_expiry(
    exam_id: str,
    payload: ExpiryUpdate,
    background_tasks: BackgroundTasks,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db: Session = Depends(get_db)
):
    """Set the public link expiry for an exam."""
    # Only update fields that were actually provided in the JSON body
    update_data = payload.dict(exclude_unset=True)
    
    from app.exams.service import update_exam, check_and_delete_expired_exams
    success = update_exam(db, exam_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Run cleanup immediately
    check_and_delete_expired_exams(db)
    
    return {"message": "Expiry and/or deletion schedule updated"}
