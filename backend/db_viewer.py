from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Exam, Candidate
import json

def view_database():
    db = SessionLocal()
    try:
        print("\n--- USERS ---")
        users = db.query(User).all()
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | Name: {u.full_name}")

        print("\n--- EXAMS ---")
        exams = db.query(Exam).all()
        for e in exams:
            print(f"ID: {e.id} | Title: {e.title} | Topic: {e.topic} | Questions: {len(e.questions) if e.questions else 0}")

        print("\n--- CANDIDATES ---")
        candidates = db.query(Candidate).all()
        for c in candidates:
            exam_title = db.query(Exam.title).filter(Exam.id == c.assigned_exam_id).scalar() or "None"
            print(f"ID: {c.id} | Name: {c.name} | Status: {c.status} | Exam: {exam_title} | Score: {c.score}/{c.total_questions}")

    finally:
        db.close()

if __name__ == "__main__":
    view_database()
