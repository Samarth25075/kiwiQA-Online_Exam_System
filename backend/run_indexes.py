import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

def main():
    try:
        sql_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pgadmin_indexes.sql")
        with open(sql_path, "r") as f:
            sql = f.read()

        with engine.connect() as conn:
            # PostgreSQL requires auto-commit for creating indexes if run outside transactions.
            # But standard indexes can be run. We split by ';' to run individually.
            statements = sql.split(';')
            for statement in statements:
                statement = statement.strip()
                if statement:
                    print(f"Executing: {statement.splitlines()[0][:50]}...")
                    conn.execute(text(statement))
            
            conn.commit()
        print("✅ SUCCESS: All indexes have been created on your Render database!")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    main()
