import uuid
from datetime import datetime
from typing import List, Dict, Optional

def _to_summary_dict(c: Dict) -> Dict:
    """Lightweight mapping for list views (excludes base64/JSON if possible, but includes performance metadata)."""
    if not c: return None
    
    # Calculate incorrect question indices (1-indexed) if answers are available
    incorrect_nums = []
    status = c.get("status", "")
    if status.lower() == "completed" and c.get("answers"):
        try:
            # Calculation logic usually happens in report generation or is stored.
            # Keeping empty for summary list to improve speed.
            pass
        except Exception as e:
            print(f"Error calculating incorrect_nums: {e}")
            
    return {
        "id": str(c.get("id") or c.get("_id")),
        "candidate_id": c.get("candidate_id"),
        "name": c.get("name") or "",
        "email": c.get("email") or "",
        "country_code": c.get("country_code") or "",
        "phone_number": c.get("phone_number") or "",
        "status": c.get("status") or "",
        "joined_date": c.get("joined_date") or "",
        "completed_at": c.get("completed_at") or "",
        "admin_name": c.get("admin_name") or "",
        "token": c.get("token") or "",
        "device_id": c.get("device_id") or "",
        "assigned_exam_id": c.get("assigned_exam_id") or "",
        "exam_title": c.get("exam_title") or "No Exam Assigned",
        "score": c.get("score"),
        "total_questions": c.get("total_questions"),
        "total_marks": c.get("total_marks"),
        "violations": c.get("violations") if c.get("violations") is not None else 0,
        "incorrect_question_nums": c.get("incorrect_question_nums") or []
    }

def _to_full_dict(c: Dict) -> Dict:
    """Full mapping including heavy proctoring and result data."""
    if not c: return None
    data = _to_summary_dict(c)
    data.update({
        "dob": c.get("dob") or "",
        "gender": c.get("gender") or "",
        "address": c.get("address") or "",
        "profile_photo": c.get("profile_photo") or "",
        "cv_url": c.get("cv_url") or "",
        "violation_logs": c.get("violation_logs") or [],
        "answers": c.get("answers") or [],
        "screenshot_start": c.get("screenshot_start") or "",
        "screenshot_mid": c.get("screenshot_mid") or "",
        "screenshot_end": c.get("screenshot_end") or ""
    })
    return data

async def get_all_candidates(db, **kwargs) -> List[Dict]:
    bypass_cache = kwargs.get("bypass_cache", False)
    """Fetch all candidates from DB. Supports bypass_cache for real-time dashboard updates."""
    from app.core.redis import get_cached_data, set_cached_data
    
    # Cache key for summary list
    if not bypass_cache:
        cached = await get_cached_data("all_candidates_list_summary")
        if cached:
            return cached

    # Fetch from MongoDB
    candidates = await db.candidates.find({}).sort("id", -1).to_list(length=2000)
    res = [_to_summary_dict(c) for c in candidates]
    
    await set_cached_data("all_candidates_list_summary", res, expire=300)
    return res

async def create_candidate(db, name: str, email: str, country_code: str = "", phone_number: str = "", dob: str = "", gender: str = "", address: str = "", profile_photo: str = "", cv_url: str = "", device_id: str = "", admin_name: str = "") -> Dict:
    from app.core.redis import redis_client
    current_year = datetime.now().year
    
    # Get highest numeric ID for generation
    highest = await db.candidates.find({}).sort("id", -1).limit(1).to_list(length=1)
    numeric_id = (int(highest[0]["id"]) if highest else 0) + 1
    
    candidate_id_str = f"CAND-{current_year}-{str(numeric_id).zfill(3)}"
    
    new_cand = {
        "id": numeric_id,
        "candidate_id": candidate_id_str,
        "name": name,
        "email": email,
        "country_code": country_code,
        "phone_number": phone_number,
        "dob": dob,
        "gender": gender,
        "address": address,
        "profile_photo": profile_photo,
        "cv_url": cv_url,
        "status": "Not Started",
        "joined_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "admin_name": admin_name,
        "token": str(uuid.uuid4()),
        "assigned_exam_id": None,
        "score": None,
        "total_questions": None,
        "violations": 0,
        "device_id": device_id
    }
    await db.candidates.insert_one(new_cand)
    
    if redis_client:
        await redis_client.delete("all_candidates_list", "exams_with_counts", "all_candidates_list_summary")
        
    return _to_full_dict(new_cand)

async def assign_exam_to_candidate(db, candidate_id: str, exam_id: str) -> Dict | None:
    from app.core.redis import redis_client
    from app.exams.service import get_exam_by_id
    
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return None
        
    exam = await get_exam_by_id(db, exam_id)
    exam_title = exam["title"] if exam else "Unknown Exam"
    
    res = await db.candidates.update_one(
        {"id": cand_id_int}, 
        {"$set": {"assigned_exam_id": exam_id, "exam_title": exam_title}}
    )
    
    if res.modified_count >= 0:
        if redis_client:
            await redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        c = await db.candidates.find_one({"id": cand_id_int})
        return _to_full_dict(c)
    return None

async def get_candidate_by_token(db, token: str) -> Dict | None:
    c = await db.candidates.find_one({"token": token})
    return _to_full_dict(c) if c else None

async def get_candidate_by_token_summary(db, token: str) -> Dict | None:
    """Optimized fetch that avoids loading heavy fields."""
    c = await db.candidates.find_one({"token": token})
    return _to_summary_dict(c) if c else None

async def is_device_used_for_exam(db, device_id: str, exclude_email: str, exam_id: str) -> bool:
    """Direct database check for device usage."""
    count = await db.candidates.count_documents({
        "device_id": device_id,
        "email": {"$ne": exclude_email},
        "assigned_exam_id": exam_id
    })
    return count > 0

async def update_candidate_status(db, token: str, status: str) -> bool:
    from app.core.redis import redis_client
    res = await db.candidates.update_one({"token": token}, {"$set": {"status": status}})
    if res.modified_count > 0:
        if redis_client:
            await redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return True
    return False

async def delete_candidate(db, candidate_id: str) -> bool:
    from app.core.redis import redis_client
    import os
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return False
        
    c = await db.candidates.find_one({"id": cand_id_int})
    if c:
        for attr in ["screenshot_start", "screenshot_mid", "screenshot_end"]:
            url = c.get(attr)
            if url and "/static/uploads/screenshots/" in url:
                file_name = url.split("/")[-1]
                file_path = os.path.join("static", "uploads", "screenshots", file_name)
                if os.path.exists(file_path):
                    try: os.remove(file_path)
                    except: pass
        
        await db.candidates.delete_one({"id": cand_id_int})
        if redis_client:
            await redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return True
    return False

async def update_candidate_details(db, candidate_id: str, data: Dict) -> Dict | None:
    from app.core.redis import redis_client
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return None
        
    res = await db.candidates.update_one({"id": cand_id_int}, {"$set": data})
    if res.modified_count >= 0:
        if redis_client:
            await redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        c = await db.candidates.find_one({"id": cand_id_int})
        return _to_full_dict(c)
    return None

async def update_candidate_result(db, token: str, score: float, total: int, total_marks: float, violations: int = 0, violation_logs: list = None, answers: list = None, screenshots: dict = None) -> bool:
    from app.core.redis import redis_client
    
    update_data = {
        "score": score,
        "total_questions": total,
        "total_marks": total_marks,
        "violations": violations,
        "violation_logs": violation_logs,
        "status": "Completed",
        "completed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    if answers is not None:
        update_data["answers"] = answers
    if screenshots:
        update_data["screenshot_start"] = screenshots.get("start")
        update_data["screenshot_mid"] = screenshots.get("mid")
        update_data["screenshot_end"] = screenshots.get("end")
            
    res = await db.candidates.update_one({"token": token}, {"$set": update_data})
    if res.modified_count > 0:
        if redis_client:
            await redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return True
    return False

async def cleanup_candidate_screenshots(db, candidate_id: str) -> bool:
    from app.core.redis import redis_client
    import os
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return False
        
    c = await db.candidates.find_one({"id": cand_id_int})
    if c:
        for attr in ["screenshot_start", "screenshot_mid", "screenshot_end"]:
            url = c.get(attr)
            if url and "/static/uploads/screenshots/" in url:
                file_name = url.split("/")[-1]
                file_path = os.path.join("static", "uploads", "screenshots", file_name)
                if os.path.exists(file_path):
                    try: os.remove(file_path)
                    except: pass
            
        await db.candidates.update_one(
            {"id": cand_id_int}, 
            {"$set": {"screenshot_start": None, "screenshot_mid": None, "screenshot_end": None}}
        )
        if redis_client:
            await redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        return True
    return False

async def reset_candidate_for_retest(db, candidate_id: str) -> Dict | None:
    from app.core.redis import redis_client
    try:
        cand_id_int = int(candidate_id)
    except (ValueError, TypeError):
        return None
        
    update_data = {
        "status": "Not Started",
        "score": None,
        "total_questions": None,
        "violations": 0,
        "device_id": "",
        "answers": [],
        "violation_logs": []
    }
    res = await db.candidates.update_one({"id": cand_id_int}, {"$set": update_data})
    if res.modified_count > 0:
        if redis_client:
            await redis_client.delete("all_candidates_list", "all_candidates_list_summary", "exams_with_counts")
        c = await db.candidates.find_one({"id": cand_id_int})
        return _to_full_dict(c)
    return None

async def get_report_data(db, candidate_obj: Dict) -> Dict | None:
    """Consolidated logic to generate assessment report data."""
    if not candidate_obj:
        return None
        
    candidate = _to_full_dict(candidate_obj)
    if candidate.get("status", "").lower() != "completed":
        return None

    from app.exams.service import get_exam_by_id
    exam = await get_exam_by_id(db, candidate["assigned_exam_id"])
    if not exam:
        return None

    # Performance stats by category
    stats = {}
    questions = exam.get("questions", [])
    answers = candidate.get("answers", [])
    
    ans_lookup = {}
    if answers:
        for a in answers:
            if a and "question_index" in a:
                ans_lookup[str(a["question_index"])] = a

    report_questions = []
    for idx, q in enumerate(questions or []):
        if not q: continue
        cat = q.get("category", "General")
        marks = float(q.get("marks", 1.0))
        q_type = str(q.get("type", "multiple-choice")).lower()
        
        if cat not in stats:
            stats[cat] = {"correct": 0, "total": 0, "count": 0, "attempted": 0}
        
        stats[cat]["count"] += 1
        stats[cat]["total"] += marks
        
        curr_ans = ans_lookup.get(str(idx))
        is_correct = False
        
        if curr_ans:
            stats[cat]["attempted"] += 1
            if q_type == 'coding':
                results = curr_ans.get("test_results") or []
                passed_count = len([r for r in results if r and r.get("passed")])
                total_test_cases = len(results)
                pass_pct = (passed_count / total_test_cases * 100) if total_test_cases > 0 else 0
                
                threshold = float(q.get("threshold_pct", 100))
                if pass_pct >= threshold:
                    is_correct = True
                    stats[cat]["correct"] += marks
            else:
                selected = curr_ans.get("selected_option_index")
                options = q.get("options") or []
                if selected is not None and 0 <= selected < len(options):
                    opt = options[selected]
                    if opt and opt.get("is_correct"):
                        is_correct = True
                        stats[cat]["correct"] += marks

        report_questions.append({
            "text": q["text"],
            "type": q_type,
            "options": q.get("options") or [],
            "selected_index": curr_ans.get("selected_option_index") if curr_ans else None,
            "code": curr_ans.get("code") if curr_ans else None,
            "language": curr_ans.get("language", q.get("language", "javascript")) if curr_ans else q.get("language", "javascript"),
            "test_results": curr_ans.get("test_results") if curr_ans else None,
            "category": cat,
            "marks": marks,
            "explanation": q.get("explanation"),
            "is_correct": is_correct
        })

    return {
        "candidate": candidate,
        "exam_title": exam["title"],
        "passing_score": exam.get("passing_score", 50),
        "stats": stats,
        "questions": report_questions,
        "proctoring": {
            "start": candidate.get("screenshot_start"),
            "mid": candidate.get("screenshot_mid"),
            "end": candidate.get("screenshot_end")
        }
    }
