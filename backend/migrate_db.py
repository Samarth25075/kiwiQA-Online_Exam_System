import sqlite3
import os

db_path = "kiwiqa.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_columns_if_missing(table_name, columns_to_add):
    cursor.execute(f"PRAGMA table_info({table_name})")
    existing_columns = [col[1] for col in cursor.fetchall()]
    added_any = False
    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            print(f"Adding column {col_name} to table {table_name}...")
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
            added_any = True
        else:
            print(f"Column {col_name} in {table_name} already exists.")
    return added_any

candidate_columns = [
    ("answers", "TEXT"),
    ("screenshot_start", "TEXT"),
    ("screenshot_mid", "TEXT"),
    ("screenshot_end", "TEXT")
]

exam_columns = [
    ("link_expiry", "TEXT"),
    ("auto_delete", "TEXT"),
    ("proctoring_enabled", "BOOLEAN DEFAULT 0"),
    ("proctoring_type", "TEXT"),
    ("passing_score", "INTEGER DEFAULT 50")
]

added_candidates = add_columns_if_missing("candidates", candidate_columns)
added_exams = add_columns_if_missing("exams", exam_columns)

if added_candidates or added_exams:
    conn.commit()
    print("Migration completed successfully.")
else:
    print("No columns needed to be added.")

conn.close()
