import json
import bcrypt

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

async def get_user(db, identifier: str):
    user = await db.users.find_one({"$or": [{"email": identifier}, {"username": identifier}]})
    if user:
        # Handle cases where permissions might be a JSON string from migration
        permissions = user.get("permissions", [])
        if isinstance(permissions, str):
            try:
                permissions = json.loads(permissions)
            except:
                permissions = []
        
        return {
            "email": user["email"],
            "username": user.get("username"),
            "hashed_password": user["hashed_password"],
            "role": user["role"],
            "full_name": user["full_name"],
            "permissions": permissions,
            "session_id": user.get("session_id", "")
        }
    return None

async def add_user(db, user_data: dict):
    new_user = {
        "email": user_data["email"],
        "username": user_data.get("username"),
        "hashed_password": user_data["hashed_password"],
        "role": user_data["role"],
        "full_name": user_data["full_name"],
        "permissions": user_data.get("permissions", []),
        "session_id": user_data.get("session_id", "")
    }
    await db.users.insert_one(new_user)
    return new_user

async def update_user_session(db, email: str, session_id: str):
    await db.users.update_one(
        {"email": email},
        {"$set": {"session_id": session_id}}
    )

async def update_user_profile(db, email: str, full_name: str, username: str) -> bool:
    res = await db.users.update_one(
        {"email": email},
        {"$set": {
            "full_name": full_name,
            "username": username.strip() if username.strip() else None
        }}
    )
    return res.modified_count > 0

async def verify_session(db, email: str, session_id: str):
    user = await db.users.find_one({"email": email})
    return user.get("session_id") == session_id if user else False

async def authenticate(db, identifier: str, password: str):
    user = await get_user(db, identifier)
    if not user or not user.get("hashed_password"):
        return None
    if verify_password(password, user["hashed_password"]):
        return user
    return None

async def change_password(db, email: str, current_password: str, new_password: str):
    user = await authenticate(db, email, current_password)
    if user:
        await db.users.update_one(
            {"email": email},
            {"$set": {"hashed_password": hash_password(new_password)}}
        )
        return True
    return False

async def get_all_users(db):
    users = await db.users.find({}).to_list(length=1000)
    res = []
    for user in users:
        permissions = user.get("permissions", [])
        if isinstance(permissions, str):
            try:
                permissions = json.loads(permissions)
            except:
                permissions = []
        res.append({
            "email": user["email"],
            "username": user.get("username"),
            "hashed_password": user["hashed_password"],
            "role": user["role"],
            "full_name": user["full_name"],
            "permissions": permissions,
            "session_id": user.get("session_id", "")
        })
    return res

async def delete_user(db, email: str):
    res = await db.users.delete_one({"email": email})
    return res.deleted_count > 0

async def update_member(db, email: str, update_data: dict) -> bool:
    update_fields = {}
    if "full_name" in update_data and update_data["full_name"]:
        update_fields["full_name"] = update_data["full_name"]
    if "username" in update_data and update_data["username"]:
        update_fields["username"] = update_data["username"]
    if "role" in update_data and update_data["role"]:
        update_fields["role"] = update_data["role"]
    if "permissions" in update_data and update_data["permissions"] is not None:
        update_fields["permissions"] = update_data["permissions"]
    
    if not update_fields:
        return False
        
    res = await db.users.update_one(
        {"email": email},
        {"$set": update_fields}
    )
    return res.modified_count > 0

async def reset_password_in_db(db, email: str, new_password: str) -> bool:
    res = await db.users.update_one(
        {"email": email},
        {"$set": {"hashed_password": hash_password(new_password)}}
    )
    return res.modified_count > 0
