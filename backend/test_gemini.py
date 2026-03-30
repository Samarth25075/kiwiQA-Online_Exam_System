import os
import google.genai as new_genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

print(f"Testing key: {api_key[:10]}...")

try:
    client = new_genai.Client(api_key=api_key)
    # List models to verify connectivity and authentication
    models = client.models.list()
    print("SUCCESS: Key is valid. Available models:")
    for m in models:
        print(f" - {m.name}")
except Exception as e:
    print(f"FAILURE: {e}")
