import csv
import os
import json
from passlib.context import CryptContext

# Reduce work factor for development to make login faster
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)

CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "members.csv")

def _make_user(email: str, plain_password: str, role: str, full_name: str, permissions: list = None) -> dict:
    return {
        "email": email,
        "hashed_password": _pwd_context.hash(plain_password),
        "role": role,
        "full_name": full_name,
        "permissions": permissions or [],
        "session_id": None
    }

def load_users_from_csv() -> dict[str, dict]:
    users = {}
    if not os.path.exists(CSV_FILE_PATH):
        # Create default admin if file doesn't exist
        print(f"DEBUG: Creating default admin at {CSV_FILE_PATH}")
        default_admin = _make_user(
            email="admin@examportal.com",
            plain_password="admin123",
            role="admin",
            full_name="Portal Admin",
            permissions=["generate exam", "manage exam"]
        )
        users[default_admin["email"]] = default_admin
        save_users_to_csv(users)
        return users

    try:
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Deserialize permissions and session_id
                try:
                    row["permissions"] = json.loads(row["permissions"]) if row.get("permissions") else []
                except:
                    row["permissions"] = []
                
                # Ensure all fields exist
                if not row.get("email"): continue
                row["session_id"] = row.get("session_id")
                users[row["email"]] = row
    except Exception as e:
        print(f"Error loading members from CSV: {e}")
        # Fallback to default if load fails
        return load_users_from_csv() if not os.path.exists(CSV_FILE_PATH) else {}
    
    return users

def save_users_to_csv(users: dict[str, dict]):
    try:
        # Sort users by email for consistency
        sorted_emails = sorted(users.keys())
        fieldnames = ["email", "hashed_password", "role", "full_name", "permissions", "session_id"]
        
        with open(CSV_FILE_PATH, mode='w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for email in sorted_emails:
                user_copy = users[email].copy()
                # Serialize permissions as JSON string
                user_copy["permissions"] = json.dumps(user_copy["permissions"])
                writer.writerow(user_copy)
    except Exception as e:
        print(f"Error saving members to CSV: {e}")

# Initialize STATIC_USERS from CSV
STATIC_USERS: dict[str, dict] = load_users_from_csv()


# ── Public API ────────────────────────────────────────────────────────────────

def get_user(email: str) -> dict | None:
    """Return the user record for the given email, or None."""
    return STATIC_USERS.get(email)

def add_user(user: dict) -> None:
    """Add a new user and persist to CSV."""
    if "session_id" not in user:
        user["session_id"] = None
    if "permissions" not in user:
        user["permissions"] = []
    
    STATIC_USERS[user["email"]] = user
    save_users_to_csv(STATIC_USERS)

def update_user_session(email: str, session_id: str | None) -> None:
    """Update the active session ID for a user and persist to CSV."""
    user = get_user(email)
    if user:
        user["session_id"] = session_id
        STATIC_USERS[email] = user
        save_users_to_csv(STATIC_USERS)

def verify_session(email: str, session_id: str | None) -> bool:
    """Check if the provided session ID matches the active one."""
    user = get_user(email)
    if not user:
        return False
    return user.get("session_id") == session_id

def authenticate(email: str, password: str) -> dict | None:
    """Verify email + password."""
    user = get_user(email)
    if user is None:
        return None
    if not user.get("hashed_password"):
        return None
    if not _pwd_context.verify(password, user["hashed_password"]):
        return None
    return user

def change_password(email: str, current_password: str, new_password: str) -> bool:
    """Verify current_password, then update to new_password and persist to CSV."""
    user = get_user(email)
    if user is None:
        return False
    if not _pwd_context.verify(current_password, user["hashed_password"]):
        return False
    user["hashed_password"] = _pwd_context.hash(new_password)
    STATIC_USERS[email] = user
    save_users_to_csv(STATIC_USERS)
    return True

def get_all_users() -> list[dict]:
    """Return all users."""
    return list(STATIC_USERS.values())

def delete_user(email: str) -> bool:
    """Delete a user and persist to CSV."""
    if email in STATIC_USERS:
        del STATIC_USERS[email]
        save_users_to_csv(STATIC_USERS)
        return True
    return False

def hash_password(password: str) -> str:
    """Hash a plain text password."""
    return _pwd_context.hash(password)
