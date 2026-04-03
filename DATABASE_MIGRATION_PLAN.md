# Comprehensive SQL to MongoDB Migration Plan (Render Live)

Follow these precise steps to migrate your existing SQL-based Exam System to MongoDB Atlas while hosted on Render.

---

### Step 1: Data Backup (Crucial)
Export your current database content to JSON so you can import it into MongoDB later.
1.  Run a script to fetch all data from `users`, `exams`, and `candidates` tables.
2.  Save them as `users.json`, `exams.json`, and `candidates.json`.
3.  **Do not skip this step!** You will lose all your live data if you delete your SQL database without a backup.

---

### Step 2: Establish Your MongoDB Cloud Infrastructure
1.  **Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** and create a free account.
2.  **Deploy a Cluster**: Choose a Shared (Free) Tier.
3.  **Security Setup (Database User)**:
    *   Navigate to **Database Access**.
    *   Create a new Database User (e.g., `admin`).
    *   Set a strong **Password** (avoid special characters like `@` or `:`).
4.  **Security Setup (Network)**:
    *   Navigate to **Network Access**.
    *   Click **Add IP Address**.
    *   Click **Allow Access from Anywhere** (`0.0.0.0/0`).
    *   *Why? Render's service IP is dynamic and changes.*
5.  **Retrieve Connection URI**:
    *   Go to **Database** -> **Browse Collections**.
    *   Click **Connect** -> **Connect your application**.
    *   Copy the URI: `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`

---

### Step 3: Local Environment Updates
Modify your local environment before updating the live site.
1.  **Install Drivers**:
    ```bash
    pip install motor pymongo dnspython
    ```
2.  **Store URI in `.env`**:
    Update the `backend/.env` file:
    ```bash
    MONGODB_URL=mongodb+srv://admin:YOUR_PASSWORD@cluster0.abcde.mongodb.net/exam_db
    ```

---

### Step 4: Backend Refactoring (Code Changes)
This is the most time-consuming part. You must replace SQLAlchemy with **Motor** (Async drivers for MongoDB).

#### 1. Replace `backend/app/database.py`
```python
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Connect using the environment variable
MONGODB_URL = os.getenv("MONGODB_URL")
client = AsyncIOMotorClient(MONGODB_URL)
database = client.get_database("exam_portal_db")

# Collection helpers
exams_collection = database.get_collection("exams")
candidates_collection = database.get_collection("candidates")
users_collection = database.get_collection("users")
```

#### 2. Update Service Logic (In `app/exams/service.py`, etc.)
You must replace `db.query()` calls with MongoDB queries.
*   **SQL (Old)**: `db.query(Exam).filter(Exam.id == id).first()`
*   **MongoDB (New)**: `await exams_collection.find_one({"id": id})`

*   **SQL (Old)**: `db.add(new_exam); db.commit()`
*   **MongoDB (New)**: `await exams_collection.insert_one(new_exam_dict)`

---

### Step 5: Data Migration Script
Create a small temporary script (`migrate.py`) to move your backed-up JSON data into your new MongoDB Atlas collections.
```python
# Example migration snippet
import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate():
    client = AsyncIOMotorClient("YOUR_MONGODB_URI")
    db = client.get_database("exam_portal_db")
    
    with open("exams.json", "r") as f:
        exams = json.load(f)
        if exams:
            await db.exams.insert_many(exams)
    print("Migration complete!")

asyncio.run(migrate())
```

---

### Step 6: Update Render Dashboard (Live Deployment)
1.  Log in to your **Render Dashboard**.
2.  Select your **API Web Service** (`kiwiqa-api`).
3.  Go to the **Environment** tab.
4.  **Add Environment Variable**:
    *   **Key**: `MONGODB_URL`
    *   **Value**: Paste your full Atlas connection URI (ensure the password is correct).
5.  **Remove Old Variables**: If you have a `DATABASE_URL` pointing to PostgreSQL, you can remove it (but only *after* confirming the migration works).

---

### Step 7: Final Validation
1.  Watch the **Render logs**. If you see `Uvicorn running on http://0.0.0.0:10000`, the connection is successful.
2.  Login as admin via your frontend.
3.  Verify that your exams and candidate records are correctly displayed.

---

### Success Indicators
*   ✅ **Speed**: MongoDB handle large JSON blocks (like your Questions) much faster than SQL `JSON` columns.
*   ✅ **Scalability**: Your system is no longer limited by a single SQL file (`kiwiqa.db`).
*   ✅ **Visual Confirmation**: You can see your data in the MongoDB Atlas web dashboard.
