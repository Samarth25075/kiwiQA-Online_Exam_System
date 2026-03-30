import os
import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.auth.service import authenticate, update_user_session
from app.core.security import create_access_token
from datetime import timedelta
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
import uuid

load_dotenv()

db = SessionLocal()

def get_test_token():
    # Attempt to authenticate default admin
    user = authenticate(db, "admin", "Admin@123")
    if not user:
        # Fallback to email
        user = authenticate(db, "admin@examportal.com", "Admin@123")
    
    if not user:
        from app.models import User
        # Get first admin
        u = db.query(User).filter(User.role == "admin").first()
        if u:
            user = {"email": u.email, "username": u.username}
        else:
            return None

    session_id = str(uuid.uuid4())
    update_user_session(db, user["email"], session_id)
    
    token = create_access_token(
        subject=user["email"],
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        session_id=session_id
    )
    return token

token = get_test_token()
if not token:
    print("FAILURE: Could not get admin token.")
    exit(1)

print(f"Token obtained: {token[:20]}...")

url = "http://127.0.0.1:8000/chat"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
payload = {
    "message": "Hello, how can you help me?",
    "history": []
}

try:
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"FAILURE: Request failed: {e}")
finally:
    db.close()
