import sqlite3
import bcrypt
import json
import os

db_path = 'kiwiqa.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Delete the incorrect admin if it exists
cursor.execute("DELETE FROM users WHERE email='admin@examportal.com'")

# 2. Add correct admin
email = "admin@examportal.com"
username = "admin"
password = "Admin@123"
hashed_password = hash_password(password)
role = "admin"
full_name = "System Admin"
permissions = json.dumps(["manage exam", "generate exam", "manage candidates", "manage users"])

cursor.execute('''
    INSERT INTO users (email, username, hashed_password, role, full_name, permissions)
    VALUES (?, ?, ?, ?, ?, ?)
''', (email, username, hashed_password, role, full_name, permissions))

# 3. Update samarthp5522@gmail.com with the same password for convenience
cursor.execute("UPDATE users SET hashed_password=? WHERE email='samarthp5522@gmail.com'", (hashed_password,))

conn.commit()
conn.close()

print("Successfully updated admin credentials.")
print(f"Login: {email} / {password}")
print(f"Login (Alternative): samarthp5522@gmail.com / {password}")
