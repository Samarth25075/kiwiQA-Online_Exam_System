# MongoDB Implementation Guide for Live Deployment

This guide explains how to connect your FastAPI system to a **MongoDB** (NoSQL) database instead of using Render's PostgreSQL service or the local SQLite file.

> [!CAUTION]
> **Warning**: Your current codebase represents a relational (SQL) structure using **SQLAlchemy**. Switching to MongoDB is a major architectural change that requires rewriting the data access logic in your service files.

---

### Phase 1: Create a Production MongoDB (Live)

The standard way to use MongoDB live (without using Render's database) is with **MongoDB Atlas** (Free Tier available).

1.  **Create an Atlas Account**: Go to [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2.  **Deploy a Cluster**: Choose the Shared (Free) Tier. Pick a region near your Render deployment (e.g., AWS us-east-1).
3.  **Authentication**: Create a Database User with a **Username** and **Password**. 
4.  **Network Access**: 
    *   Add an IP address: `0.0.0.0/0`.
    *   *Note: This is necessary for Render as their outgoing IPs change constantly.*
5.  **Get Connection String**:
    *   Click **Connect** -> **Connect your application**.
    *   Copy the URI (e.g., `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`).

---

### Phase 2: Updating the FastAPI Application

To use MongoDB in your backend, you must swap **SQLAlchemy** for a MongoDB driver like **Motor** (Asynchronous) or **PyMongo** (Synchronous).

#### 1. Install Dependencies
```bash
pip install motor pymongo dnspython
```

#### 2. Configure environment variable
Add this line to your **Render Dashboard** environment variables (and your local `.env`):
```bash
MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/exam_db
```

#### 3. Update `backend/app/database.py` (Draft)
```python
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.getenv("MONGODB_URL")
client = AsyncIOMotorClient(MONGODB_URL)
database = client.get_database("exam_db")

# Example collection access
exams_collection = database.get_collection("exams")
```

---

### Phase 3: Major Architectural Considerations

Since you are moving from **Relational (SQL)** to **Document (NoSQL)**:

1.  **Foreign Keys**: MongoDB does not enforce foreign keys. You will need to handle the relationship between `Candidates` and `Exams` manually using the `ID`.
2.  **Schema Validation**: Use **Pydantic** models to define the document structure, as the database itself is schema-less.
3.  **Migration**: You will likely need to write a script to move data from `kiwiqa.db` (SQLite) into the MongoDB collections.

---

### Phase 4: Deploying to Render with MongoDB

1.  Open your **Render Dashboard**.
2.  Select your Web Service (`kiwiqa-api`).
3.  Go to **Environment**.
4.  Add `MONGODB_URL` as a new variable.
5.  Render will automatically redeploy and use your external MongoDB Atlas cluster.
