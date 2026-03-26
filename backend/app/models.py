from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, ForeignKey, Float, UniqueConstraint
from sqlalchemy.orm import relationship, deferred
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    role = Column(String)
    full_name = Column(String)
    permissions = Column(String)  # stored as JSON string or raw string
    session_id = Column(String)

class Exam(Base):
    __tablename__ = "exams"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    topic = Column(String)
    difficulty = Column(String)
    duration = Column(Integer)
    num_questions = Column(Integer)
    created_at = Column(String)
    link_expiry = Column(String, nullable=True)
    auto_delete = Column(String, nullable=True)
    proctoring_enabled = Column(Boolean, default=False)
    proctoring_type = Column(String, nullable=True)
    passing_score = Column(Float)
    questions = deferred(Column(JSON))  # Defer large JSON questions block

    # Relationship to candidates assigned to this exam
    candidates = relationship("Candidate", back_populates="exam")

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String, index=True)
    country_code = Column(String, nullable=True)
    phone_number = Column(String)
    dob = Column(String)
    gender = Column(String)
    address = Column(String)
    profile_photo = deferred(Column(Text))
    cv_url = Column(Text)
    status = Column(String)
    joined_date = Column(String)
    completed_at = Column(String, nullable=True)
    admin_name = Column(String, nullable=True)
    token = Column(String, unique=True)
    
    # Foreign Key integrity
    assigned_exam_id = Column(String, ForeignKey("exams.id", ondelete="SET NULL"), nullable=True, index=True)
    exam = relationship("Exam", back_populates="candidates")
    
    # Proper numeric types for integrity
    score = Column(Float, nullable=True)
    total_questions = Column(Integer, nullable=True)
    total_marks = Column(Float, nullable=True)
    violations = Column(Integer, default=0)
    device_id = Column(String, index=True)
    
    # Detailed result data
    answers = deferred(Column(JSON, nullable=True))  # Defer large answers JSON
    screenshot_start = deferred(Column(Text, nullable=True))
    screenshot_mid = deferred(Column(Text, nullable=True))
    screenshot_end = deferred(Column(Text, nullable=True))

class QuestionCategory(Base):
    __tablename__ = "question_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class ExamInvitation(Base):
    __tablename__ = "exam_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(String, ForeignKey("exams.id", ondelete="CASCADE"), index=True)
    email = Column(String, index=True)
    sent_at = Column(String)
    admin_name = Column(String, nullable=True)

    __table_args__ = (
        UniqueConstraint('exam_id', 'email', name='_exam_email_uc'),
    )
