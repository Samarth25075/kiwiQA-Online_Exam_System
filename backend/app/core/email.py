import smtplib
import os
from email.message import EmailMessage
from app.core.config import SMTP_SERVER, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD

def send_email(to_email: str, subject: str, content: str, attachments: list = None):
    """Base helper to send emails using SMTP settings from config."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"DEBUG: Email to {to_email} skipped (SMTP not configured).")
        print(f"--- MOCK EMAIL ---")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Content: {content}")
        print(f"------------------")
        return False

    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = SMTP_EMAIL
        msg['To'] = to_email
        msg.set_content(content)

        if attachments:
            for filepath in attachments:
                if os.path.exists(filepath):
                    with open(filepath, 'rb') as f:
                        file_data = f.read()
                        file_name = os.path.basename(filepath)
                        # Basic assumption: PNG for screenshots. 
                        # Could be expanded if needed.
                        msg.add_attachment(file_data, maintype='image', subtype='png', filename=file_name)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)
        
        print(f"DEBUG: Email sent to {to_email} successfully.")
        return True
    except Exception as e:
        print(f"ERROR: Failed to send email to {to_email}: {e}")
        return False
