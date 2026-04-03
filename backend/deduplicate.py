import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import certifi

load_dotenv()
MONGODB_URL = os.getenv("MONGODB_URL")

async def deduplicate_invitations():
    client = AsyncIOMotorClient(MONGODB_URL, tlsCAFile=certifi.where())
    db = client.get_database("exam_portal_db")
    coll = db.get_collection("exam_invitations")
    
    print("Searching for duplicate invitations...")
    pipeline = [
        {"$group": {
            "_id": {"exam_id": "$exam_id", "email": "$email"},
            "unique_ids": {"$addToSet": "$_id"},
            "count": {"$sum": 1}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    
    duplicates = await coll.aggregate(pipeline).to_list(length=None)
    
    if not duplicates:
        print("No duplicates found!")
        return
        
    print(f"Found {len(duplicates)} pairs with duplicates.")
    
    for dup in duplicates:
        ids = dup["unique_ids"]
        # Keep the first one, delete the rest
        to_delete = ids[1:]
        print(f"  Removing {len(to_delete)} duplicate(s) for {dup['_id']}")
        await coll.delete_many({"_id": {"$in": to_delete}})
        
    print("Deduplication complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(deduplicate_invitations())
