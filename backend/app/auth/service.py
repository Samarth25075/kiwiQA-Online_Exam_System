from __future__ import annotations
import csv
import os
import json
from passlib.context import CryptContext

# Fix for BCrypt compatibility
try:
    import bcrypt
    from unittest.mock import MagicMock
    if not hasattr(bcrypt, "__about__"):
        bcrypt.__about__ = MagicMock()
        bcrypt.__about__.__version__ = bcrypt.__version__
except:
    pass

# Use bcrypt with rounds=4 for speed in this context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)

# Data Path Configuration - Use project root for the CSV
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CSV_FILE_PATH = os.path.join(BASE_DIR, "members.csv")

def _make_user(email, plain_password, role, full_name, permissions=None):
    return {
        "email": email,
        "hashed_password": pwd_context.hash(plain_password),
        "role": role,
        "full_name": full_name,
        "permissions": permissions or [],
        "session_id": None
    }

def load_users_from_csv():
    users = {}
    
    # If file doesn't exist, create default admin
    if not os.path.exists(CSV_FILE_PATH):
        print(f"DEBUG: Creating default admin at {CSV_FILE_PATH}")
        admin = _make_user(
            email="admin@examportal.com",
            plain_password="admin123",
            role="admin",
            full_name="Portal Admin",
            permissions=["generate exam", "manage exam"]
        )
        users[admin["email"]] = admin
        save_users_to_csv(users)
        return users

    try:
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not row or not row.get("email"):
                    continue
                # Deserialize permissions
                try:
                    perms = row.get("permissions", "[]")
                    row["permissions"] = json.loads(perms) if perms else []
                except:
                    row["permissions"] = []
                
                users[row["email"]] = row
    except Exception as e:
        print(f"ERROR loading users from {CSV_FILE_PATH}: {e}")
    
    return users

def save_users_to_csv(users):
    try:
        fieldnames = ["email", "hashed_password", "role", "full_name", "permissions", "session_id"]
        with open(CSV_FILE_PATH, mode='w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for email in sorted(users.keys()):
                user_copy = users[email].copy()
                user_copy["permissions"] = json.dumps(user_copy.get("permissions", []))
                writer.writerow(user_copy)
    except Exception as e:
        print(f"ERROR saving users to {CSV_FILE_PATH}: {e}")

# Global state
STATIC_USERS = load_users_from_csv()

def get_user(email):
    return STATIC_USERS.get(email)

def add_user(user):
    email = user.get("email")
    if email:
        STATIC_USERS[email] = user
        save_users_to_csv(STATIC_USERS)

def update_user_session(email, session_id):
    user = get_user(email)
    if user:
        user["session_id"] = session_id
        save_users_to_csv(STATIC_USERS)

def verify_session(email, session_id):
    user = get_user(email)
    return user.get("session_id") == session_id if user else False

def authenticate(email, password):
    user = get_user(email)
    if not user or not user.get("hashed_password"):
        return None
    try:
        if pwd_context.verify(password, user["hashed_password"]):
            return user
    except Exception as e:
        print(f"AUTH ERROR for {email}: {e}")
    return None

def change_password(email, current_password, new_password):
    user = get_user(email)
    if user and authenticate(email, current_password):
        user["hashed_password"] = pwd_context.hash(new_password)
        save_users_to_csv(STATIC_USERS)
        return True
    return False

def get_all_users():
    return list(STATIC_USERS.values())

def delete_user(email):
    if email in STATIC_USERS:
        STATIC_USERS.pop(email)
        save_users_to_csv(STATIC_USERS)
        return True
    return False

def hash_password(password):
    return pwd_context.hash(password)
