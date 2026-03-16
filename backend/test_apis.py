import os
import json
import requests
from dotenv import load_dotenv
import google.genai as new_genai
from google.genai import types as genai_types

load_dotenv()

QUIZ_API_KEY = "qa_sk_ffe9641e8c039c71259e56045df8365245f63082"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def test_quiz_api(topic, count=2):
    print(f"\n--- Testing QuizAPI (apiKey param) for topic: {topic} ---")
    url = "https://quizapi.io/api/v1/questions"
    try:
        r = requests.get(url, params={"apiKey": QUIZ_API_KEY, "limit": count, "tags": topic})
        print(f"Status: {r.status_code}, Body: {r.text[:200]}")
    except Exception as e: print(f"Error: {e}")

    print(f"\n--- Testing QuizAPI (X-Api-Key header) ---")
    try:
        r = requests.get(url, headers={"X-Api-Key": QUIZ_API_KEY}, params={"limit": count, "tags": topic})
        print(f"Status: {r.status_code}, Body: {r.text[:200]}")
    except Exception as e: print(f"Error: {e}")

    print(f"\n--- Testing QuizAPI (Authorization header) ---")
    try:
        r = requests.get(url, headers={"Authorization": f"Bearer {QUIZ_API_KEY}"}, params={"limit": count, "tags": topic})
        print(f"Status: {r.status_code}, Body: {r.text[:200]}")
    except Exception as e: print(f"Error: {e}")

def test_gemini_v1(topic):
    print(f"\n--- Testing Gemini (v1) ---")
    try:
        client = new_genai.Client(api_key=GOOGLE_API_KEY, http_options={'api_version': 'v1'})
        response = client.models.generate_content(model='gemini-1.5-flash', contents="Say 'OK'")
        print(f"Success: {response.text}")
    except Exception as e: print(f"Error: {e}")

def test_gemini_default(topic):
    print(f"\n--- Testing Gemini (default) ---")
    try:
        client = new_genai.Client(api_key=GOOGLE_API_KEY)
        response = client.models.generate_content(model='gemini-1.5-flash', contents="Say 'OK'")
        print(f"Success: {response.text}")
    except Exception as e: print(f"Error: {e}")

if __name__ == "__main__":
    test_quiz_api("Java")
    test_gemini_v1("Java")
    test_gemini_default("Java")
