from motor.motor_asyncio import AsyncIOMotorDatabase
import re

async def get_all_categories(db):
    """Fetch all categories from MongoDB, sorted by name."""
    categories = await db.categories.find({}).sort("name", 1).to_list(length=1000)
    return categories

async def create_category(db, category_name: str):
    # Check if exists (case insensitive)
    pattern = re.compile(f"^{re.escape(category_name)}$", re.IGNORECASE)
    existing = await db.categories.find_one({"name": pattern})
    if existing:
        return existing
        
    db_category = {"name": category_name}
    await db.categories.insert_one(db_category)
    return db_category

from app.exams.service import delete_category_questions

async def delete_category(db, category_name: str):
    # First delete questions from JSON (this is still sync if not refactored yet, but service says async now)
    await delete_category_questions(category_name)
    
    # Then delete the category from DB
    await db.categories.delete_one({"name": category_name})
    return True
