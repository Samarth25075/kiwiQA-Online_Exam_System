# app/core/security.py
# ─────────────────────────────────────────────
# JWT creation/decoding helpers.
# ─────────────────────────────────────────────

from datetime import datetime, timedelta
from jose import jwt
import bcrypt
from app.core.config import ALGORITHM, SECRET_KEY

def hash_password(plain: str) -> str:
    """Return the bcrypt hash of a plain-text password."""
    pwd_bytes = plain.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain-text password against its hash."""
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except:
        return False

def create_access_token(subject: str, expires_delta: timedelta, session_id: str | None = None) -> str:
    """Create a signed JWT."""
    payload = {
        "sub": subject,
        "exp": datetime.utcnow() + expires_delta,
        "sid": session_id,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
