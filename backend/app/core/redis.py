import redis
import json
from .config import REDIS_URL

# Create redis client
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=1, socket_timeout=1)
    # Test connection
    redis_client.ping()
    print("INFO: Connected to Redis successfully.")
except Exception as e:
    print(f"WARNING: Redis connection failed: {e}. Falling back to No-Cache.")
    redis_client = None

def get_cached_data(key: str):
    if not redis_client:
        return None
    data = redis_client.get(key)
    return json.loads(data) if data else None

def set_cached_data(key: str, value, expire=3600):
    if not redis_client:
        return
    redis_client.set(key, json.dumps(value), ex=expire)
