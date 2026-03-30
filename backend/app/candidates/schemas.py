# app/candidates/schemas.py
from pydantic import BaseModel
from typing import Optional

class CandidateBase(BaseModel):
    name: str
    email: str
    country_code: Optional[str] = None
    phone_number: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None
    cv_url: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateEnrollOTPRequest(BaseModel):
    name: str
    email: str
    country_code: Optional[str] = None
    phone_number: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None

class CandidateEnrollOTPVerify(CandidateBase):
    otp: str
    device_id: Optional[str] = None

class Candidate(CandidateBase):
    id: int
    candidate_id: str
    status: str
    joined_date: str
    completed_at: Optional[str] = None
    admin_name: Optional[str] = None
    token: str
    assigned_exam_id: Optional[str] = None
    score: Optional[float] = None
    total_questions: Optional[int] = None
    total_marks: Optional[float] = None
    violations: Optional[int] = 0
    violation_logs: Optional[list] = None
    device_id: Optional[str] = None

class CandidateAssign(BaseModel):
    exam_id: str

class CandidateResult(BaseModel):
    score: float
    total_questions: int
    total_marks: float
    violations: int = 0
    violation_logs: Optional[list] = None
    answers: Optional[list] = None # List of {question_index, selected_option_index}
    screenshot: Optional[str] = None # Legacy
    screenshot_start: Optional[str] = None
    screenshot_mid: Optional[str] = None
    screenshot_end: Optional[str] = None

class CandidateResponse(Candidate):
    test_link: str
