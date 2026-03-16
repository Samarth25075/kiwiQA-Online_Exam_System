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
    from app.database import engine, Base, SessionLocal
    import app.models # Import models to register them with Base
    Base.metadata.create_all(bind=engine)
    print("INFO: Database tables verified/created.")

    # 2. Check and Create Default Admin if 0 users
    db = SessionLocal()
    try:
        from app.models import User
        if db.query(User).count() == 0:
            from app.auth.service import hash_password
            import json
            admin_user = User(
                email="admin@examportal.com",
                hashed_password=hash_password("Admin@123"), # Standard default
                role="admin",
                full_name="System Admin",
                permissions=json.dumps(["manage exam", "generate exam", "manage candidates", "manage users"])
            )
            db.add(admin_user)
            db.commit()
            print("INFO: Created default admin user: admin@examportal.com / Admin@123")
    except Exception as e:
        print(f"ERROR creating default admin: {e}")
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
