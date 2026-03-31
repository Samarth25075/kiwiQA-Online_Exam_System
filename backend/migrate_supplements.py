import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "kiwiqa.db")

MIGRATIONS = [
    ("calculator_enabled", "ALTER TABLE exams ADD COLUMN calculator_enabled BOOLEAN DEFAULT 0"),
    ("notes_enabled",      "ALTER TABLE exams ADD COLUMN notes_enabled BOOLEAN DEFAULT 0"),
    ("proctoring_link",    "ALTER TABLE exams ADD COLUMN proctoring_link TEXT"),
    ("supplement_flag",    "ALTER TABLE exams ADD COLUMN supplement_flag BOOLEAN DEFAULT 0"),
]

def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())

def run():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return
        
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for col_name, sql in MIGRATIONS:
        if not column_exists(cur, "exams", col_name):
            print(f"Adding column: {col_name}")
            try:
                cur.execute(sql)
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
        else:
            print(f"Column already exists, skipping: {col_name}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    run()
