import redis
import os
from dotenv import load_dotenv

load_dotenv()

def check_redis():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    print(f"Connecting to Redis at: {redis_url}")
    
    try:
        # 1. Connect
        client = redis.from_url(redis_url, decode_responses=True)
        
        # 2. Ping
        if client.ping():
            print("✅ SUCCESS: Redis is reachable!")
            
            # 3. Test Set/Get
            client.set("test_key", "Redis is working!")
            val = client.get("test_key")
            print(f"✅ SUCCESS: Data Write/Read test passed. Value: '{val}'")
            
            # 4. Cleanup
            client.delete("test_key")
        else:
            print("❌ ERROR: Redis ping failed.")
            
    except Exception as e:
        print(f"❌ ERROR: Could not connect to Redis: {e}")

if __name__ == "__main__":
    check_redis()
