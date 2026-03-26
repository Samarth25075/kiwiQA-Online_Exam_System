# app/auth/schemas.py
# ─────────────────────────────────────────────
# Pydantic models for auth request / response.
# ─────────────────────────────────────────────

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Body expected by POST /login."""
    email: str          # use EmailStr once pydantic[email] is installed
    password: str


class Token(BaseModel):
    """Response returned after successful login."""
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Decoded JWT payload."""
    sub: str            # email / user id
    sid: str | None = None  # session id for single session login


class AdminUser(BaseModel):
    """Profile info for the currently authenticated admin."""
    email: str
    username: str | None = None
    role: str
    full_name: str
    permissions: list[str] = []


class MemberCreate(BaseModel):
    """Schema for creating a new member."""
    email: EmailStr
    username: str | None = None
    full_name: str
    password: str
    role: str = "member"
    permissions: list[str] = []


class Member(BaseModel):
    """Schema for returning member info."""
    email: str
    username: str | None = None
    full_name: str
    role: str
    permissions: list[str]

class MemberUpdate(BaseModel):
    """Schema for updating an existing member."""
    full_name: str | None = None
    username: str | None = None
    role: str | None = None
    permissions: list[str] | None = None
