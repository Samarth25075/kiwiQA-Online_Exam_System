import os
import google.genai as new_genai
from google.genai import types as genai_types
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

print(f"Testing Gemini call with key: {api_key[:10]}...")

try:
    client = new_genai.Client(api_key=api_key)
    
    # Test with prefix
    model = "models/gemini-1.5-flash"
    print(f"Probing {model}...")
    
    system_instruction = "You are a helpful assistant."
    message = "Hello, who are you?"
    
    response = client.models.generate_content(
        model=model,
        contents=message,
        config=genai_types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7,
            max_output_tokens=100,
        )
    )
    print(f"SUCCESS: {response.text}")
except Exception as e:
    print(f"FAILURE: {e}")
