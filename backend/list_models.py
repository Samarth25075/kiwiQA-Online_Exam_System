import os
import google.genai as new_genai
from google.genai import types as genai_types
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

print(f"Listing models supporting generateContent for key: {api_key[:10]}...")

try:
    client = new_genai.Client(api_key=api_key)
    models = client.models.list()
    for m in models:
        # Check if generateContent is supported (assuming m has a 'supported_methods' or similar attribute)
        # Actually in the new SDK it's m.name
        print(f" - {m.name} ({m.display_name})")
except Exception as e:
    print(f"FAILURE: {e}")
