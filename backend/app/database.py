import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import MONGODB_URL

# ── Pure MongoDB Implementation ─────────────────────────
# We connect once and reuse this client/db across the app
mongo_client = AsyncIOMotorClient(
    MONGODB_URL,
    tlsCAFile=certifi.where() # Necessary for Atlas on environments like Render
)
mongo_db = mongo_client.get_database("exam_portal_db")

# Collection Helpers
exams_collection = mongo_db.get_collection("exams")
candidates_collection = mongo_db.get_collection("candidates")
users_collection = mongo_db.get_collection("users")
categories_collection = mongo_db.get_collection("question_categories")
invitations_collection = mongo_db.get_collection("exam_invitations")

# Mock dependency for legacy support during transition
def get_db():
    """Returns the MongoDB database instance."""
    return mongo_db
