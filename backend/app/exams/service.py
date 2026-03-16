# app/exams/service.py
import json
import os
import uuid
import re
from datetime import datetime
from typing import List, Dict, Optional
from app.exams.schemas import ExamCreate, ExamFinalize, Question, Option
import google.genai as new_genai
from google.genai import types as genai_types
from app.core.config import GOOGLE_API_KEY

import threading

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "data")
EXAMS_FILE = os.path.join(STORAGE_DIR, "exams.json")
KNOWLEDGE_BASE_FILE = os.path.join(STORAGE_DIR, "knowledge_base.json")

# Multi-threading lock for safe concurrent JSON access
EXAMS_LOCK = threading.RLock()

def _ensure_storage():
    if not os.path.exists(STORAGE_DIR):
        os.makedirs(STORAGE_DIR)
    if not os.path.exists(EXAMS_FILE):
        with EXAMS_LOCK:
            if not os.path.exists(EXAMS_FILE):
                with open(EXAMS_FILE, "w") as f:
                    json.dump([], f)

def _load_knowledge_base() -> Dict:
    if os.path.exists(KNOWLEDGE_BASE_FILE):
        with open(KNOWLEDGE_BASE_FILE, "r") as f:
            return json.load(f)
    return {}

def _generate_with_gemini(topic: str, difficulty: str, count: int) -> Optional[List[Dict]]:
    """Actually use Google Gemini to generate questions."""
    if not GOOGLE_API_KEY:
        return None
        
    try:
        # Use v1 explicitly to avoid v1beta issues
        client = new_genai.Client(api_key=GOOGLE_API_KEY, http_options={'api_version': 'v1'})
        
        # Aggressive model fallback with working models
        m_list = [
            'models/gemini-2.0-flash',
            'models/gemini-1.5-flash',
            'models/gemini-pro',
            'models/gemini-2.0-flash-lite',
            'models/gemini-1.5-flash-8b',
        ]
        
        selected_model = None
        for m_name in m_list:
            try:
                # Test the model with a tiny request
                client.models.generate_content(
                    model=m_name,
                    contents=" ",
                    config=genai_types.GenerateContentConfig(max_output_tokens=1)
                )
                selected_model = m_name
                print(f"INFO: Successfully selected model for generation: {m_name}")
                break
            except Exception as me:
                # Still log failures but silently move on
                if "quota" not in str(me).lower():
                    print(f"DEBUG: Model {m_name} check failed: {str(me)[:150]}")
                continue
        
        if not selected_model:
            print("ERROR: No valid Gemini model found after checking all options (quota probably hit).")
            return None
        
        prompt = f"""
        TASK: Generate EXACTLY {count} high-quality Multiple Choice Questions (MCQs).
        TOPIC: {topic}
        DIFFICULTY: {difficulty}

        CONSTRAINTS:
        1. YOU MUST RETURN EXACTLY {count} QUESTIONS.
        2. EVERY QUESTION MUST FOCUS ON A DIFFERENT SUB-TOPIC. Do not repeat the same concept.
        3. For a topic like '{topic}', ensure you cover different areas (e.g., Syntax, Logic, Performance, Security, etc.).
        4. Output MUST be only the JSON array of objects.
        5. Each object MUST contain: "text", "options", "explanation".
        6. Provide exactly 4 distinct options per question.
        7. EXACTLY one option per question must be "is_correct": true.
        8. Standardize difficulty to the '{difficulty}' level.
        9. Avoid starting questions with the same phrasing (e.g., don't start every question with 'What is ...').
        10. BE CONCISE. Keep question text and explanations short to avoid being truncated.
        11. OUTPUT ONLY THE JSON ARRAY. NO PREAMBLE. NO EXPLANATION AFTER THE JSON.

        FORMAT EXAMPLE:
        [
          {{
            "text": "What is the primary purpose of React Hooks?",
            "options": [
              {{"text": "To manage state and side effects in functional components", "is_correct": true}},
              {{"text": "To replace class components entirely", "is_correct": false}},
              {{"text": "To improve CSS performance", "is_correct": false}},
              {{"text": "To handle database migrations", "is_correct": false}}
            ],
            "explanation": "Hooks allow function components to have access to state and other React features."
          }}
        ]
        """
        
        response = client.models.generate_content(
            model=selected_model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.7,
                top_p=0.9,
                top_k=40,
                max_output_tokens=4096,
            )
        )
        text = response.text.strip()
        
        # Robust JSON extraction
        start_idx = text.find('[')
        end_idx = text.rfind(']')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = text[start_idx:end_idx+1]
        elif start_idx != -1:
            # Healing attempt for truncated JSON
            json_str = text[start_idx:].strip()
            if not json_str.endswith(']'):
                # Try to cut at the last complete object
                last_obj = json_str.rfind('}')
                if last_obj != -1:
                    json_str = json_str[:last_obj+1] + ']'
                else:
                    json_str += ']'
        else:
            json_str = text.strip().replace('```json', '').replace('```', '').strip()

        try:
            questions = json.loads(json_str)
        except json.JSONDecodeError as je:
            print(f"ERROR: JSON Decode failed: {je}")
            print(f"RAW TEXT (first 200 chars): {text[:200]}...")
            return None
        
        # Validation & Cleanup
        validated_qs = []
        if not isinstance(questions, list):
            print(f"ERROR: Expected list of questions, got {type(questions)}")
            return None

        for q in questions:
            if not isinstance(q, dict) or "text" not in q:
                continue
                
            raw_options = q.get("options", [])
            if not isinstance(raw_options, list) or len(raw_options) < 2:
                continue
                
            # Convert string options to dicts and heal 'is_correct'
            new_options = []
            correct_found = False
            for i, opt in enumerate(raw_options):
                if isinstance(opt, str):
                    is_correct = (i == 0) # Just pick first if it's just strings
                    new_options.append({"text": opt, "is_correct": is_correct})
                elif isinstance(opt, dict):
                    txt = str(opt.get("text", opt.get("option", f"Option {i+1}")))
                    # Check multiple variants of 'is_correct'
                    is_c = bool(opt.get("is_correct", opt.get("correct", opt.get("isCorrect", False))))
                    if is_c: correct_found = True
                    new_options.append({"text": txt, "is_correct": is_c})
            
            if not new_options: continue
            
            # Ensure exactly 1 correct answer
            if not correct_found:
                new_options[0]["is_correct"] = True
            
            # Normalize to 4 options
            while len(new_options) < 4:
                new_options.append({"text": "Other related concept", "is_correct": False})
            new_options = new_options[:4]
            
            validated_qs.append({
                "text": str(q.get("text", "Untitled Question")),
                "options": new_options,
                "explanation": str(q.get("explanation", q.get("desc", "Detailed explanation for this answer.")))
            })
        
        # Ensure final uniqueness by text and fuzzy logic (prefix matching)
        unique_qs = []
        seen_texts = set()
        seen_prefixes = set() 
        
        for q in validated_qs:
            txt = q["text"].strip()
            txt_lower = txt.lower()
            # Prefix check (first 30 chars) to catch "What is X?" vs "What is Y?" if they are too similar
            prefix = txt_lower[:30]
            
            if txt_lower not in seen_texts and prefix not in seen_prefixes:
                unique_qs.append(q)
                seen_texts.add(txt_lower)
                seen_prefixes.add(prefix)
                
        return unique_qs[:count] if unique_qs else None
    except Exception as e:
        print(f"ERROR: Gemini generation failed: {e}")
        import traceback
        traceback.print_exc()
        return None

def _generate_mock_questions(topic: str, difficulty: str, count: int) -> List[Dict]:
    """Simulate AI generation. Picks from knowledge base if possible, otherwise generates generic."""
    
    # Try Gemini first
    questions = _generate_with_gemini(topic, difficulty, count)
    if not questions:
        questions = []
    
    # If we have some questions but not all, try one more time with a MORE SPECIFIC request
    if 0 < len(questions) < count:
        remaining_count = count - len(questions)
        already_asked = [q["text"] for q in questions]
        context = " ".join(already_asked)[:200]
        
        print(f"INFO: AI returned {len(questions)}/{count}. Retrying for {remaining_count} more with diversity...")
        retry_prompt = f"Generate {remaining_count} MORE UNIQUE questions for {topic} ({difficulty} level). DO NOT repeat these topics: {context}"
        
        more_questions = _generate_with_gemini(retry_prompt, difficulty, remaining_count)
        if more_questions:
            questions.extend(more_questions)
            
    # Load from JSON file as backup
    knowledge_base = _load_knowledge_base()
    
    # Final Deduplication
    final_unique = []
    seen = set()
    for q in questions:
        norm = q["text"].strip().lower()
        if norm not in seen:
            final_unique.append(q)
            seen.add(norm)
    questions = final_unique
    
    # Simple keyword search in topic
    subject = topic.lower()
    base_qs = []
    for key in knowledge_base:
        if key in subject:
            base_qs = knowledge_base[key]
            break
            
    import random
    if base_qs:
        # Filter out questions already picked by AI (simple text match)
        existing_texts = {q["text"] for q in questions}
        available_base = [bq for bq in base_qs if bq["text"] not in existing_texts]
        
        needed = count - len(questions)
        if available_base and needed > 0:
            sample_size = min(len(available_base), needed)
            questions.extend(random.sample(available_base, sample_size))
        
    # Fill remaining with dynamic templates to ensure "num_questions" is met
    # Ensuring variety even without AI
    remaining = count - len(questions)
    placeholder_templates = [
        "What is the primary function of {topic} in {p_topic}?",
        "When dealing with {topic}, why is {p_topic} considered a best practice?",
        "How does {topic} implement {p_topic} within a {difficulty} architecture?",
        "Which of the following describes the behavior of {topic} regarding {p_topic}?",
        "In a {difficulty} environment, what is a common challenge with {topic} and {p_topic}?",
        "Identify the true statement about {topic}'s approach to {p_topic}.",
        "What are the benefits of using {topic} for managing {p_topic}?",
        "How is {topic} typically used to resolve {p_topic} issues?",
        "Explain the interaction between {topic} and {p_topic} in {difficulty} systems."
    ]
    
    placeholder_topics = [
        "Core syntax and basic structure",
        "Memory management and performance",
        "Best practices and design patterns",
        "Common errors and troubleshooting",
        "Advanced features and optimization",
        "Standard libraries and frameworks",
        "Concurrency and parallel processing",
        "Security considerations and vulnerabilities",
        "Data persistence and storage",
        "Integration and API interactions"
    ]
    
    import random
    for i in range(1, remaining + 1):
        p_template = random.choice(placeholder_templates)
        p_subtopic = placeholder_topics[i % len(placeholder_topics)]
        q_text = p_template.format(topic=topic, p_topic=p_subtopic, difficulty=difficulty)
        
        questions.append({
            "text": q_text,
            "options": [
                {"text": f"Optimized {topic} approach for {p_subtopic}", "is_correct": True},
                {"text": f"Default {topic} behavior ignoring {p_subtopic}", "is_correct": False},
                {"text": f"Legacy implementation of {topic}", "is_correct": False},
                {"text": f"Generic error handling for {p_subtopic}", "is_correct": False},
            ],
            "explanation": f"Automated question focusing on the intersection of {topic} and {p_subtopic} at a {difficulty} level."
        })
    
    # Final shuffle
    import random
    random.shuffle(questions)
    return questions[:count]

def generate_questions(exam_in: ExamCreate) -> List[Dict]:
    return _generate_mock_questions(exam_in.topic, exam_in.difficulty, exam_in.num_questions)

def save_exam(exam_in: ExamFinalize) -> Dict:
    _ensure_storage()
    new_exam = {
        "id": str(uuid.uuid4()),
        "title": exam_in.title,
        "topic": exam_in.topic,
        "difficulty": exam_in.difficulty,
        "duration": exam_in.duration,
        "num_questions": exam_in.num_questions,
        "created_at": datetime.now().isoformat(),
        "link_expiry": exam_in.link_expiry,
        "auto_delete": exam_in.auto_delete,
        "proctoring_enabled": exam_in.proctoring_enabled,
        "proctoring_type": exam_in.proctoring_type,
        "passing_score": exam_in.passing_score,
        "questions": [q.dict() for q in exam_in.questions]
    }
    
    with EXAMS_LOCK:
        exams = get_all_exams()
        # get_all_exams returns reversed list, we need to reverse it back to append at the end
        original_order = list(reversed(exams))
        original_order.append(new_exam)
        
        with open(EXAMS_FILE, "w") as f:
            json.dump(original_order, f, indent=4)
            
    return new_exam

def create_exam(exam_in: ExamCreate) -> Dict:
    _ensure_storage()
    
    questions = _generate_mock_questions(exam_in.topic, exam_in.difficulty, exam_in.num_questions)
    
    new_exam = {
        "id": str(uuid.uuid4()),
        "title": exam_in.title,
        "topic": exam_in.topic,
        "difficulty": exam_in.difficulty,
        "duration": exam_in.duration,
        "num_questions": exam_in.num_questions,
        "created_at": datetime.now().isoformat(),
        "proctoring_enabled": getattr(exam_in, 'proctoring_enabled', True),
        "proctoring_type": getattr(exam_in, 'proctoring_type', 'video'),
        "passing_score": getattr(exam_in, 'passing_score', 50),
        "questions": questions
    }
    
    with EXAMS_LOCK:
        exams = get_all_exams()
        # get_all_exams returns reversed list, we need to reverse it back to append at the end
        original_order = list(reversed(exams))
        original_order.append(new_exam)
        
        with open(EXAMS_FILE, "w") as f:
            json.dump(original_order, f, indent=4)
            
    return new_exam

def get_all_exams() -> List[Dict]:
    _ensure_storage()
    with EXAMS_LOCK:
        with open(EXAMS_FILE, "r") as f:
            exams = json.load(f)
        return list(reversed(exams))

def get_exam_by_id(exam_id: str) -> Dict | None:
    exams = get_all_exams()
    for e in exams:
        if e["id"] == exam_id:
            return e
    return None

def delete_exam(exam_id: str) -> bool:
    with EXAMS_LOCK:
        exams = get_all_exams()
        new_exams = [e for e in exams if e["id"] != exam_id]
        if len(new_exams) == len(exams):
            return False
        
        with open(EXAMS_FILE, "w") as f:
            json.dump(list(reversed(new_exams)), f, indent=4)
        return True

def update_exam(exam_id: str, updates: dict) -> bool:
    with EXAMS_LOCK:
        exams = get_all_exams()
        updated = False
        for i, e in enumerate(exams):
            if e["id"] == exam_id:
                exams[i].update(updates)
                updated = True
                break
                
        if updated:
            with open(EXAMS_FILE, "w") as f:
                json.dump(list(reversed(exams)), f, indent=4)
            return True
        return False

def get_exams_with_candidate_counts() -> List[Dict]:
    """Returns each exam along with candidate assignment counts."""
    from app.candidates.service import get_all_candidates
    exams = get_all_exams()
    candidates = get_all_candidates()

    result = []
    for exam in exams:
        assigned = [c for c in candidates if c.get("assigned_exam_id") == exam["id"]]
        completed_cands = [c for c in assigned if c.get("status", "").lower() == "completed"]
        
        passing_score_pct = exam.get("passing_score", 50)
        
        passed = 0
        failed = 0
        eliminated = 0
        
        for c in completed_cands:
            vios = int(c.get("violations", "0") or 0)
            if vios >= 3:
                eliminated += 1
                # Usually eliminated counts as failed, but we mark it separately if they hit the cap
                failed += 1 
            else:
                try:
                    score = float(c.get("score", "0") or 0)
                    total = float(c.get("total_questions", "1") or 1)
                    if (score / total * 100) >= passing_score_pct:
                        passed += 1
                    else:
                        failed += 1
                except:
                    failed += 1

        result.append({
            "id": exam["id"],
            "title": exam["title"],
            "difficulty": exam["difficulty"],
            "total_assigned": len(assigned),
            "completed": len(completed_cands),
            "live": len([c for c in assigned if c.get("status", "").lower() == "live"]),
            "not_started": len([c for c in assigned if c.get("status", "").lower() not in ("completed", "live")]),
            "passed": passed,
            "failed": failed,
            "eliminated": eliminated,
            "passing_score": passing_score_pct,
            "link_expiry": exam.get("link_expiry"),
            "auto_delete": exam.get("auto_delete"),
            "proctoring_enabled": exam.get("proctoring_enabled", True),
            "proctoring_type": exam.get("proctoring_type", "video")
        })
    return result

def check_and_delete_expired_exams():
    """Background task to delete exams that have expired based on auto_delete."""
    _ensure_storage()
    with EXAMS_LOCK:
        with open(EXAMS_FILE, "r") as f:
            exams = json.load(f)
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        remaining_exams = []
        deleted_any = False
        
        for exam in exams:
            auto_delete_str = exam.get("auto_delete")
            if auto_delete_str:
                try:
                    expiry = datetime.fromisoformat(auto_delete_str.replace("Z", "+00:00"))
                    if now > expiry:
                        print(f"INFO: Auto-deleting expired exam: {exam.get('title')} ({exam.get('id')})")
                        deleted_any = True
                        continue
                except Exception as e:
                    print(f"ERROR: Failed to parse auto_delete for exam {exam.get('id')}: {e}")
            
            remaining_exams.append(exam)
            
        if deleted_any:
            with open(EXAMS_FILE, "w") as f:
                json.dump(remaining_exams, f, indent=4)
            print(f"INFO: Cleaned up expired exams. {len(remaining_exams)} exams remaining.")
