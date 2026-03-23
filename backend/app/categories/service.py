from sqlalchemy.orm import Session
from app.models import QuestionCategory
from app.categories.schemas import CategoryCreate

def get_all_categories(db: Session):
    return db.query(QuestionCategory).order_by(QuestionCategory.name).all()

def create_category(db: Session, category_in: CategoryCreate):
    # Check if exists (case insensitive)
    existing = db.query(QuestionCategory).filter(
        QuestionCategory.name.ilike(category_in.name)
    ).first()
    if existing:
        return existing
        
    db_category = QuestionCategory(name=category_in.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

from app.exams.service import delete_category_questions

def delete_category(db: Session, category_name: str):
    # First delete questions from JSON
    delete_category_questions(category_name)
    
    # Then delete the category from DB
    cat = db.query(QuestionCategory).filter(QuestionCategory.name == category_name).first()
    if cat:
        db.delete(cat)
        db.commit()
    return True
