import os
import sys
from sqlalchemy import create_engine, inspect, text

# Add parent directory to sys.path to import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import DATABASE_URL, engine

MIGRATIONS = [
    ("calculator_enabled", "ALTER TABLE exams ADD COLUMN calculator_enabled BOOLEAN DEFAULT FALSE"),
    ("notes_enabled",      "ALTER TABLE exams ADD COLUMN notes_enabled BOOLEAN DEFAULT FALSE"),
    ("proctoring_link",    "ALTER TABLE exams ADD COLUMN proctoring_link TEXT"),
    ("supplement_flag",    "ALTER TABLE exams ADD COLUMN supplement_flag BOOLEAN DEFAULT FALSE"),
]

def run():
    print(f"Targeting Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    
    with engine.connect() as conn:
        inspector = inspect(engine)
        
        # Get existing columns in 'exams' table
        try:
            columns = [c['name'] for c in inspector.get_columns("exams")]
        except Exception as e:
            print(f"Error inspecting 'exams' table: {e}")
            return
        
        for col_name, sql in MIGRATIONS:
            if col_name not in columns:
                print(f"Applying migration: {col_name}")
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f"Successfully added {col_name}")
                except Exception as e:
                    print(f"Error adding {col_name}: {e}")
            else:
                print(f"Column '{col_name}' already exists. Skipping.")
                
    print("Database Migration complete.")

if __name__ == "__main__":
    run()
