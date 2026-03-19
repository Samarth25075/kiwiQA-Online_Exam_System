import os
import json
import base64
import urllib.request
import urllib.error
from typing import List, Optional
from app.core.config import SMTP_EMAIL, SENDGRID_API_KEY

def send_email(to_email: str, subject: str, content: str, attachments: Optional[List[str]] = None):
    """Base helper to send emails using SendGrid API to bypass cloud provider port blocks."""
    if not SENDGRID_API_KEY or not SMTP_EMAIL:
        print(f"DEBUG: Email to {to_email} skipped (SendGrid API Key or Sender not configured).")
        print(f"--- MOCK EMAIL ---")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content: {content}")
        print(f"------------------")
        return False

    url = "https://api.sendgrid.com/v3/mail/send"

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": SMTP_EMAIL},
        "subject": subject,
        "content": [{"type": "text/plain", "value": content}]
    }

    if attachments:
        payload["attachments"] = []
        for filepath in attachments:
            if os.path.exists(filepath):
                with open(filepath, 'rb') as f:
                    file_data = base64.b64encode(f.read()).decode('utf-8')
                    file_name = os.path.basename(filepath)
                    payload["attachments"].append({
                        "content": file_data,
                        "type": "image/png",
                        "filename": file_name,
                        "disposition": "attachment"
                    })

    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}", 
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req) as resp:
            print(f"DEBUG: Email sent to {to_email} via SendGrid successfully. Status: {resp.status}")
            return True
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode()
        print(f"ERROR: SendGrid failed to send email to {to_email}: {e.status} {error_msg}")
        return False
    except Exception as e:
        print(f"ERROR: Failed to send email to {to_email}: {e}")
        return False
