
import os
from sqlalchemy import create_engine, text, inspect
from app.database import DATABASE_URL

def migrate():
    print(f"Connecting to: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        # ── Candidates Table ─────────────────────────────
        existing_cand_cols = [c['name'] for c in inspector.get_columns('candidates')]
        new_cand_cols = [
            ("answers", "JSONB" if "postgresql" in DATABASE_URL else "TEXT"),
            ("screenshot_start", "TEXT"),
            ("screenshot_mid", "TEXT"),
            ("screenshot_end", "TEXT")
        ]
        
        for col_name, col_type in new_cand_cols:
            if col_name not in existing_cand_cols:
                print(f"Adding {col_name} to candidates...")
                conn.execute(text(f"ALTER TABLE candidates ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            else:
                print(f"Column {col_name} already exists in candidates.")

        # ── Exams Table ───────────────────────────────────
        existing_exam_cols = [c['name'] for c in inspector.get_columns('exams')]
        new_exam_cols = [
            ("link_expiry", "TEXT"),
            ("auto_delete", "TEXT"),
            ("proctoring_enabled", "BOOLEAN DEFAULT FALSE" if "postgresql" in DATABASE_URL else "BOOLEAN DEFAULT 0"),
            ("proctoring_type", "TEXT"),
            ("passing_score", "INTEGER DEFAULT 50")
        ]
        
        for col_name, col_type in new_exam_cols:
            if col_name not in existing_exam_cols:
                print(f"Adding {col_name} to exams...")
                conn.execute(text(f"ALTER TABLE exams ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            else:
                print(f"Column {col_name} already exists in exams.")

    print("Migration complete!")

if __name__ == "__main__":
    migrate()
