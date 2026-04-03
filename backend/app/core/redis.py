import redis.asyncio as redis
import json
from .config import REDIS_URL

# Create redis client in async mode
try:
    # Notice: No await here in global scope, we'll initialize on first use or use directly
    redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=1, socket_timeout=1)
    print("INFO: Async Redis client initialized.")
except Exception as e:
    print(f"WARNING: Redis initialization failed: {e}. Falling back to No-Cache.")
    redis_client = None

async def get_cached_data(key: str):
    if not redis_client:
        return None
    try:
        data = await redis_client.get(key)
        return json.loads(data) if data else None
    except:
        return None

async def set_cached_data(key: str, value, expire=3600):
    if not redis_client:
        return
    try:
        await redis_client.set(key, json.dumps(value), ex=expire)
    except:
        pass
