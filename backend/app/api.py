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
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
import redis.asyncio as redis
import logging

# Filter out /health endpoint from Uvicorn access logs to prevent spam
class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # uvicorn.access passes args like (client_addr, method, path, http_version, status_code)
        if record.args and isinstance(record.args, tuple) and len(record.args) >= 3:
            return record.args[2] != '/health'
        return True

logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

from .auth.router import router as auth_router
from .candidates.admin_router import router as candidates_admin_router
from .candidates.public_router import router as candidates_public_router
from .exams.router import router as exams_router
from .categories.router import router as categories_router
from .chat.router import router as chat_router
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
app.include_router(candidates_admin_router)
app.include_router(candidates_public_router, prefix="/candidates")
app.include_router(exams_router, prefix="/exams")       # /exams
app.include_router(categories_router)
app.include_router(chat_router, prefix="/chat")

# ── Background Cleanup ────────────────────────
@app.on_event("startup")
async def startup_event():
    # Run heavy DB work in a separate thread so health check passes immediately
    async def db_initialization():
        from app.database import mongo_db, users_collection
        from app.auth.service import hash_password
        from app.core.config import AUTHORIZED_GOOGLE_EMAIL
        import uuid
        import json
        
        # 1. Ensure Indexes
        try:
            await users_collection.create_index("email", unique=True)
            await users_collection.create_index("username", unique=True)
            print("INFO: MongoDB indexes verified.")
        except Exception as e:
            print(f"ERROR: MongoDB index creation: {e}")

        # 2. Create Default Admins
        try:
            # Default credential check
            user_count = await users_collection.count_documents({})
            if user_count == 0:
                admin_user = {
                    "email": "admin@examportal.com",
                    "username": "admin",
                    "hashed_password": hash_password("Admin@123"),
                    "role": "admin",
                    "full_name": "System Admin",
                    "permissions": ["manage exam", "generate exam", "manage candidates", "manage users"]
                }
                await users_collection.insert_one(admin_user)
                print("INFO: Default admin created in MongoDB.")

            # Authorized Google Email check (Multiple support)
            if AUTHORIZED_GOOGLE_EMAIL and AUTHORIZED_GOOGLE_EMAIL != "NOT_SET":
                authorized_emails = [e.strip().lower() for e in AUTHORIZED_GOOGLE_EMAIL.split(",") if e.strip()]
                
                for idx, email_addr in enumerate(authorized_emails):
                    google_user = await users_collection.find_one({"email": email_addr})
                    if not google_user:
                        uname = "google_admin" if idx == 0 else f"google_admin_{idx+1}"
                        new_google_user = {
                            "email": email_addr,
                            "username": uname,
                            "hashed_password": hash_password(str(uuid.uuid4())),
                            "role": "admin",
                            "full_name": f"Google Admin ({email_addr.split('@')[0]})",
                            "permissions": ["manage exam", "generate exam", "manage candidates", "manage users"]
                        }
                        await users_collection.insert_one(new_google_user)
                        print(f"INFO: Google admin {email_addr} created in MongoDB.")
        except Exception as e:
            print(f"ERROR admin setup: {e}")

    # Fire off DB tasks WITHOUT awaiting them immediately
    asyncio.create_task(db_initialization())

    # 2. Initialize FastAPICache with Redis
    try:
        from app.core.config import REDIS_URL
        redis_cache = redis.from_url(REDIS_URL, encoding="utf8", decode_responses=True, socket_connect_timeout=1, socket_timeout=1)
        FastAPICache.init(RedisBackend(redis_cache), prefix="fastapi-cache")
        print("INFO: FastAPICache initialized with Redis.")
    except Exception as e:
        print(f"WARNING: FastAPICache initialization failed: {e}")

    # 3. Start background cleanup loop
    async def cleanup_loop():
        from app.database import exams_collection
        from app.core.redis import redis_client
        while True:
            try:
                # We will update the service function to handle MongoDB later
                deleted_any = await check_and_delete_expired_exams()
                if deleted_any and redis_client:
                    await redis_client.delete("all_exams_list", "exams_with_counts")
            except Exception as e:
                print(f"ERROR in background cleanup: {e}")
            await asyncio.sleep(60) # Run every minute
    asyncio.create_task(cleanup_loop())

    # 4. Demo Keep-Alive for Render Free Tier
    async def keep_alive_loop():
        # Use BACKEND_URL if set, else RENDER_EXTERNAL_URL
        url = os.getenv("BACKEND_URL") or os.getenv("RENDER_EXTERNAL_URL") or ""
        if not url:
            print("INFO: Keep-alive ping disabled (URL not found).")
            return

        import urllib.request
        def ping(target_url: str):
            try:
                req = urllib.request.Request(target_url, headers={'User-Agent': 'KeepAliveAgent'})
                with urllib.request.urlopen(req, timeout=10) as response:
                    if response.status == 200:
                        print(f"INFO: Keep-alive ping successful to {target_url}")
            except Exception as e:
                print(f"WARNING: Keep-alive ping failed: {e}")

        ping_url = f"{url}/health" if not url.endswith("/") else f"{url}health"
        
        # Initial delay to let startup finish
        await asyncio.sleep(60)
        while True:
            # Run blocking request in a separate thread to not block event loop
            try:
                await asyncio.to_thread(ping, ping_url)
            except Exception:
                pass
            # Sleep for 14 minutes (840 seconds) to prevent 15-minute idle timeout
            await asyncio.sleep(840)
            
    asyncio.create_task(keep_alive_loop())

# ── Health check ──────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    """Detailed health check for Render/Uptime monitoring."""
    return {"status": "ok", "message": "Application is healthy."}

@app.get("/settings", tags=["system"])
@cache(expire=600)
async def get_app_settings():
    """Public application settings (Cached for 10 min)."""
    return {
        "app_name": "ExamPortal",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "features": {
            "google_login": True if os.getenv("GOOGLE_CLIENT_ID") else False,
            "proctoring": True
        }
    }

@app.get("/", tags=["root"])
async def root():
    return {"status": "ok", "message": "ExamPortal API is running."}
