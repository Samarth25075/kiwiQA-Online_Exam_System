import os
import google.genai as new_genai
from google.genai import types as genai_types
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

print(f"Verifying Gemini 2.x call with key: {api_key[:10]}...")

try:
    client = new_genai.Client(api_key=api_key)
    
    # Test with 2.5-flash
    model = "models/gemini-2.5-flash"
    print(f"Probing {model}...")
    
    response = client.models.generate_content(
        model=model,
        contents="hi",
        config=genai_types.GenerateContentConfig(
            max_output_tokens=5,
        )
    )
    print(f"SUCCESS: {response.text}")
except Exception as e:
    print(f"FAILURE: {e}")
