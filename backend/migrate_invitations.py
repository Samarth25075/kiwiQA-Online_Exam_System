import sys
import os
from sqlalchemy import text
from app.database import engine

def migrate():
    print("Running migration for exam_invitations...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE exam_invitations ADD COLUMN admin_name VARCHAR;"))
            conn.commit()
            print("Successfully added 'admin_name' column to 'exam_invitations' table.")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("'admin_name' column already exists.")
            else:
                print(f"Error executing migration: {e}")

if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    migrate()
