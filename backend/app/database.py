import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from motor.motor_asyncio import AsyncIOMotorClient

# ── Current SQL (SQLite Local) ────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kiwiqa.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── New MongoDB (Live/Atlas Migration) ────
# This will use the Atlas URI on Render and local MongoDB during dev
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/exam_portal_db")
mongo_client = AsyncIOMotorClient(MONGODB_URL)
mongo_db = mongo_client.get_database("exam_portal_db")

exams_collection = mongo_db.get_collection("exams")
candidates_collection = mongo_db.get_collection("candidates")
users_collection = mongo_db.get_collection("users")
