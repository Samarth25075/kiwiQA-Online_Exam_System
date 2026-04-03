# app/exams/router.py
from typing import List, Annotated, Optional, Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from app.auth.router import get_current_admin, check_permission, check_permission_any
from app.auth.schemas import AdminUser
from app.exams.schemas import ExamCreate, ExamResponse, ExamFinalize, Question, ExamStatsResponse, SendExamLinkRequest
from app.exams.service import (
    save_exam, generate_questions, get_all_exams, delete_exam, 
    get_exams_with_candidate_counts, get_bank_categories, get_bank_stats, 
    get_exam_by_id, add_to_bank, upload_to_bank, get_bank_questions_by_category, 
    update_bank_question, delete_bank_question, rename_bank_category,
    check_and_delete_expired_exams, get_invitation_tracking, duplicate_exam, update_exam
)
from app.core.email import send_email
from app.database import get_db

router = APIRouter(tags=["exams"])

@router.post("/preview", response_model=List[Question])
async def preview_exam(
    exam_in: ExamCreate,
    current_admin: Annotated[AdminUser, Depends(check_permission("generate exam"))]
):
    """Generate questions without saving."""
    # generate_questions is not async as it uses AI/JSON only
    return generate_questions(exam_in)

@router.post("", response_model=ExamResponse)
async def add_exam(
    exam_in: ExamFinalize,
    current_admin: Annotated[AdminUser, Depends(check_permission("generate exam"))],
    db = Depends(get_db)
):
    """Finalize and save the exam."""
    res = await save_exam(db, exam_in)
    return res

@router.get("", response_model=List[ExamResponse])
async def read_exams(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))], 
    db = Depends(get_db),
    bypass_cache: bool = False
):
    """List all generated exams."""
    return await get_all_exams(db, bypass_cache=bypass_cache)

@router.get("/stats", response_model=List[ExamStatsResponse])
async def read_exam_stats(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))], 
    db = Depends(get_db),
    bypass_cache: bool = False
):
    """Returns each exam along with the count of candidates assigned to it."""
    return await get_exams_with_candidate_counts(db, bypass_cache=bypass_cache)

@router.get("/bank/categories", response_model=List[str])
async def read_bank_categories(
    current_admin: Annotated[AdminUser, Depends(check_permission_any(["manage bank", "generate exam"]))],
    db = Depends(get_db)
):
    """Get unique categories from the inbuilt question bank."""
    return await get_bank_categories(db)

@router.get("/bank/stats", response_model=List[Dict])
async def read_bank_stats(
    current_admin: Annotated[AdminUser, Depends(check_permission_any(["manage bank", "generate exam"]))],
    db = Depends(get_db)
):
    """Get category-wise stats (count, marks) from the question bank."""
    return await get_bank_stats(db)

@router.get("/bank/questions", response_model=List[Dict])
async def read_bank_questions(
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))],
    category: Optional[str] = None
):
    """Get all questions in a category from the bank."""
    return get_bank_questions_by_category(category)

@router.put("/bank/questions/{q_id}")
async def update_bank_question_route(
    q_id: str,
    question: Dict,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))]
):
    """Update a specific question in the bank."""
    if update_bank_question(q_id, question):
        return {"message": "Question updated"}
    raise HTTPException(status_code=404, detail="Question not found")

@router.delete("/bank/questions/{q_id}")
async def delete_bank_question_route(
    q_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))]
):
    """Delete a specific question from the bank."""
    if delete_bank_question(q_id):
        return {"message": "Question deleted"}
    raise HTTPException(status_code=404, detail="Question not found")

@router.post("/bank/add")
async def add_individual_question_to_bank(
    question: Dict,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))]
):
    """Add a single question to the inbuilt bank."""
    if add_to_bank(question):
        return {"message": "Question added to bank"}
    raise HTTPException(status_code=500, detail="Failed to update bank")

@router.post("/bank/upload")
async def upload_bulk_questions_to_bank(
    questions: List[Dict],
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))]
):
    """Upload a list of questions to the inbuilt bank."""
    if upload_to_bank(questions):
        return {"message": f"{len(questions)} questions uploaded to bank"}
    raise HTTPException(status_code=500, detail="Failed to update bank")

@router.get("/invitations/tracking")
async def read_invitation_tracking(
    current_admin: Annotated[AdminUser, Depends(check_permission("send invitation"))],
    db = Depends(get_db)
):
    """Get detailed tracking of exam invitations vs candidate attempts."""
    return await get_invitation_tracking(db)

@router.get("/{exam_id}", response_model=ExamResponse)
async def read_exam(
    exam_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db = Depends(get_db)
):
    """Fetch a single exam with all questions."""
    exam = await get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

class DuplicateExamRequest(BaseModel):
    new_title: Optional[str] = None

@router.post("/{exam_id}/duplicate", response_model=ExamResponse)
async def copy_exam(
    exam_id: str,
    payload: DuplicateExamRequest,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db = Depends(get_db)
):
    """Create a duplicate of an existing exam."""
    res = await duplicate_exam(db, exam_id, new_title=payload.new_title)
    if not res:
        raise HTTPException(status_code=404, detail="Exam not found")
    return res

@router.delete("/{exam_id}")
async def remove_exam(
    exam_id: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db = Depends(get_db)
):
    """Delete an exam."""
    success = await delete_exam(db, exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"message": "Exam deleted"}

@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam_route(
    exam_id: str,
    exam_in: ExamFinalize,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db = Depends(get_db)
):
    """Update an existing exam."""
    updates = exam_in.dict()
    if "questions" in updates and updates["questions"]:
        updates["questions"] = [
            q.dict(exclude_none=True) if hasattr(q, "dict") else q 
            for q in updates["questions"]
        ]
        updates["num_questions"] = len(updates["questions"])
        
    success = await update_exam(db, exam_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    updated = await get_exam_by_id(db, exam_id)
    return updated

@router.post("/{exam_id}/send-link")
async def send_exam_link_custom(
    exam_id: str,
    payload: SendExamLinkRequest,
    background_tasks: BackgroundTasks,
    current_admin: Annotated[AdminUser, Depends(check_permission("send invitation"))],
    db = Depends(get_db)
):
    """Send an exam link to multiple emails manually via custom message."""
    exam = await get_exam_by_id(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    subject = f"Invitation: {exam['title']}"
    content = payload.message if payload.message else f"You have been invited to take the exam: {exam['title']}.\n\nPlease access it here: {payload.link}"
    
    from datetime import datetime
    
    saved_count = 0
    admin_display = current_admin.username if current_admin.username else (current_admin.full_name or current_admin.email)
    
    for email in payload.emails:
        safe_email = email.strip()
        if safe_email:
            # We allow re-sending invitations using MongoDB upsert
            personalized_content = content
            if payload.link:
                delimiter = "&" if "?" in payload.link else "?"
                personalized_link = f"{payload.link}{delimiter}email={safe_email}"
                personalized_content = content.replace(payload.link, personalized_link)

            # Send email
            background_tasks.add_task(send_email, safe_email, subject, personalized_content)
            
            # Upsert into MongoDB
            await db.exam_invitations.update_one(
                {"exam_id": exam_id, "email": safe_email.lower()},
                {"$set": {
                    "sent_at": datetime.now().isoformat(),
                    "admin_name": admin_display,
                    "email": safe_email # Ensure correct casing is saved
                }},
                upsert=True
            )
            saved_count += 1
            
    return {"message": f"Emails queued for {saved_count} recipient(s)."}

class ExpiryUpdate(BaseModel):
    link_expiry: Optional[str] = None
    auto_delete: Optional[str] = None

@router.put("/{exam_id}/expiry")
async def update_exam_expiry(
    exam_id: str,
    payload: ExpiryUpdate,
    background_tasks: BackgroundTasks,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage exam"))],
    db = Depends(get_db)
):
    """Set the public link expiry for an exam."""
    update_data = payload.dict(exclude_unset=True)
    
    success = await update_exam(db, exam_id, update_data)
    if not success:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    # Run cleanup immediately
    await check_and_delete_expired_exams(db)
    
    return {"message": "Expiry and/or deletion schedule updated"}

@router.delete("/bank/categories/{name}")
async def remove_bank_category(
    name: str,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))]
):
    """Delete a category and all its questions from the bank."""
    from app.exams.service import delete_bank_category
    delete_bank_category(name)
    return {"message": f"Category '{name}' deleted from bank"}

class CategoryRenameRequest(BaseModel):
    new_name: str

@router.put("/bank/categories/{name}")
async def rename_bank_category_route(
    name: str,
    payload: CategoryRenameRequest,
    current_admin: Annotated[AdminUser, Depends(check_permission("manage bank"))],
    db = Depends(get_db)
):
    """Rename a category in both JSON bank and database."""
    if await rename_bank_category(name, payload.new_name, db):
        return {"message": f"Category '{name}' renamed to '{payload.new_name}'"}
    raise HTTPException(status_code=400, detail="Cannot rename bank category (might be protected)")
