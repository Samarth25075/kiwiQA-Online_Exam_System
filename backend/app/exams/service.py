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
            "apiKey": QUIZ_API_KEY,
            "limit": count,
            "difficulty": difficulty.capitalize() if difficulty else "Medium"
        }
        
        # Map topics to QuizAPI categories/tags if possible
        category_map = {
            "linux": "linux",
            "bash": "bash",
            "docker": "docker",
            "sql": "sql",
            "mysql": "mysql",
            "cms": "cms",
            "code": "code",
            "devops": "devops"
        }
        
        topic_lower = topic.lower()
        if topic_lower in category_map:
            params["category"] = category_map[topic_lower]
        else:
            params["tags"] = topic
            
        response = requests.get(url, params=params, timeout=10)
        if response.status_code != 200:
            print(f"ERROR: QuizAPI failed with code {response.status_code}: {response.text}")
            return None
            
        data = response.json()
        if not isinstance(data, list):
            return None
            
        questions = []
        for q in data:
            options = []
            answers = q.get("answers", {})
            correct_answers = q.get("correct_answers", {})
            
            # QuizAPI provides answers as answer_a, answer_b, etc.
            # and correctness as answer_a_correct, etc.
            for key, val in answers.items():
                if val:
                    is_correct = correct_answers.get(f"{key}_correct") == "true"
                    options.append({"text": val, "is_correct": is_correct})
            
            if not options: continue
            
            # Ensure at least one correct answer
            if not any(o["is_correct"] for o in options):
                options[0]["is_correct"] = True
                
            questions.append({
                "text": q.get("question", "Untitled Question"),
                "options": options,
                "explanation": q.get("explanation") or "No explanation provided."
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
        PERSONA: You are a professional subject matter expert and examination designer with 20 years of experience in creating high-stakes technical recruitment assessments.
        
        TASK: Design a rigorous {difficulty} level technical assessment for the topic: "{topic}".
        COUNT: Generate exactly {count} distinct Multiple Choice Questions (MCQs).

        QUALITY STANDARDS:
        1. **Strict Relevance**: Every single question MUST be directly and strictly related to "{topic}". Do not deviate into other areas.
        2. **Technical Depth**: Questions must test deep conceptual understanding and practical problem-solving, not just definitions.
        3. **Difficulty Alignment**: Each question must be calibrated perfectly for a "{difficulty}" level expert.
        4. **Zero Redundancy**: Ensure 100% variety across all {count} questions. Each must cover a unique facet of "{topic}".
        5. **Professional Distractors**: Options must be technically plausible to a non-expert, making the test challenging and valid.

        MANDATORY OUTPUT FORMAT (JSON ONLY):
        [
          {{
            "text": "Direct and clearly worded technical question...",
            "options": [
              {{"text": "The correct technical answer", "is_correct": true}},
              {{"text": "Plausible technical distractor 1", "is_correct": false}},
              {{"text": "Plausible technical distractor 2", "is_correct": false}},
              {{"text": "Plausible technical distractor 3", "is_correct": false}}
            ],
            "explanation": "A concise technical justification for the correct answer."
          }}
        ]

        STRICT CONSTRAINTS:
        - OUTPUT ONLY THE JSON ARRAY. 
        - DO NOT include markdown formatting like ```json.
        - NO PREAMBLE or post-text.
        - Ensure all technical terms are spelled correctly.
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
    """Simulate AI generation. Picks from QuizAPI first, then Gemini, then fallback."""
    
    # Try QuizAPI first as requested
    questions = _generate_with_quiz_api(topic, difficulty, count)
    
    # If QuizAPI fails or returns nothing, try Gemini
    if not questions:
        print("INFO: QuizAPI returned no questions, falling back to Gemini...")
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
