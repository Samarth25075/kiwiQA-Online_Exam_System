import os
import google.genai as new_genai
from google.genai import types as genai_types
from app.core.config import GOOGLE_API_KEY
from typing import List, Optional, Dict

def get_ai_chat_response(message: str, history: List[Dict] = None) -> str:
    """Uses Google Gemini to provide human-like chat responses for the AI assistant."""
    if not GOOGLE_API_KEY:
        return "I'm sorry, my AI backend is not configured yet. Please check the GOOGLE_API_KEY in your environment."
        
    try:
        client = new_genai.Client(api_key=GOOGLE_API_KEY)
        
        # Consistent model selection
        # Consistent model selection (Based on verified availability for this key)
        models_to_try = [
            'models/gemini-2.5-flash', 
            'models/gemini-2.0-flash', 
            'models/gemini-2.0-flash-lite',
            'models/gemma-3-27b-it'
        ]
        selected_model = None
        is_quota_issue = False
        last_error = ""
        
        # Quick validation of models
        for m in models_to_try:
            try:
                # Use a simpler probe
                client.models.generate_content(model=m, contents="hi", config=genai_types.GenerateContentConfig(max_output_tokens=1))
                selected_model = m
                break
            except Exception as e:
                err_msg = str(e).lower()
                if "429" in err_msg or "quota" in err_msg or "exhausted" in err_msg:
                    is_quota_issue = True
                last_error = str(e)
                print(f"DEBUG: Probe failed for {m}: {e}")
                continue
            
        if not selected_model:
            if is_quota_issue:
                return "My AI brain has run out of juice (API Quota Exhausted)! 🥝 Please try again in a few minutes."
            return f"I'm currently undergoing maintenance. (Error: {last_error[:50]}) 🥝"

        # Construct System Instruction
        system_instruction = """
        You are KiwiAssistant, a friendly and professional AI assistant for the KiwiQA Online Assessment Portal.
        Your goal is to help administrators manage exams, candidates, and reports.
        
        CONTEXT:
        - Exam Creation: Use 'Create Exam' to generate questions from AI or Bank.
        - Proctoring: Includes Webcam, Face recognition, and Tab-switching tracking.
        - Question Bank: Central hub for all shared questions by category.
        - Reports: Detailed analysis of scores, proctoring violations, and performance.
        - Master OTP: Shared with candidates to verify identity.
        - Redefine Question: If a user asks to redefine, or improve a question, provide a high-quality version with clear options and a professional explanation.
        
        TONE:
        - Human-like, concise, and helpful.
        - Use simple terminology but be technically accurate.
        - Use emojis sparingly (like 🥝, 🤖, 📝).
        
        If you don't know the answer, suggest checking the 'User Guide' module.
        """
        
        # Build history for Gemini (roles: 'user', 'model')
        gemini_history = []
        if history:
            for m in history:
                gemini_history.append(genai_types.Content(
                   parts=[genai_types.Part(text=m.get("content", ""))],
                   role="user" if m.get("role") == "user" else "model"
                ))

        response = client.models.generate_content(
            model=selected_model,
            contents=message, # Current message
            config=genai_types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                max_output_tokens=1000,
            )
        )
        
        return response.text.strip()
    except Exception as e:
        print(f"ERROR: AI Chat failed: {e}")
        return f"I encountered a bit of a brain freeze! Details: {str(e)[:100]} 🥝"
