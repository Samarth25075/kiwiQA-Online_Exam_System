# app/candidates/service.py
import csv
import os
import uuid
from datetime import datetime
from typing import List, Dict

import threading

CSV_PATH = os.path.join(os.path.dirname(__file__), "candidates.csv")
HEADERS = ["id", "candidate_id", "name", "email", "phone_number", "dob", "gender", "address", "profile_photo", "cv_url", "status", "joined_date", "token", "assigned_exam_id", "score", "total_questions", "violations", "device_id"]

# Multi-threading lock for safe concurrent CSV access
CANDIDATE_LOCK = threading.RLock()

# In-memory cache
_CANDIDATE_CACHE = None
_LAST_MOD_TIME = 0

def _ensure_csv():
    if not os.path.exists(CSV_PATH):
        with CANDIDATE_LOCK:
            # Re-check existence inside lock
            if not os.path.exists(CSV_PATH):
                with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
                    writer = csv.writer(f)
                    writer.writerow(HEADERS)
                    # Add some initial mock data if file is new
                    _add_initial_data(writer)

def _add_initial_data(writer):
    initial_data = [
        ["1", "CAND-2024-001", "Rajesh Kumar", "rajesh@example.com", "+91 9876543210", "1990-01-01", "Male", "Mumbai, India", "", "", "Active", "2024-02-15", str(uuid.uuid4()), "", "", "", "0", ""],
        ["2", "CAND-2024-002", "Amit Sharma", "amit@example.com", "+91 8888888888", "1992-05-15", "Male", "Delhi, India", "", "", "Not Started", "2024-02-20", str(uuid.uuid4()), "", "", "", "0", ""],
    ]
    writer.writerows(initial_data)

def _get_raw_candidates() -> List[Dict]:
    global _CANDIDATE_CACHE, _LAST_MOD_TIME
    _ensure_csv()
    
    with CANDIDATE_LOCK:
        try:
            current_mod_time = os.path.getmtime(CSV_PATH)
            if _CANDIDATE_CACHE is not None and current_mod_time == _LAST_MOD_TIME:
                return _CANDIDATE_CACHE
        except OSError:
            current_mod_time = 0

        candidates = []
        try:
            with open(CSV_PATH, mode="r", newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    for header in HEADERS:
                        if header not in row:
                            row[header] = ""
                    candidates.append(row)
        except Exception as e:
            print(f"ERROR reading candidates CSV: {e}")
            return _CANDIDATE_CACHE if _CANDIDATE_CACHE else []
            
        _CANDIDATE_CACHE = candidates
        _LAST_MOD_TIME = current_mod_time
        return candidates

def get_all_candidates() -> List[Dict]:
    with CANDIDATE_LOCK:
        return list(reversed(_get_raw_candidates()))

def create_candidate(name: str, email: str, phone_number: str = "", dob: str = "", gender: str = "", address: str = "", profile_photo: str = "", cv_url: str = "", device_id: str = "") -> Dict:
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        numeric_id = max([int(c["id"]) for c in candidates], default=0) + 1
        new_id = str(numeric_id)
        
        # Auto-generate Candidate ID: CAND-YYYY-XXX
        current_year = datetime.now().year
        candidate_id_str = f"CAND-{current_year}-{str(numeric_id).zfill(3)}"
        
        new_candidate = {
            "id": new_id,
            "candidate_id": candidate_id_str,
            "name": name,
            "email": email,
            "phone_number": phone_number,
            "dob": dob,
            "gender": gender,
            "address": address,
            "profile_photo": profile_photo,
            "cv_url": cv_url,
            "status": "Not Started",
            "joined_date": datetime.now().strftime("%Y-%m-%d"),
            "token": str(uuid.uuid4()),
            "assigned_exam_id": "",
            "score": "",
            "total_questions": "",
            "violations": "0",
            "device_id": device_id
        }
        
        with open(CSV_PATH, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=HEADERS)
            writer.writerow(new_candidate)
            
        return new_candidate

def assign_exam_to_candidate(candidate_id: str, exam_id: str) -> Dict | None:
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        updated = False
        for c in candidates:
            if c["id"] == candidate_id:
                c["assigned_exam_id"] = exam_id
                updated = True
                break
        
        if updated:
            with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=HEADERS)
                writer.writeheader()
                writer.writerows(candidates)
            return next(c for c in candidates if c["id"] == candidate_id)
        return None

def get_candidate_by_token(token: str) -> Dict | None:
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        for c in candidates:
            if c["token"] == token:
                return c
        return None

def update_candidate_status(token: str, status: str) -> bool:
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        updated = False
        for c in candidates:
            if c["token"] == token:
                c["status"] = status
                updated = True
                break
        
        if updated:
            with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=HEADERS)
                writer.writeheader()
                writer.writerows(candidates)
            return True
        return False

def delete_candidate(candidate_id: str) -> bool:
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        initial_len = len(candidates)
        
        # Filter out the candidate
        new_candidates = [c for c in candidates if str(c["id"]) != str(candidate_id)]
        
        if len(new_candidates) < initial_len:
            with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=HEADERS)
                writer.writeheader()
                writer.writerows(new_candidates)
            return True
        return False

def update_candidate_details(candidate_id: str, data: Dict) -> Dict | None:
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        updated_obj = None
        for c in candidates:
            if c["id"] == candidate_id:
                c.update(data)
                updated_obj = c
                break
        
        if updated_obj:
            with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=HEADERS)
                writer.writeheader()
                writer.writerows(candidates)
            return updated_obj
        return None
def update_candidate_result(token: str, score: int, total: int, violations: int = 0) -> bool:
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        updated = False
        for c in candidates:
            if c["token"] == token:
                c["score"] = str(score)
                c["total_questions"] = str(total)
                c["violations"] = str(violations)
                c["status"] = "Completed"
                updated = True
                break
        
        if updated:
            with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=HEADERS)
                writer.writeheader()
                writer.writerows(candidates)
            return True
        return False

def reset_candidate_for_retest(candidate_id: str) -> Dict | None:
    """Reset a candidate's exam results and status so they can retake the exam."""
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        updated_obj = None
        for c in candidates:
            if c["id"] == candidate_id:
                c["status"] = "Not Started"
                c["score"] = ""
                c["total_questions"] = ""
                c["violations"] = ""
                c["device_id"] = ""
                updated_obj = c
                break
    
        if updated_obj:
            with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=HEADERS)
                writer.writeheader()
                writer.writerows(candidates)
            return updated_obj
        return None
