import sqlite3
import json

db_path = r"c:\Users\patel\Desktop\Exam\fastapi-react\backend\kiwiqa.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, title, topic, num_questions, questions FROM exams WHERE title LIKE '%QA%'")
row = cursor.fetchone()

if row:
    exam_id, title, topic, num_questions, questions_json = row
    questions = json.loads(questions_json) if questions_json else []
    print(f"Exam ID: {exam_id}")
    print(f"Title: {title}")
    print(f"Topic: {topic}")
    print(f"Stored num_questions: {num_questions}")
    print(f"Actual questions length: {len(questions)}")
else:
    print("Exam 'QA' not found.")

conn.close()
