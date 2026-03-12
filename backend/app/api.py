# app/api.py
# ─────────────────────────────────────────────
# FastAPI application factory.
# Register all routers here.
# ─────────────────────────────────────────────

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles
import os

from app.auth.router import router as auth_router
from app.candidates.router import router as candidates_router
from app.exams.router import router as exams_router
from fastapi.responses import JSONResponse
from fastapi import Request
import traceback

app = FastAPI(
    title="ExamPortal API",
    description="Backend for ExamPortal admin panel.",
    version="1.0.0",
)

# ── Static Files ──────────────────────────────
# Ensure static/uploads/cvs exists
os.makedirs("static/uploads/cvs", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── CORS ──────────────────────────────────────
# Permit all origins for production to resolve CORS blocking.
# This works with JWT authentication as it doesn't require cookies/credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Global Exception Handler ──────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL ERROR: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
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
import asyncio
from app.exams.service import check_and_delete_expired_exams

@app.on_event("startup")
async def start_background_cleanup():
    async def cleanup_loop():
        while True:
            try:
                check_and_delete_expired_exams()
            except Exception as e:
                print(f"ERROR in background cleanup: {e}")
            await asyncio.sleep(60) # check every minute
            
    asyncio.create_task(cleanup_loop())

# ── Health check ──────────────────────────────
@app.get("/", tags=["root"])
async def root():
    return {"message": "ExamPortal API is running."}
