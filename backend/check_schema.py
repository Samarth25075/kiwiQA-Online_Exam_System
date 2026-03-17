import sqlite3
import os

db_path = "kiwiqa.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- CANDIDATES ---")
    cursor.execute("PRAGMA table_info(candidates)")
    for col in cursor.fetchall():
        print(f"Name: {col[1]}")
        
    print("\n--- EXAMS ---")
    cursor.execute("PRAGMA table_info(exams)")
    for col in cursor.fetchall():
        print(f"Name: {col[1]}")
    conn.close()
