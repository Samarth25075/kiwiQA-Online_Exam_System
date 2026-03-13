# app/candidates/schemas.py
from pydantic import BaseModel
from typing import Optional

class CandidateBase(BaseModel):
    name: str
    email: str
    phone_number: Optional[str] = None
    cv_url: Optional[str] = None

class CandidateCreate(CandidateBase):
    pass

class CandidateEnrollOTPRequest(BaseModel):
    name: str
    email: str

class CandidateEnrollOTPVerify(CandidateBase):
    otp: str
    device_id: Optional[str] = None

class Candidate(CandidateBase):
    id: int
    status: str
    joined_date: str
    token: str
    assigned_exam_id: Optional[str] = None
    score: Optional[str] = None
    total_questions: Optional[str] = None
    violations: Optional[str] = None
    device_id: Optional[str] = None

class CandidateAssign(BaseModel):
    exam_id: str

class CandidateResult(BaseModel):
    score: int
    total_questions: int
    violations: int = 0
    screenshot: Optional[str] = None

class CandidateResponse(Candidate):
    test_link: str
