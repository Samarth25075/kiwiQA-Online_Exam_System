import json
import bcrypt
from sqlalchemy.orm import Session
from app.models import User

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        print(f"VERIFY ERROR: {e}")
        return False

def get_user(db: Session, identifier: str):
    user = db.query(User).filter((User.email == identifier) | (User.username == identifier)).first()
    if user:
        perms = user.permissions
        if isinstance(perms, str):
            try:
                perms = json.loads(perms)
            except:
                perms = []
        return {
            "email": user.email,
            "username": user.username,
            "hashed_password": user.hashed_password,
            "role": user.role,
            "full_name": user.full_name,
            "permissions": perms,
            "session_id": user.session_id
        }
    return None

def add_user(db: Session, user_data: dict):
    new_user = User(
        email=user_data["email"],
        username=user_data.get("username"),
        hashed_password=user_data["hashed_password"],
        role=user_data["role"],
        full_name=user_data["full_name"],
        permissions=json.dumps(user_data.get("permissions", [])),
        session_id=user_data.get("session_id", "")
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def update_user_session(db: Session, email: str, session_id: str):
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.session_id = session_id
        db.commit()

def update_user_profile(db: Session, email: str, full_name: str, username: str) -> bool:
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.full_name = full_name
        user.username = username
        db.commit()
        return True
    return False

def verify_session(db: Session, email: str, session_id: str):
    user = db.query(User).filter(User.email == email).first()
    return user.session_id == session_id if user else False

def authenticate(db: Session, identifier: str, password: str):
    user = get_user(db, identifier)
    if not user or not user.get("hashed_password"):
        return None
    if verify_password(password, user["hashed_password"]):
        return user
    return None

def change_password(db: Session, email: str, current_password: str, new_password: str):
    user = db.query(User).filter(User.email == email).first()
    if user and authenticate(db, email, current_password):
        user.hashed_password = hash_password(new_password)
        db.commit()
        return True
    return False

def get_all_users(db: Session):
    users = db.query(User).all()
    res = []
    for user in users:
        perms = user.permissions
        if isinstance(perms, str):
            try:
                perms = json.loads(perms)
            except:
                perms = []
        res.append({
            "email": user.email,
            "username": user.username,
            "hashed_password": user.hashed_password,
            "role": user.role,
            "full_name": user.full_name,
            "permissions": perms,
            "session_id": user.session_id
        })
    return res

def delete_user(db: Session, email: str):
    user = db.query(User).filter(User.email == email).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False

def update_member(db: Session, email: str, update_data: dict) -> bool:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    
    if "full_name" in update_data and update_data["full_name"]:
        user.full_name = update_data["full_name"]
    if "username" in update_data and update_data["username"]:
        user.username = update_data["username"]
    if "role" in update_data and update_data["role"]:
        user.role = update_data["role"]
    if "permissions" in update_data and update_data["permissions"] is not None:
        user.permissions = json.dumps(update_data["permissions"])
    
    db.commit()
    return True
