# app/core/security.py
# ─────────────────────────────────────────────
# JWT creation/decoding and bcrypt helpers.
# ─────────────────────────────────────────────

from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

from app.core.config import ALGORITHM, SECRET_KEY

# ── Fix for passlib/bcrypt compatibility ───────────────────────────
# passlib 1.7.4 expects bcrypt.__about__.__version__ which is missing 
# in bcrypt 4.0+. We monkeypatch it to avoid AttributeErrors.
try:
    import bcrypt
    from unittest.mock import MagicMock
    if not hasattr(bcrypt, "__about__"):
        bcrypt.__about__ = MagicMock()
        bcrypt.__about__.__version__ = bcrypt.__version__
except ImportError:
    pass
# ───────────────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return the bcrypt hash of a plain-text password."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain-text password against its hash."""
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, expires_delta: timedelta, session_id: str | None = None) -> str:
    """
    Create a signed JWT.

    Args:
        subject:       typically the user's email / id.
        expires_delta: how long the token is valid.
        session_id:    unique session id for single session logic.

    Returns:
        Encoded JWT string.
    """
    payload = {
        "sub": subject,
        "exp": datetime.utcnow() + expires_delta,
        "sid": session_id,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT.

    Returns:
        The payload dict.

    Raises:
        jose.JWTError on invalid / expired tokens.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
