
from sqlalchemy import text, inspect
from app.database import engine

def check_schema():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('users')]
    print(f"Columns in users table: {columns}")
    if 'username' in columns:
        print("Username column EXISTS.")
    else:
        print("Username column MISSING.")

if __name__ == "__main__":
    check_schema()
