from sqlalchemy import Column, Integer, String, Text, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
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
    passing_score = Column(Integer)
    questions = Column(JSON)  # Database JSON type, handles dicts/lists

    # Relationship to candidates assigned to this exam
    candidates = relationship("Candidate", back_populates="exam")

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String)
    phone_number = Column(String)
    dob = Column(String)
    gender = Column(String)
    address = Column(String)
    profile_photo = Column(Text)
    cv_url = Column(Text)
    status = Column(String)
    joined_date = Column(String)
    token = Column(String, unique=True)
    
    # Foreign Key integrity
    assigned_exam_id = Column(String, ForeignKey("exams.id", ondelete="SET NULL"), nullable=True)
    exam = relationship("Exam", back_populates="candidates")
    
    # Proper numeric types for integrity
    score = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)
    violations = Column(Integer, default=0)
    device_id = Column(String)
    
    # Detailed result data
    answers = Column(JSON, nullable=True)  # Store list of {question_index, selected_option_index}
    screenshot_start = Column(Text, nullable=True)
    screenshot_mid = Column(Text, nullable=True)
    screenshot_end = Column(Text, nullable=True)
