import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-before-production-use-long-random-string")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

# Gemini AI Settings
GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

# Google OAuth Settings
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
AUTHORIZED_GOOGLE_EMAIL: str = os.getenv("AUTHORIZED_GOOGLE_EMAIL", "NOT_SET")

# SMTP Settings
SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL: str = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")

# Frontend / Backend URLs
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://kiwiqa-online-exam-system.onrender.com").rstrip("/")
BACKEND_URL: str = os.getenv("BACKEND_URL", "https://kiwiqa-api.onrender.com").rstrip("/")
