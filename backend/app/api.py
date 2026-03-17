# app/api.py
# ─────────────────────────────────────────────
# FastAPI application factory.
# Register all routers here.
# ─────────────────────────────────────────────

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import traceback
import asyncio
import uuid
from sqlalchemy import text, inspect

from .auth.router import router as auth_router
from .candidates.router import router as candidates_router
from .exams.router import router as exams_router
from .exams.service import check_and_delete_expired_exams

app = FastAPI(
    title="ExamPortal API",
    description="Backend for ExamPortal admin panel.",
    version="1.0.0",
)

# ── Static Files ──────────────────────────────
os.makedirs("static/uploads/cvs", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── CORS ──────────────────────────────────────
# Universal CORS for production stability
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ── Global Exception Handler ──────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"CRITICAL ERROR on {request.method} {request.url.path}")
    print(f"ERROR: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error", 
            "error": str(exc),
            "type": type(exc).__name__,
            "path": request.url.path
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# ── Routers ───────────────────────────────────
app.include_router(auth_router)       # /login, /me
app.include_router(candidates_router)  # /candidates
app.include_router(exams_router)       # /exams

# ── Background Cleanup ────────────────────────
@app.on_event("startup")
async def startup_event():
    # 1. Ensure tables exist (Critical for Render/Postgres)
    from app.database import engine, Base, SessionLocal, DATABASE_URL
    import app.models # Import models to register them with Base
    Base.metadata.create_all(bind=engine)
    
    # 2. Add missing columns (Manual Auto-Migration)
    # create_all doesn't add new columns to existing tables
    try:
        inspector = inspect(engine)
        with engine.connect() as conn:
            # ── Candidates Table ─────
            existing_cols = [c['name'] for c in inspector.get_columns('candidates')]
            new_cols = [
                ("answers", "JSONB" if "postgresql" in DATABASE_URL else "JSON"),
                ("screenshot_start", "TEXT"), ("screenshot_mid", "TEXT"), ("screenshot_end", "TEXT")
            ]
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    print(f"INFO: Adding column {col_name} to candidates...")
                    conn.execute(text(f"ALTER TABLE candidates ADD COLUMN {col_name} {col_type}"))
                    conn.commit()

            # ── Exams Table ─────
            existing_cols = [c['name'] for c in inspector.get_columns('exams')]
            new_cols = [
                ("link_expiry", "TEXT"), ("auto_delete", "TEXT"),
                ("proctoring_enabled", "BOOLEAN DEFAULT FALSE" if "postgresql" in DATABASE_URL else "BOOLEAN DEFAULT 0"),
                ("proctoring_type", "TEXT"), ("passing_score", "INTEGER DEFAULT 50")
            ]
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    print(f"INFO: Adding column {col_name} to exams...")
                    conn.execute(text(f"ALTER TABLE exams ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
    except Exception as e:
        print(f"WARNING: Auto-migration failed (might be ok): {e}")

    print("INFO: Database tables verified/migrated.")

    # 2. Check and Create Default Admins
    db = SessionLocal()
    try:
        from app.models import User
        from app.auth.service import hash_password
        from app.core.config import AUTHORIZED_GOOGLE_EMAIL
        import json
        
        # Add basic admin if no users exist
        if db.query(User).count() == 0:
            admin_user = User(
                email="admin@examportal.com",
                hashed_password=hash_password("Admin@123"),
                role="admin",
                full_name="System Admin",
                permissions=json.dumps(["manage exam", "generate exam", "manage candidates", "manage users"])
            )
            db.add(admin_user)
            db.commit()
            print("INFO: Created default admin user: admin@examportal.com / Admin@123")

        # Ensure AUTHORIZED_GOOGLE_EMAIL user exists for Google Login to work
        if AUTHORIZED_GOOGLE_EMAIL and AUTHORIZED_GOOGLE_EMAIL != "NOT_SET":
            existing_google_user = db.query(User).filter(User.email == AUTHORIZED_GOOGLE_EMAIL).first()
            if not existing_google_user:
                new_google_user = User(
                    email=AUTHORIZED_GOOGLE_EMAIL,
                    hashed_password=hash_password(str(uuid.uuid4())), # Random password, they use Google
                    role="admin",
                    full_name="Authorized Google User",
                    permissions=json.dumps(["manage exam", "generate exam", "manage candidates", "manage users"])
                )
                db.add(new_google_user)
                db.commit()
                print(f"INFO: Created pre-authorized Google user: {AUTHORIZED_GOOGLE_EMAIL}")
    except Exception as e:
        print(f"ERROR creating default admins: {e}")
    finally:
        db.close()

    # 3. Start background cleanup loop
    async def cleanup_loop():
        from app.database import SessionLocal
        while True:
            try:
                db = SessionLocal()
                check_and_delete_expired_exams(db)
                db.close()
            except Exception as e:
                print(f"ERROR in background cleanup: {e}")
            await asyncio.sleep(60)
    asyncio.create_task(cleanup_loop())

# ── Health check ──────────────────────────────
@app.get("/", tags=["root"])
async def root():
    return {"status": "ok", "message": "ExamPortal API is running."}
