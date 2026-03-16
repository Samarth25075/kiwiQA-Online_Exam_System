import os
import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional
from app.exams.schemas import ExamCreate, ExamFinalize, Question, Option
import google.genai as new_genai
from google.genai import types as genai_types
from app.core.config import GOOGLE_API_KEY, QUIZ_API_KEY
import requests
from sqlalchemy.orm import Session
from app.models import Exam

def _generate_with_quiz_api(topic: str, difficulty: str, count: int) -> Optional[List[Dict]]:
    """Generate questions using QuizAPI.io."""
    if not QUIZ_API_KEY:
        return None
        
    try:
        url = "https://quizapi.io/api/v1/questions"
        params = {
            "api_key": QUIZ_API_KEY, # Use api_key (with underscore)
            "limit": count,
            "difficulty": difficulty.upper() if difficulty else "MEDIUM"
        }
        
        # Add topic as tag
        if topic:
            params["tags"] = topic
            
        print(f"DEBUG: Fetching questions for topic: {topic} from QuizAPI...")
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"ERROR: QuizAPI failed ({response.status_code}): {response.text[:200]}")
            return None
            
        result = response.json()
        # The new schema returns {"success": true, "data": [...]}
        data = result.get("data", [])
        if not data and isinstance(result, list):
            data = result # Fallback to old flat list schema
            
        if not data:
            return None
            
        questions = []
        for q in data:
            raw_text = q.get("text", q.get("question", "Untitled Question"))
            raw_options = q.get("options", [])
            raw_explanation = q.get("explanation", "Professional technical explanation.")
            
            options = []
            if isinstance(raw_options, list):
                for opt in raw_options:
                    opt_text = opt.get("text", "")
                    # Match both 'isCorrect' and 'is_correct'
                    is_correct = bool(opt.get("isCorrect", opt.get("is_correct", False)))
                    if opt_text:
                        options.append({"text": opt_text, "is_correct": is_correct})
            
            # Legacy schema support (answers dict)
            elif isinstance(q.get("answers"), dict):
                answers = q.get("answers", {})
                correct_answers = q.get("correct_answers", {})
                for key, val in answers.items():
                    if val:
                        is_c = correct_answers.get(f"{key}_correct") == "true" or correct_answers.get(f"{key}_correct") is True
                        options.append({"text": val, "is_correct": is_c})

            if not options: continue
            
            # Ensure at least one correct answer
            if not any(o["is_correct"] for o in options):
                options[0]["is_correct"] = True
                
            questions.append({
                "text": raw_text,
                "options": options,
                "explanation": raw_explanation
            })
            
        return questions if questions else None
    except Exception as e:
        print(f"ERROR: QuizAPI generation failed: {e}")
        return None

def _generate_with_gemini(topic: str, difficulty: str, count: int) -> Optional[List[Dict]]:
    """Actually use Google Gemini to generate questions."""
    if not GOOGLE_API_KEY:
        return None
        
    try:
        # Use standard initialization
        client = new_genai.Client(api_key=GOOGLE_API_KEY)
        
        # Try a few models in order of capability
        models_to_try = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro']
        selected_model = None
        
        for m in models_to_try:
            try:
                # Probe with a very tiny request
                client.models.generate_content(model=m, contents="ok", config=genai_types.GenerateContentConfig(max_output_tokens=1))
                selected_model = m
                break
            except: continue
            
        if not selected_model: return None
        
        prompt = f"""
        TASK: Generate {count} technical Multiple Choice Questions for the topic: "{topic}".
        LEVEL: {difficulty}
        
        REQUIREMENTS:
        - Return ONLY a JSON array.
        - No markdown formatting (no ```json).
        - Format: [{{"text": "...", "options": [{{"text": "...", "is_correct": true}}, ...], "explanation": "..."}}]
        """
        
        response = client.models.generate_content(
            model=selected_model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=4000,
            )
        )
        
        text = response.text.strip()
        # Clean potential markdown
        text = text.replace('```json', '').replace('```', '').strip()
        
        # robust extraction
        start = text.find('[')
        end = text.rfind(']')
        if start != -1 and end != -1:
            text = text[start:end+1]

        questions = json.loads(text)
        return questions[:count] if isinstance(questions, list) else None
    except Exception as e:
        print(f"ERROR: AI Generation failed: {e}")
        return None

def _generate_mock_questions(topic: str, difficulty: str, count: int) -> List[Dict]:
    """Generates questions using QuizAPI, then Gemini, then high-quality templates.
    Uses Redis to cache results for faster subsequent loads.
    """
    from app.core.redis import get_cached_data, set_cached_data
    
    cache_key = f"exam_questions:{topic.lower().replace(' ', '_')}:{difficulty.lower()}:{count}"
    cached = get_cached_data(cache_key)
    if cached:
        print(f"INFO: Loading questions from Redis cache for {topic}")
        return cached

    # 1. Try QuizAPI
    questions = _generate_with_quiz_api(topic, difficulty, count)
    
    # 2. Try Gemini
    if not questions:
        questions = _generate_with_gemini(topic, difficulty, count)
        
    if not questions: questions = []
    
    # FINAL FALLBACK: If AI is completely offline, use technical templates instead of generic ones
    remaining = count - len(questions)
    if remaining > 0:
        tech_fallbacks = [
            f"Which architectural principle is most critical for a scaled {topic} implementation?",
            f"When optimizing {topic}, which of the following provides the best performance gain?",
            f"In a {difficulty} scenario, how would you handle a memory leak in {topic}?",
            f"What is the industry standard approach for securing a {topic} production environment?",
            f"Identify the most common anti-pattern when developing with {topic}.",
            f"How does {topic} handle asynchronous operations at an advanced level?"
        ]
        
        for i in range(remaining):
            tpl = tech_fallbacks[i % len(tech_fallbacks)]
            questions.append({
                "text": tpl,
                "options": [
                    {"text": f"Standard {topic} optimization protocols", "is_correct": True},
                    {"text": "Legacy procedural approaches", "is_correct": False},
                    {"text": "Generic implementation without tuning", "is_correct": False},
                    {"text": "Third-party non-standard modules", "is_correct": False}
                ],
                "explanation": f"This question focuses on professional standards for {topic}."
            })
    
    res = questions[:count]
    # Cache for 24 hours
    set_cached_data(cache_key, res, expire=86400)
    return res
    
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
            
    # Load from JSON file as backup - Removed since we're using dynamic templates only if AI fails
    
    # Final Deduplication
    final_unique = []
    seen = set()
    for q in questions:
        norm = q["text"].strip().lower()
        if norm not in seen:
            final_unique.append(q)
            seen.add(norm)
    questions = final_unique
        
    # Fill remaining with dynamic templates to ensure "num_questions" is met
    # Ensuring variety even without AI
    remaining = count - len(questions)
    if remaining <= 0:
        return questions[:count]
        
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
    random.shuffle(questions)
    return questions[:count]

def generate_questions(exam_in: ExamCreate) -> List[Dict]:
    return _generate_mock_questions(exam_in.topic, exam_in.difficulty, exam_in.num_questions)

def _to_dict(exam: Exam) -> Dict:
    if not exam: return None
    return {
        "id": exam.id,
        "title": exam.title,
        "topic": exam.topic,
        "difficulty": exam.difficulty,
        "duration": exam.duration,
        "num_questions": exam.num_questions,
        "created_at": exam.created_at,
        "link_expiry": exam.link_expiry,
        "auto_delete": exam.auto_delete,
        "proctoring_enabled": exam.proctoring_enabled,
        "proctoring_type": exam.proctoring_type,
        "passing_score": exam.passing_score,
        "questions": exam.questions
    }

def save_exam(db: Session, exam_in: ExamFinalize) -> Dict:
    new_exam = Exam(
        id=str(uuid.uuid4()),
        title=exam_in.title,
        topic=exam_in.topic,
        difficulty=exam_in.difficulty,
        duration=exam_in.duration,
        num_questions=exam_in.num_questions,
        created_at=datetime.now().isoformat(),
        link_expiry=exam_in.link_expiry,
        auto_delete=exam_in.auto_delete,
        proctoring_enabled=exam_in.proctoring_enabled,
        proctoring_type=exam_in.proctoring_type,
        passing_score=exam_in.passing_score,
        questions=[q.dict() for q in exam_in.questions]
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return _to_dict(new_exam)

def create_exam(db: Session, exam_in: ExamCreate) -> Dict:
    questions = _generate_mock_questions(exam_in.topic, exam_in.difficulty, exam_in.num_questions)
    
    new_exam = Exam(
        id=str(uuid.uuid4()),
        title=exam_in.title,
        topic=exam_in.topic,
        difficulty=exam_in.difficulty,
        duration=exam_in.duration,
        num_questions=exam_in.num_questions,
        created_at=datetime.now().isoformat(),
        proctoring_enabled=getattr(exam_in, 'proctoring_enabled', True),
        proctoring_type=getattr(exam_in, 'proctoring_type', 'video'),
        passing_score=getattr(exam_in, 'passing_score', 50),
        questions=questions
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return _to_dict(new_exam)

def get_all_exams(db: Session) -> List[Dict]:
    # Changed internal sorting based on created_at or just id desc
    exams = db.query(Exam).order_by(Exam.created_at.desc()).all()
    return [_to_dict(e) for e in exams]

def get_exam_by_id(db: Session, exam_id: str) -> Dict | None:
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    return _to_dict(exam)

def delete_exam(db: Session, exam_id: str) -> bool:
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if exam:
        db.delete(exam)
        db.commit()
        return True
    return False

def update_exam(db: Session, exam_id: str, updates: dict) -> bool:
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if exam:
        for k, v in updates.items():
            if hasattr(exam, k):
                setattr(exam, k, v)
        db.commit()
        return True
    return False

def get_exams_with_candidate_counts(db: Session) -> List[Dict]:
    """Returns each exam along with candidate assignment counts."""
    from app.candidates.service import get_all_candidates
    exams = get_all_exams(db)
    candidates = get_all_candidates(db)

    from collections import defaultdict
    candidates_by_exam = defaultdict(list)
    for c in candidates:
        exam_id = c.get("assigned_exam_id")
        if exam_id:
            candidates_by_exam[exam_id].append(c)

    result = []
    for exam in exams:
        assigned = candidates_by_exam.get(exam["id"], [])
        completed_cands = [c for c in assigned if c.get("status", "").lower() == "completed"]
        
        passing_score_pct = exam.get("passing_score", 50)
        
        passed = 0
        failed = 0
        eliminated = 0
        
        for c in completed_cands:
            vios = int(float(c.get("violations", "0") or 0)) 
            if vios >= 3:
                eliminated += 1
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

def check_and_delete_expired_exams(db: Session):
    """Background task to delete exams that have expired based on auto_delete."""
    exams = db.query(Exam).all()
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    deleted_any = False
    for exam in exams:
        auto_delete_str = exam.auto_delete
        if auto_delete_str:
            try:
                expiry = datetime.fromisoformat(auto_delete_str.replace("Z", "+00:00"))
                if now > expiry:
                    print(f"INFO: Auto-deleting expired exam: {exam.title} ({exam.id})")
                    db.delete(exam)
                    deleted_any = True
            except Exception as e:
                print(f"ERROR: Failed to parse auto_delete for exam {exam.id}: {e}")
                
    if deleted_any:
        db.commit()
