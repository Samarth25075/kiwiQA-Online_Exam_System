from redis import Redis
import json

redis_client = Redis(host='localhost', port=6379, db=0, decode_responses=True)
keys_to_clear = ["all_exams_list", "exams_with_counts", "all_candidates_list_summary"]

for key in keys_to_clear:
    print(f"Clearing cache key: {key}")
    redis_client.delete(key)

print("Cache cleared successfully.")
