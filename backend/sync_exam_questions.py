import sqlite3
import json

db_path = r"c:\Users\patel\Desktop\Exam\fastapi-react\backend\kiwiqa.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, questions FROM exams")
rows = cursor.fetchall()

updated = 0
for row in rows:
    exam_id, questions_json = row
    questions = json.loads(questions_json) if questions_json else []
    actual_count = len(questions)
    
    # Update the redundant num_questions column to match reality
    cursor.execute("UPDATE exams SET num_questions = ? WHERE id = ?", (actual_count, exam_id))
    updated += 1

conn.commit()
print(f"Successfully synchronized num_questions for {updated} exams.")
conn.close()
