# app/exams/router.py
from typing import List, Annotated, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from app.auth.router import get_current_admin, check_permission
from app.auth.schemas import AdminUser
from app.exams.schemas import ExamCreate, ExamResponse, ExamFinalize, Question, ExamStatsResponse, SendExamLinkRequest
from app.exams.service import save_exam, generate_questions, get_all_exams, delete_exam, get_exams_with_candidate_counts, get_bank_categories, get_bank_stats, get_exam_by_id, add_to_bank, upload_to_bank, get_bank_questions_by_category, update_bank_question, delete_bank_question
from app.core.email import send_email
from sqlalchemy.orm import Session
from app.database import get_db
# Remove redundant FastAPICache, using service-level caching instead

router = APIRouter(tags=["exams"])



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
async def read_exam_stats(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))], 
    db: Session = Depends(get_db),
    bypass_cache: bool = False
):
    """Returns each exam along with the count of candidates assigned to it."""
    return get_exams_with_candidate_counts(db, bypass_cache=bypass_cache)

@router.get("/bank/categories", response_model=List[str])
async def read_bank_categories(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db: Session = Depends(get_db)
):
    """Get unique categories from the inbuilt question bank."""
    return get_bank_categories(db)

@router.get("/bank/stats", response_model=List[Dict])
async def read_bank_stats(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db: Session = Depends(get_db)
):
    """Get category-wise stats (count, marks) from the question bank."""
    return get_bank_stats(db)

@router.get("/bank/questions", response_model=List[Dict])
async def read_bank_questions(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    category: Optional[str] = None
):
    """Get all questions in a category from the bank."""
    from app.exams.service import get_bank_questions_by_category
    return get_bank_questions_by_category(category)

@router.put("/bank/questions/{q_id}")
async def update_bank_question_route(
    q_id: str,
    question: Dict,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))]
):
    """Update a specific question in the bank."""
    from app.exams.service import update_bank_question
    if update_bank_question(q_id, question):
        return {"message": "Question updated"}
    raise HTTPException(status_code=404, detail="Question not found")

@router.delete("/bank/questions/{q_id}")
async def delete_bank_question_route(
    q_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))]
):
    """Delete a specific question from the bank."""
    from app.exams.service import delete_bank_question
    if delete_bank_question(q_id):
        return {"message": "Question deleted"}
    raise HTTPException(status_code=404, detail="Question not found")

@router.post("/bank/add")
async def add_individual_question_to_bank(
    question: Dict,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))]
):
    """Add a single question to the inbuilt bank."""
    if add_to_bank(question):
        return {"message": "Question added to bank"}
    raise HTTPException(status_code=500, detail="Failed to update bank")

@router.post("/bank/upload")
async def upload_bulk_questions_to_bank(
    questions: List[Dict],
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))]
):
    """Upload a list of questions to the inbuilt bank."""
    if upload_to_bank(questions):
        return {"message": f"{len(questions)} questions uploaded to bank"}
    raise HTTPException(status_code=500, detail="Failed to update bank")
@router.get("/invitations/tracking")
async def read_invitation_tracking(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage candidates"))],
    db: Session = Depends(get_db)
):
    """Get detailed tracking of exam invitations vs candidate attempts."""
    from app.exams.service import get_invitation_tracking
    return get_invitation_tracking(db)

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
@router.post("/{exam_id}/duplicate", response_model=ExamResponse)
async def copy_exam(
    exam_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db: Session = Depends(get_db)
):
    """Create a duplicate of an existing exam."""
    from app.exams.service import duplicate_exam
    res = duplicate_exam(db, exam_id)
    if not res:
        raise HTTPException(status_code=404, detail="Exam not found")
    return res

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

@router.post("/{exam_id}/send-link")
async def send_exam_link_custom(
    exam_id: str,
    payload: SendExamLinkRequest,
    background_tasks: BackgroundTasks,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db: Session = Depends(get_db)
):
    """Send an exam link to multiple emails manually via custom message."""
    exam = get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    subject = f"Invitation: {exam['title']}"
    content = payload.message if payload.message else f"You have been invited to take the exam: {exam['title']}.\n\nPlease access it here: {payload.link}"
    
    from app.models import ExamInvitation
    from datetime import datetime
    from sqlalchemy import and_, func
    
    saved_count = 0
    already_sent_emails = []
    
    # We allow re-sending invitations. If a duplicate exists, we will update its sent_at timestamp.
    for email in payload.emails:
        safe_email = email.strip()
        if safe_email:
            existing = db.query(ExamInvitation).filter(
                and_(ExamInvitation.exam_id == exam_id, func.lower(ExamInvitation.email) == safe_email.lower())
            ).first()
            
            # Personalize the link in the message for auto-fill
            personalized_content = content
            if payload.link:
                delimiter = "&" if "?" in payload.link else "?"
                personalized_link = f"{payload.link}{delimiter}email={safe_email}"
                personalized_content = content.replace(payload.link, personalized_link)

            # Send email
            background_tasks.add_task(send_email, safe_email, subject, personalized_content)
            
            admin_display = current_admin.username if current_admin.username else (current_admin.full_name or current_admin.email)
            if existing:
                # Update existing invitation
                existing.sent_at = datetime.now().isoformat()
                existing.admin_name = admin_display
            else:
                # Save new invitation to DB
                new_invite = ExamInvitation(
                    exam_id=exam_id,
                    email=safe_email,
                    sent_at=datetime.now().isoformat(),
                    admin_name=admin_display
                )
                db.add(new_invite)
            
            saved_count += 1
            
    if saved_count > 0:
        db.commit()
            
    return {"message": f"Emails queued for {saved_count} recipient(s)."}


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


@router.delete("/bank/categories/{name}")
async def remove_bank_category(
    name: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))]
):
    """Delete a category and all its questions from the bank."""
    from app.exams.service import delete_bank_category
    delete_bank_category(name)
    return {"message": f"Category '{name}' deleted from bank"}
