"""
Migration script: Add missing columns to the candidates table.
Run this once from the backend directory:
  python migrate.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "kiwiqa.db")

MIGRATIONS = [
    ("violation_logs", "ALTER TABLE candidates ADD COLUMN violation_logs TEXT"),
    ("answers",        "ALTER TABLE candidates ADD COLUMN answers TEXT"),
    ("screenshot_start", "ALTER TABLE candidates ADD COLUMN screenshot_start TEXT"),
    ("screenshot_mid",   "ALTER TABLE candidates ADD COLUMN screenshot_mid TEXT"),
    ("screenshot_end",   "ALTER TABLE candidates ADD COLUMN screenshot_end TEXT"),
]

def column_exists(cursor, table, column):
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())

def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for col_name, sql in MIGRATIONS:
        if not column_exists(cur, "candidates", col_name):
            print(f"Adding column: {col_name}")
            cur.execute(sql)
        else:
            print(f"Column already exists, skipping: {col_name}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    run()
