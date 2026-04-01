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
import random
from sqlalchemy.orm import Session
from app.models import Exam, Candidate, ExamInvitation

def _get_path(filename: str) -> str:
    """Helper to get absolute path for a bank file."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        cwd_fallback = os.path.join(os.getcwd(), "backend", "app", filename)
        if os.path.exists(cwd_fallback):
             return cwd_fallback
    return path

def _read_bank() -> List[Dict]:
    """Read questions from both standard and programming advanced banks."""
    bank_files = ["question_bank.json", "programming_advanced.json"]
    combined_bank = []
    
    for filename in bank_files:
        path = _get_path(filename)
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        combined_bank.extend(data)
            except Exception as e:
                print(f"ERROR: Failed to read {filename}: {e}", flush=True)
    
    return combined_bank

def _write_bank(combined_bank: List[Dict]) -> bool:
    """Split and save questions back into their respective files with robust category matching."""
    prog_qs = [q for q in combined_bank if (q.get("category") or "").strip().lower() == 'programming (advanced)']
    std_qs = [q for q in combined_bank if (q.get("category") or "").strip().lower() != 'programming (advanced)']
    
    success = True
    # Save standard bank
    try:
        with open(_get_path("question_bank.json"), "w", encoding="utf-8") as f:
            json.dump(std_qs, f, indent=2)
    except: success = False
    
    # Save programming bank
    try:
        with open(_get_path("programming_advanced.json"), "w", encoding="utf-8") as f:
            json.dump(prog_qs, f, indent=2)
    except: success = False
    
    return success

def get_bank_categories(db: Session = None) -> List[str]:
    """Get unique categories from the inbuilt question bank and database."""
    bank = _read_bank()
    bank_cats = set(q.get("category", "General") for q in bank if q.get("category"))
    
    if db:
        from app.models import QuestionCategory
        db_cats = [c.name for c in db.query(QuestionCategory).all()]
        bank_cats.update(db_cats)
        
    return sorted(list(bank_cats))

def get_bank_stats(db: Session = None) -> List[Dict]:
    """Get category-wise stats (count, marks) from the question bank including empty ones from DB."""
    bank = _read_bank()
    stats_map = {}
    
    # Pre-populate with all known categories from DB if session provided
    if db:
        from app.models import QuestionCategory
        all_cats = db.query(QuestionCategory).all()
        for c in all_cats:
            stats_map[c.name] = {"count": 0, "total_marks": 0.0}
    
    # Feed from bank
    for q in bank:
        cat = q.get("category", "General")
        if cat not in stats_map:
            stats_map[cat] = {"count": 0, "total_marks": 0.0}
        stats_map[cat]["count"] += 1
        stats_map[cat]["total_marks"] += float(q.get("marks", 0.0))
    
    # Convert map to list
    stats_list = []
    for cat, data in stats_map.items():
        stats_list.append({
            "category": cat,
            "count": data["count"],
            "total_marks": round(data["total_marks"], 2)
        })
    return sorted(stats_list, key=lambda x: x["category"])

def get_bank_questions(categories: List[str], difficulty: str, count: int, configs: Dict = None) -> List[Dict]:
    """Fetch questions from bank based on multiple categories and difficulty."""
    bank = _read_bank()
    all_selected = []
    
    # If no specific configs, fall back to balanced approach
    if not configs:
        # Original logic for balanced selection
        # If no categories, get all
        if not categories:
            filtered = bank
        else:
            filtered = [q for q in bank if q.get("category") in categories]
        
        # Optional difficulty filter
        if difficulty and difficulty.lower() != "mixed":
            diff_filtered = [q for q in filtered if q.get("difficulty", "").lower() == difficulty.lower()]
            # If we have enough with specific difficulty, use them. Otherwise fallback to categories-only.
            if len(diff_filtered) >= count:
                filtered = diff_filtered
                
        # Shuffle and pick
        random.shuffle(filtered)
        all_selected = filtered[:count]
    else:
        print(f"DEBUG: Processing configs: {configs}", flush=True)
        for cat in categories:
            cfg = configs.get(cat, {})
            cat_count = int(cfg.get("count", 0))
            cat_total_marks = float(cfg.get("total_marks", cfg.get("marks", 0.0)))
            print(f"DEBUG: Category {cat} - Count: {cat_count}, Marks: {cat_total_marks}", flush=True)
            
            if cat_count <= 0:
                continue

            # NEW: Filter by category only. We'll pick difficulty-appropriate ones if they exist, 
            # but we won't fail the count just because of difficulty.
            cat_qs = [q for q in bank if q.get("category", "General").lower() == cat.lower()]
            
            # Prefer matching difficulty but fall back to any in category to satisfy count
            if difficulty and difficulty.lower() != "mixed":
                pref_qs = [q for q in cat_qs if q.get("difficulty", "").lower() == difficulty.lower()]
                other_qs = [q for q in cat_qs if q.get("difficulty", "").lower() != difficulty.lower()]
            else:
                pref_qs = []
                other_qs = cat_qs
            
            combined_qs = pref_qs + other_qs
            random.shuffle(combined_qs)
            
            selected_for_cat = combined_qs[:cat_count]
            
            # NEW: Support for explicit mark breakdown (e.g. 5 questions of 1 mark, 3 of 2, etc.)
            breakdown = cfg.get("breakdown", {})
            if breakdown:
                # Flat list of marks to assign, e.g. [1, 1, 1, 2, 2, 3]
                marks_to_assign = []
                for m_val, m_qty in breakdown.items():
                    try:
                        val = float(m_val)
                        qty = int(m_qty)
                        marks_to_assign.extend([val] * qty)
                    except: continue
                
                # Assign in order to our selected questions
                for i, s in enumerate(selected_for_cat):
                    if i < len(marks_to_assign):
                        s["marks"] = marks_to_assign[i]
                    else:
                        s["marks"] = 1.0 # Fallback
            
            # Intelligent Mark Distribution (Legacy or if no breakdown provided):
            elif cat_total_marks > 0:
                # Calculate base marks per question (whole number)
                base_marks = int(cat_total_marks // cat_count)
                # Remainder to distribute (e.g., 2 if 12 marks and 5 questions)
                remainder = int(cat_total_marks % cat_count)
                # Any fractional decimal (e.g., .5 if 10.5 marks)
                decimal_part = round(cat_total_marks - (base_marks * cat_count + remainder), 2)
                
                for i, s in enumerate(selected_for_cat):
                    # Start with base
                    q_marks = float(base_marks)
                    
                    # Add one point if we are within the remainder index
                    if i < remainder:
                        q_marks += 1.0
                    
                    # If there's a decimal, add it to the very first question
                    if i == 0 and decimal_part > 0:
                        q_marks += decimal_part
                        
                    s["marks"] = round(q_marks, 2)
            else:
                for s in selected_for_cat:
                    s["marks"] = 1.0
            
            all_selected.extend(selected_for_cat)

    return all_selected

def get_bank_questions_by_category(category_name: str) -> List[Dict]:
    """Get all questions in a specific category from the bank."""
    bank = _read_bank()
    if not category_name:
        return bank
    return [q for q in bank if q.get('category', '').lower() == category_name.lower()]

def update_bank_question(q_id: str, updated_q: Dict) -> bool:
    """Update a specific question in the bank by its q_id."""
    bank = _read_bank()
    found = False
    for i, q in enumerate(bank):
        if q.get('q_id') == q_id:
            # Preserve q_id if not provided in updated_q
            if 'q_id' not in updated_q:
                updated_q['q_id'] = q_id
            bank[i] = updated_q
            found = True
            break
    
    if not found:
        return False
        
    return _write_bank(bank)

def delete_bank_question(q_id: str) -> bool:
    """Delete a specific question from the bank by its q_id, unless it's protected."""
    bank = _read_bank()
    
    # Safety Check: Robust case-insensitive and trimmed check
    target_q = next((q for q in bank if q.get('q_id') == q_id), None)
    if target_q:
        cat = (target_q.get('category') or "").strip().lower()
        if cat == 'programming (advanced)':
            print(f"DEBUG: Prevented deletion of protected programming question: {q_id}")
            return False
        
    new_bank = [q for q in bank if q.get('q_id') != q_id]
    
    if len(new_bank) == len(bank):
        return False # No question was removed
        
    return _write_bank(new_bank)

def add_to_bank(question: Dict) -> bool:
    """Add a single question to the bank."""
    if 'q_id' not in question:
        import uuid
        question['q_id'] = str(uuid.uuid4())[:8]
    bank = _read_bank()
    bank.append(question)
    return _write_bank(bank)

def upload_to_bank(questions: List[Dict]) -> bool:
    """Bulk upload questions to the bank."""
    bank = _read_bank()
    bank.extend(questions)
    return _write_bank(bank)

def delete_bank_category(category_name: str) -> bool:
    """Delete a category and all its questions from the bank."""
    if category_name.lower() == "programming (advanced)":
        return False # This category is protected
        
    bank = _read_bank()
    new_bank = [q for q in bank if q.get('category', '').lower() != category_name.lower()]
    return _write_bank(new_bank)

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
        - Format: [{{"text": "...", "options": [{{"text": "...", "is_correct": true}}, ...], "category": "Skill Area", "explanation": "..."}}]
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

def _generate_mock_questions(topic: str, difficulty: str, count: int, source: str = "ai") -> List[Dict]:
    """Generates questions using QuizAPI, then Gemini, then high-quality templates.
    Uses Redis to cache results for faster subsequent loads.
    """
    from app.core.redis import get_cached_data, set_cached_data
    
    cache_key = f"exam_questions:{topic.lower().replace(' ', '_')}:{difficulty.lower()}:{count}:{source}"
    cached = get_cached_data(cache_key)
    if cached:
        print(f"INFO: Loading questions from Redis cache for {topic}")
        return cached

    # 1. Try QuizAPI
    questions = _generate_with_quiz_api(topic, difficulty, count)
    
    # 2. Try Gemini
    if not questions and source == "ai":
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
    if getattr(exam_in, 'source', 'AI').lower() == 'bank':
        return get_bank_questions(
            getattr(exam_in, 'bank_categories', []) or [],
            exam_in.difficulty,
            exam_in.num_questions,
            getattr(exam_in, 'category_configs', {})
        )
    return _generate_mock_questions(exam_in.topic, exam_in.difficulty, exam_in.num_questions, 'ai')

def _to_summary_dict(exam: Exam) -> Dict:
    """Lightweight mapping for list views (excludes heavy JSON questions)."""
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
        "proctoring_type": exam.proctoring_type,
        "proctoring_enabled": exam.proctoring_enabled,
        "passing_score": exam.passing_score,
        "calculator_enabled": exam.calculator_enabled,
        "notes_enabled": exam.notes_enabled,
        "proctoring_link": exam.proctoring_link,
        "supplement_flag": exam.supplement_flag,
    }

def _to_full_dict(exam: Exam) -> Dict:
    """Full mapping including all questions."""
    if not exam: return None
    data = _to_summary_dict(exam)
    data["questions"] = exam.questions or []
    return data

def save_exam(db: Session, exam_in: ExamFinalize) -> Dict:
    from app.core.redis import redis_client
    new_exam = Exam(
        id=str(uuid.uuid4()),
        title=exam_in.title,
        topic=exam_in.topic,
        difficulty=exam_in.difficulty,
        duration=exam_in.duration,
        num_questions=len(exam_in.questions),
        created_at=datetime.now().isoformat(),
        link_expiry=exam_in.link_expiry,
        auto_delete=exam_in.auto_delete,
        proctoring_enabled=exam_in.proctoring_enabled,
        proctoring_type=exam_in.proctoring_type,
        passing_score=exam_in.passing_score,
        calculator_enabled=exam_in.calculator_enabled,
        notes_enabled=exam_in.notes_enabled,
        proctoring_link=exam_in.proctoring_link,
        supplement_flag=exam_in.supplement_flag,
        questions=[q.dict() for q in exam_in.questions]
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    
    # Invalidate cache
    if redis_client:
        redis_client.delete("all_exams_list", "exams_with_counts", "all_candidates_list_summary")
        
    return _to_full_dict(new_exam)

def create_exam(db: Session, exam_in: ExamCreate) -> Dict:
    from app.core.redis import redis_client
    questions = _generate_mock_questions(exam_in.topic, exam_in.difficulty, exam_in.num_questions)
    
    new_exam = Exam(
        id=str(uuid.uuid4()),
        title=exam_in.title,
        topic=exam_in.topic,
        difficulty=exam_in.difficulty,
        duration=exam_in.duration,
        num_questions=len(questions),
        created_at=datetime.now().isoformat(),
        proctoring_enabled=getattr(exam_in, 'proctoring_enabled', True),
        proctoring_type=getattr(exam_in, 'proctoring_type', 'video'),
        passing_score=getattr(exam_in, 'passing_score', 50),
        calculator_enabled=getattr(exam_in, 'calculator_enabled', False),
        notes_enabled=getattr(exam_in, 'notes_enabled', False),
        proctoring_link=getattr(exam_in, 'proctoring_link', None),
        supplement_flag=getattr(exam_in, 'supplement_flag', False),
        questions=questions
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    
    if redis_client:
        redis_client.delete("all_exams_list", "exams_with_counts", "all_candidates_list_summary")
        
    return _to_full_dict(new_exam)

def get_all_exams(db: Session, bypass_cache: bool = False) -> List[Dict]:
    from app.core.redis import get_cached_data, set_cached_data
    
    if not bypass_cache:
        cached = get_cached_data("all_exams_list")
        if cached:
            return cached

    from sqlalchemy.orm import defer
    exams = db.query(Exam).options(defer(Exam.questions)).order_by(Exam.created_at.desc()).all()
    res = [_to_summary_dict(e) for e in exams]
    
    set_cached_data("all_exams_list", res, expire=300)
    return res

def get_exam_by_id(db: Session, exam_id: str) -> Dict | None:
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    return _to_full_dict(exam)

def duplicate_exam(db: Session, exam_id: str) -> Dict | None:
    from app.core.redis import redis_client
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        return None
        
    new_exam = Exam(
        id=str(uuid.uuid4()),
        title=f"Copy of {exam.title}",
        topic=exam.topic,
        difficulty=exam.difficulty,
        duration=exam.duration,
        num_questions=exam.num_questions,
        created_at=datetime.now().isoformat(),
        link_expiry=exam.link_expiry,
        auto_delete=exam.auto_delete,
        proctoring_enabled=exam.proctoring_enabled,
        proctoring_type=exam.proctoring_type,
        passing_score=exam.passing_score,
        calculator_enabled=exam.calculator_enabled,
        notes_enabled=exam.notes_enabled,
        proctoring_link=exam.proctoring_link,
        supplement_flag=exam.supplement_flag,
        questions=exam.questions # JSON is safe to copy
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    
    if redis_client:
        redis_client.delete("all_exams_list", "exams_with_counts", "all_candidates_list_summary")
        
    return _to_full_dict(new_exam)

def delete_exam(db: Session, exam_id: str) -> bool:
    from app.core.redis import redis_client
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if exam:
        db.delete(exam)
        db.commit()
        if redis_client:
            redis_client.delete("all_exams_list", "exams_with_counts", "all_candidates_list", "all_candidates_list_summary")
        return True
    return False

def update_exam(db: Session, exam_id: str, updates: dict) -> bool:
    from app.core.redis import redis_client
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if exam:
        for k, v in updates.items():
            if hasattr(exam, k):
                setattr(exam, k, v)
        db.commit()
        if redis_client:
            redis_client.delete("all_exams_list", "exams_with_counts")
        return True
    return False

def get_exams_with_candidate_counts(db: Session, bypass_cache: bool = False) -> List[Dict]:
    """Returns each exam along with candidate assignment counts. Cached for speed."""
    from app.core.redis import get_cached_data, set_cached_data
    
    if not bypass_cache:
        cached = get_cached_data("exams_with_counts")
        if cached:
            print("INFO: Loading dashboard stats from Redis cache")
            return cached

    from app.candidates.service import get_all_candidates
    from sqlalchemy import func
    
    # Always get fresh exams and candidates for dashboard stats
    exams = get_all_exams(db, bypass_cache=True)
    candidates = get_all_candidates(db, bypass_cache=True)
    
    # Get invite counts per exam (unique emails only)
    invite_rows = db.query(
        ExamInvitation.exam_id, 
        func.count(func.distinct(ExamInvitation.email))
    ).group_by(ExamInvitation.exam_id).all()
    invite_counts = {row[0]: row[1] for row in invite_rows}

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
        
        total_incorrect = 0
        for c in completed_cands:
            vios = int(float(c.get("violations", "0") or 0)) 
            if vios >= 3:
                eliminated += 1
                failed += 1 
            else:
                try:
                    score = float(c.get("score", "0") or 0)
                    total_qs = float(c.get("total_questions") or 1)
                    total_incorrect += (total_qs - score)
                    
                    # Prefer total_marks for weighted scoring, fallback to total_questions for pass/fail check
                    total_m = float(c.get("total_marks") or c.get("total_questions") or 1)
                    if (score / total_m * 100) >= passing_score_pct:
                        passed += 1
                    else:
                        failed += 1
                except:
                    failed += 1

        avg_incorrect = round(total_incorrect / len(completed_cands), 1) if completed_cands else 0

        result.append({
            "id": exam["id"],
            "title": exam["title"],
            "topic": exam.get("topic") or "",
            "difficulty": exam["difficulty"],
            "duration": exam.get("duration") or 0,
            "num_questions": exam.get("num_questions") or 0,
            "total_assigned": len(assigned),
            "completed": len(completed_cands),
            "live": len([c for c in assigned if c.get("status", "").lower() == "live"]),
            "not_started": len([c for c in assigned if c.get("status", "").lower() not in ("completed", "live")]),
            "total_invited": invite_counts.get(exam["id"], 0),
            "passed": passed,
            "failed": failed,
            "eliminated": eliminated,
            "total_incorrect": int(total_incorrect),
            "avg_incorrect": avg_incorrect,
            "passing_score": passing_score_pct,
            "link_expiry": exam.get("link_expiry"),
            "auto_delete": exam.get("auto_delete"),
            "proctoring_enabled": exam.get("proctoring_enabled", True),
            "proctoring_type": exam.get("proctoring_type", "video")
        })
    
    set_cached_data("exams_with_counts", result, expire=300)
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
    return deleted_any

def get_invitation_tracking(db: Session):
    """Returns detailed tracking of who was invited and if they sat for the exam."""
    exams = db.query(Exam).all()
    
    result = []
    for exam in exams:
        invitations = db.query(ExamInvitation).filter(ExamInvitation.exam_id == exam.id).all()
        candidates = db.query(Candidate).filter(Candidate.assigned_exam_id == exam.id).all()
        
        # Build map of email to candidate status for faster lookup
        # Some candidates might be enrolled without invitation (public link), 
        # but we only care about those who WERE invited for this specific report.
        enrolled_status_map = {c.email.lower(): c.status for c in candidates}
        
        invitation_details = []
        unique_invites = {}
        for inv in invitations:
            email_lower = inv.email.lower()
            # If multiple records exist, keep only the latest one
            if email_lower not in unique_invites or inv.sent_at > unique_invites[email_lower].sent_at:
                unique_invites[email_lower] = inv

        sat_count = 0
        not_sat_count = 0
        sent_by_counts = {}
        
        for email_lower, inv in unique_invites.items():
            if email_lower in enrolled_status_map:
                status = "Sat"
                sat_count += 1
                cand_status = enrolled_status_map[email_lower]
                detail_status = f"Sat ({cand_status})"
            else:
                status = "Not Sat"
                not_sat_count += 1
                detail_status = "Not Sat"
                
            admin_nm = getattr(inv, "admin_name", None)
            display_admin = admin_nm if admin_nm else "Admin"
            sent_by_counts[display_admin] = sent_by_counts.get(display_admin, 0) + 1
                
            invitation_details.append({
                "email": inv.email,
                "sent_at": inv.sent_at,
                "status": detail_status,
                "admin_name": admin_nm
            })
            
        result.append({
            "exam_id": exam.id,
            "exam_title": exam.title,
            "total_invited": len(unique_invites),
            "sat_count": sat_count,
            "not_sat_count": not_sat_count,
            "sent_by_counts": sent_by_counts,
            "details": invitation_details
        })
    return result

def delete_category_questions(category_name: str) -> bool:
    """Remove all questions belonging to a specific category from the bank JSON."""
    bank = _read_bank()
    if not bank: return True
    initial_len = len(bank)
    bank = [q for q in bank if q.get("category") != category_name]
    
    if len(bank) < initial_len:
        bank_path = os.path.join(os.path.dirname(__file__), "..", "question_bank.json")
        try:
            with open(bank_path, "w", encoding="utf-8") as f:
                json.dump(bank, f, indent=4)
            return True
        except:
            return False
    return True
