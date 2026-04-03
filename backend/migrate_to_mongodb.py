import sqlite3
import os
import asyncio
import json
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SQLITE_DB = "kiwiqa.db"
# Use the Atlas URL if provided in environment, otherwise local
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://admin:test%40123@kiwiqa.0qirdmm.mongodb.net/?appName=KiwiQA")
DB_NAME = "exam_portal_db"

async def migrate():
    if not os.path.exists(SQLITE_DB):
        print(f"❌ Error: SQLite database '{SQLITE_DB}' not found in the current directory.")
        return

    print(f"🔄 Connecting to MongoDB: {MONGODB_URL.split('@')[-1] if '@' in MONGODB_URL else MONGODB_URL}")
    client = AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where())
    db = client[DB_NAME]

    print(f"📂 Connecting to SQLite: {SQLITE_DB}")
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()

    # List of tables to migrate
    tables = ["users", "exams", "candidates", "question_categories", "exam_invitations"]

    for table in tables:
        print(f"\n📦 Migrating table: {table}...")
        
        try:
            cursor.execute(f"SELECT * FROM {table}")
            rows = cursor.fetchall()
            
            if not rows:
                print(f"⚠️ Table '{table}' is empty. Skipping.")
                continue

            # Convert SQLite rows to dictionaries
            documents = []
            for row in rows:
                doc = dict(row)
                
                # Handle specific JSON fields that might be stored as strings in SQLite
                if table == "exams" and "questions" in doc:
                    try:
                        if isinstance(doc["questions"], str):
                            doc["questions"] = json.loads(doc["questions"])
                    except:
                        pass
                
                if table == "users" and "permissions" in doc:
                    try:
                        if isinstance(doc["permissions"], str):
                            doc["permissions"] = json.loads(doc["permissions"])
                    except:
                        doc["permissions"] = []
                
                if table == "candidates":
                    for field in ["violation_logs", "answers"]:
                        if field in doc and isinstance(doc[field], str):
                            try:
                                doc[field] = json.loads(doc[field])
                            except:
                                pass

                documents.append(doc)

            # Upsert into MongoDB to avoid DuplicateKeyError
            collection = db[table]
            
            # Identify the primary key for the table
            pk_field = "id"
            if table == "users": pk_field = "id"
            if table == "candidates": pk_field = "candidate_id"
            if table == "question_categories": pk_field = "id"
            if table == "exam_invitations": pk_field = "id"

            inserted_count = 0
            for doc in documents:
                try:
                    await collection.update_one(
                        {pk_field: doc[pk_field]},
                        {"$set": doc},
                        upsert=True
                    )
                    inserted_count += 1
                except Exception as doc_error:
                    print(f"  ⚠️ Skipping record {doc.get(pk_field)} due to error: {doc_error}")

            print(f"✅ Successfully migrated/updated {inserted_count} records in '{table}' collection.")

        except Exception as e:
            print(f"❌ Error migrating table '{table}': {e}")

    # Set up Indexes for performance and uniqueness
    print("\n⚡ Setting up indexes...")
    index_tasks = [
        ("users", "email", True),
        ("users", "username", True),
        ("exams", "id", True),
        ("candidates", "candidate_id", True),
        ("candidates", "email", False),
        ("candidates", "token", True),
        ("exam_invitations", [("exam_id", 1), ("email", 1)], True)
    ]

    for coll_name, index_key, is_unique in index_tasks:
        try:
            print(f"  👉 Creating index on {coll_name}({index_key})...")
            await db[coll_name].create_index(index_key, unique=is_unique)
        except Exception as e:
            print(f"  ⚠️ Warning: Could not create index on {coll_name}: {e}")

    print("✅ Index setup phase complete.")

    print("\n🎉 Migration finished successfully!")
    sqlite_conn.close()
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())
