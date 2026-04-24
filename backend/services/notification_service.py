"""
services/notification_service.py

Email notification service using SMTP (works with Gmail app passwords, Outlook, any SMTP server).
No OAuth needed — just SMTP credentials in config.

Templates:
  - Application acknowledgement
  - Interview confirmation
  - Rejection (future)
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config import settings

log = logging.getLogger(__name__)


async def send_application_acknowledgement(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
) -> bool:
    """Send acknowledgement email after resume upload."""
    subject = f"Application Received - {job_title}"
    body = f"""\
Dear {candidate_name},

Thank you for applying to the {job_title} position at FairHire AI.

We have received your application and our team is currently reviewing it.
You will hear from us within 5-7 business days regarding the next steps.

Best regards,
FairHire AI Recruitment Team
"""
    return await _send_email(candidate_email, subject, body)


async def send_interview_confirmation(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    interview_date: str,
    interview_time: str,
    meet_link: str | None = None,
    notes: str | None = None,
) -> bool:
    """Send interview confirmation email with details."""
    subject = f"Interview Scheduled - {job_title}"
    
    meet_section = f"\n\nMeeting Link: {meet_link}" if meet_link else ""
    notes_section = f"\n\nAdditional Notes:\n{notes}" if notes else ""
    
    body = f"""\
Dear {candidate_name},

Congratulations! We are pleased to invite you for an interview for the {job_title} position.

Interview Details:
- Date: {interview_date}
- Time: {interview_time}{meet_section}{notes_section}

Please confirm your availability by replying to this email.

We look forward to speaking with you!

Best regards,
FairHire AI Recruitment Team
"""
    return await _send_email(candidate_email, subject, body)


async def send_rejection(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
) -> bool:
    """Send polite rejection email."""
    subject = f"Application Update - {job_title}"
    body = f"""\
Dear {candidate_name},

Thank you for your interest in the {job_title} position at FairHire AI.

After careful consideration, we have decided to move forward with other candidates
whose qualifications more closely match our current needs.

We appreciate the time you invested in the application process and encourage you
to apply for future openings that match your skills and experience.

Best regards,
FairHire AI Recruitment Team
"""
    return await _send_email(candidate_email, subject, body)


async def send_offer(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    draft: str | None = None,
) -> bool:
    """Send offer email using the HR-reviewed AI draft, or a fallback template."""
    subject = f"Offer Letter - {job_title}"
    body = draft if draft and len(draft.strip()) > 50 else f"""\
Dear {candidate_name},

Congratulations! We are delighted to extend an offer for the {job_title} position at FairHire AI.

Our HR team will be in touch shortly with the formal offer letter and next steps.

Welcome to the team!

Best regards,
FairHire AI Recruitment Team
"""
    return await _send_email(candidate_email, subject, body)


async def send_interviewer_notification(
    interviewer_email: str,
    interviewer_name: str,
    candidate_name: str,
    job_title: str,
    interview_date: str,
    interview_time: str,
    meet_link: str | None = None,
    notes: str | None = None,
) -> bool:
    """Send dedicated interview assignment email to the interviewer."""
    subject = f"Interview Assignment - {candidate_name} for {job_title}"
    meet_section = f"\n\nMeeting Link: {meet_link}" if meet_link else ""
    notes_section = f"\n\nNotes:\n{notes}" if notes else ""
    body = f"""\
Dear {interviewer_name},

You have been assigned to interview {candidate_name} for the {job_title} position.

Interview Details:
- Candidate: {candidate_name}
- Date: {interview_date}
- Time: {interview_time}{meet_section}{notes_section}

Please submit your score and feedback via the FairHire AI portal after the interview.

Best regards,
FairHire AI Recruitment Team
"""
    return await _send_email(interviewer_email, subject, body)


async def send_test_link(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    test_link: str,
    deadline: str | None = None,
) -> bool:
    """Send assessment test link to candidate."""
    subject = f"Assessment Test - {job_title}"
    deadline_line = f"\n\nPlease complete the assessment by: {deadline}" if deadline else ""
    body = f"""\
Dear {candidate_name},

Thank you for your application for the {job_title} position.

We would like you to complete an online assessment as the next step in our hiring process.

Assessment Link: {test_link}{deadline_line}

Please ensure you complete the assessment in one sitting in a quiet environment.

Best of luck!

Best regards,
FairHire AI Recruitment Team
"""
    return await _send_email(candidate_email, subject, body)


# ---------------------------------------------------------------------------
# Internal SMTP sender
# ---------------------------------------------------------------------------

async def _send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send email via SMTP. Returns True on success, False on failure.
    Runs in thread pool to avoid blocking the event loop.
    """
    if not settings.SMTP_ENABLED:
        log.info("SMTP disabled — skipping email to %s", to_email)
        return False

    try:
        msg = MIMEMultipart()
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        # Run SMTP in thread pool since it's blocking I/O
        import asyncio
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _smtp_send_sync, msg, to_email)
        
        log.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        log.error("Failed to send email to %s: %s", to_email, exc)
        return False


def _smtp_send_sync(msg: MIMEMultipart, to_email: str) -> None:
    """Synchronous SMTP send — called in executor."""
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
