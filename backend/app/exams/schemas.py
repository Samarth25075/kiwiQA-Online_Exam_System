# app/exams/schemas.py
from typing import List, Optional
from pydantic import BaseModel

class Option(BaseModel):
    text: str
    is_correct: bool
    image: Optional[str] = None

class Question(BaseModel):
    text: str
    options: Optional[List[Option]] = None  # Optional for coding questions
    type: Optional[str] = "multiple-choice"  # "multiple-choice" or "coding"
    skeleton_code: Optional[str] = None
    language: Optional[str] = None
    test_cases: Optional[List[dict]] = None
    threshold_pct: Optional[int] = 100
    explanation: Optional[str] = None
    category: Optional[str] = "General"
    marks: float = 1.0
    image: Optional[str] = None
    image_required: bool = False

class ExamBase(BaseModel):
    title: str
    topic: str = ""
    difficulty: str  # e.g., Beginner, Intermediate, Advanced
    duration: int = 30  # duration in minutes
    num_questions: int = 5
    link_expiry: Optional[str] = None
    auto_delete: Optional[str] = None
    proctoring_enabled: bool = True
    proctoring_type: Optional[str] = "video"  # "video", "screen", or "both"
    passing_score: int = 50  # passing percentage (0-100)
    source: Optional[str] = "Bank" # "AI" or "Bank"
    bank_categories: Optional[List[str]] = []
    category_configs: Optional[dict] = {}
    
    # Exam Supplement
    calculator_enabled: bool = False
    notes_enabled: bool = False
    proctoring_link: Optional[str] = None
    supplement_flag: bool = False

class ExamCreate(ExamBase):
    pass

class ExamFinalize(ExamBase):
    questions: List[Question]

class ExamResponse(ExamBase):
    id: str
    created_at: str
    questions: Optional[List[Question]] = None
    
    # Supplement
    calculator_enabled: bool = False
    notes_enabled: bool = False
    proctoring_link: Optional[str] = None
    supplement_flag: bool = False

class ExamStatsResponse(BaseModel):
    id: str
    title: str
    topic: str = ""
    difficulty: str
    duration: int = 0
    num_questions: int = 0
    total_assigned: int
    completed: int
    live: int
    not_started: int
    total_invited: int = 0
    passed: int = 0
    failed: int = 0
    eliminated: int = 0
    total_incorrect: int = 0
    avg_incorrect: float = 0.0
    passing_score: int = 50
    link_expiry: Optional[str] = None
    auto_delete: Optional[str] = None
    proctoring_enabled: bool = True
    proctoring_type: Optional[str] = "video"

class SendExamLinkRequest(BaseModel):
    emails: List[str]
    link: str
    message: Optional[str] = None
