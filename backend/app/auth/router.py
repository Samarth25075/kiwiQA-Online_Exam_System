# app/auth/router.py
# ─────────────────────────────────────────────
# Auth routes:
#   POST /login          — returns JWT
#   GET  /me             — returns current user info
#   POST /change-password — update admin password
# ─────────────────────────────────────────────

import uuid
from datetime import timedelta
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.auth.schemas import Token, TokenPayload, AdminUser, Member, MemberCreate
from app.auth.service import (
    authenticate, get_user, add_user, change_password, 
    get_all_users, delete_user, hash_password, 
    update_user_session, verify_session
)
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, GOOGLE_CLIENT_ID
from app.core.security import create_access_token, decode_access_token

router = APIRouter(tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ── POST /login ───────────────────────────────
@router.post("/login", response_model=Token)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = authenticate(form.username, form.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Single Session logic: Generate a unique session ID
    session_id = str(uuid.uuid4())
    update_user_session(user["email"], session_id)

    token = create_access_token(
        subject=user["email"],
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        session_id=session_id
    )
    return Token(access_token=token)


# ── Dependency ────────────────────────────────
async def get_current_admin(token: Annotated[str, Depends(oauth2_scheme)]) -> AdminUser:
    try:
        payload = decode_access_token(token)
        token_data = TokenPayload(sub=payload.get("sub"), sid=payload.get("sid"))
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Single Session logic: Verify session ID
    if not verify_session(token_data.sub, token_data.sid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been invalidated. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user(token_data.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AdminUser(
        email=user["email"],
        role=user["role"],
        full_name=user["full_name"],
        permissions=user.get("permissions", [])
    )


def check_permission(required_permission: str):
    async def permission_dependency(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
        if current_admin.role == "admin":
            return current_admin
        # Allow 'member' role to have 'manage exam' and 'generate exam' by default
        if current_admin.role == "member" and required_permission in ["manage exam", "generate exam"]:
            return current_admin
        if required_permission in current_admin.permissions:
            return current_admin
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing required permission: {required_permission}"
        )
    return permission_dependency


# ── GET /me ───────────────────────────────────
@router.get("/me", response_model=AdminUser)
async def me(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
    """Return the currently authenticated admin's profile."""
    return current_admin


# ── POST /change-password ─────────────────────
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password_route(
    body: ChangePasswordRequest,
    current_admin: Annotated[AdminUser, Depends(get_current_admin)]
):
    """Change the password for the currently logged-in admin."""
    success = change_password(current_admin.email, body.current_password, body.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    return {"message": "Password changed successfully"}


@router.post("/logout")
async def logout(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
    """Invalidate the current session."""
    update_user_session(current_admin.email, None)
    return {"message": "Logged out successfully"}


# ── POST /auth/google ─────────────────────────
class GoogleTokenRequest(BaseModel):
    id_token: str


@router.post("/auth/google", response_model=Token)
async def google_login(body: GoogleTokenRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured on the server. Set GOOGLE_CLIENT_ID in .env",
        )
    try:
        idinfo = id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {exc}",
        )

    email: str = idinfo.get("email", "")
    full_name: str = idinfo.get("name", email)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account has no email",
        )

    user = get_user(email)
    if not user:
        user = {
            "email": email,
            "role": "admin",
            "full_name": full_name,
            "hashed_password": "",
        }
        add_user(user)

    # Single Session logic for Google Login
    session_id = str(uuid.uuid4())
    update_user_session(email, session_id)

    token = create_access_token(
        subject=email,
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        session_id=session_id
    )
    return Token(access_token=token)


# ── Member Management ─────────────────────────

@router.get("/members", response_model=List[Member])
async def get_members(current_admin: Annotated[AdminUser, Depends(get_current_admin)]):
    """List all registered members (Admin only)."""
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage members")
    users = get_all_users()
    return [
        Member(
            email=u["email"],
            full_name=u["full_name"],
            role=u["role"],
            permissions=u.get("permissions", [])
        ) for u in users
    ]


@router.post("/members", response_model=Member)
async def create_member(
    body: MemberCreate,
    current_admin: Annotated[AdminUser, Depends(get_current_admin)]
):
    """Add a new member (Admin only)."""
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage members")
    
    if get_user(body.email):
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = {
        "email": body.email,
        "full_name": body.full_name,
        "hashed_password": hash_password(body.password),
        "role": body.role,
        "permissions": body.permissions
    }
    add_user(new_user)
    return Member(
        email=new_user["email"],
        full_name=new_user["full_name"],
        role=new_user["role"],
        permissions=new_user["permissions"]
    )


@router.delete("/members/{email}")
async def remove_member(
    email: str,
    current_admin: Annotated[AdminUser, Depends(get_current_admin)]
):
    """Remove a member (Admin only)."""
    if current_admin.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage members")
    
    if email == current_admin.email:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    success = delete_user(email)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Member removed successfully"}
