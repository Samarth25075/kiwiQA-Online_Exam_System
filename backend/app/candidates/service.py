# app/candidates/service.py
import csv
import os
import uuid
from datetime import datetime
from typing import List, Dict

import threading

CSV_PATH = os.path.join(os.path.dirname(__file__), "candidates.csv")
HEADERS = ["id", "name", "email", "phone_number", "cv_url", "status", "joined_date", "token", "assigned_exam_id", "score", "total_questions", "violations", "device_id"]

# Multi-threading lock for safe concurrent CSV access
CANDIDATE_LOCK = threading.RLock()

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
        ["1", "Rajesh Kumar", "rajesh@example.com", "+91 9876543210", "", "Active", "2024-02-15", str(uuid.uuid4()), "", "", "", "0", ""],
        ["2", "Amit Sharma", "amit@example.com", "+91 8888888888", "", "Not Started", "2024-02-20", str(uuid.uuid4()), "", "", "", "0", ""],
    ]
    writer.writerows(initial_data)

def _get_raw_candidates() -> List[Dict]:
    _ensure_csv()
    candidates = []
    with open(CSV_PATH, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if "device_id" not in row:
                row["device_id"] = ""
            candidates.append(row)
    return candidates

def get_all_candidates() -> List[Dict]:
    with CANDIDATE_LOCK:
        return list(reversed(_get_raw_candidates()))

def create_candidate(name: str, email: str, phone_number: str = "", cv_url: str = "", device_id: str = "") -> Dict:
    _ensure_csv()
    with CANDIDATE_LOCK:
        candidates = _get_raw_candidates()
        new_id = str(max([int(c["id"]) for c in candidates], default=0) + 1)
        new_candidate = {
            "id": new_id,
            "name": name,
            "email": email,
            "phone_number": phone_number,
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
