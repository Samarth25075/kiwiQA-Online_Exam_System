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

# SMTP & SendGrid Settings
SMTP_EMAIL: str = os.getenv("SMTP_EMAIL", "") # Keep as Sender Email
SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")

# Quiz API Configuration
QUIZ_API_KEY: str = os.getenv("QUIZ_API_KEY", "")

# Redis Configuration
REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Frontend / Backend URLs
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://kiwiqa-online-exam-system.onrender.com").rstrip("/")
BACKEND_URL: str = os.getenv("BACKEND_URL", "https://kiwiqa-api.onrender.com").rstrip("/")
