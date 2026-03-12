from __future__ import annotations
import csv
import os
import json
import bcrypt

# Data Path Configuration
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CSV_FILE_PATH = os.path.join(BASE_DIR, "members.csv")

def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly."""
    # Salt is generated automatically by bcrypt
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        print(f"VERIFY ERROR: {e}")
        return False

def _make_user(email, plain_password, role, full_name, permissions=None):
    return {
        "email": email,
        "hashed_password": hash_password(plain_password),
        "role": role,
        "full_name": full_name,
        "permissions": permissions or [],
        "session_id": None
    }

def load_users_from_csv():
    users = {}
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
                if not row or not row.get("email"): continue
                try:
                    perms = row.get("permissions", "[]")
                    row["permissions"] = json.loads(perms) if perms else []
                except:
                    row["permissions"] = []
                users[row["email"]] = row
    except Exception as e:
        print(f"ERROR loading users: {e}")
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
        print(f"ERROR saving users: {e}")

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
    if verify_password(password, user["hashed_password"]):
        return user
    return None

def change_password(email, current_password, new_password):
    user = get_user(email)
    if user and authenticate(email, current_password):
        user["hashed_password"] = hash_password(new_password)
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
