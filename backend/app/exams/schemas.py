# app/exams/schemas.py
from typing import List, Optional
from pydantic import BaseModel

class Option(BaseModel):
    text: str
    is_correct: bool

class Question(BaseModel):
    text: str
    options: List[Option]
    explanation: Optional[str] = None

class ExamBase(BaseModel):
    title: str
    topic: str = ""
    difficulty: str  # e.g., Beginner, Intermediate, Advanced
    duration: int = 30  # duration in minutes
    num_questions: int = 5
    link_expiry: Optional[str] = None
    auto_delete: Optional[str] = None
    proctoring_enabled: bool = True
    proctoring_type: str = "video"  # "video", "screen", or "both"
    passing_score: int = 50  # passing percentage (0-100)

class ExamCreate(ExamBase):
    pass

class ExamFinalize(ExamBase):
    questions: List[Question]

class ExamResponse(ExamBase):
    id: str
    created_at: str
    questions: List[Question]

class ExamStatsResponse(BaseModel):
    id: str
    title: str
    difficulty: str
    total_assigned: int
    completed: int
    live: int
    not_started: int
    link_expiry: Optional[str] = None
    auto_delete: Optional[str] = None
    proctoring_enabled: bool = True
    proctoring_type: str = "video"
