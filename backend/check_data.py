
from sqlalchemy import text
from app.database import engine

def check_data():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT email, full_name, username FROM users"))
        for row in res:
            print(f"User: {row.email}, Name: {row.full_name}, Username: {row.username}")

if __name__ == "__main__":
    check_data()
