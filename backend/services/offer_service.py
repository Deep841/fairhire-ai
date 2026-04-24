"""
services/offer_service.py

Generates a personalised offer email draft using Gemini 2.0 Flash.
HR reviews and edits before sending — never auto-sends without approval.
Falls back to a plain template if Gemini is unavailable.
"""
from __future__ import annotations

import logging
import re

from google import genai
from config import settings

log = logging.getLogger(__name__)
_client = genai.Client(api_key=settings.GEMINI_API_KEY)

_PROMPT = """\
You are an HR professional writing a warm, professional job offer email.

Role: {job_title}
Candidate name: {candidate_name}
Matched skills: {skills}
Final score: {score}/100

Write a concise, genuine offer email (150-200 words). Include:
- Congratulations opening
- Role name
- 2-3 specific strengths from their matched skills
- Next steps (HR will follow up with formal letter)
- Warm closing

Return ONLY the email body text, no subject line, no JSON.
"""

_FALLBACK = """\
Dear {candidate_name},

Congratulations! We are delighted to offer you the position of {job_title}.

Your profile stood out with a strong match score of {score}/100, and your skills in \
{skills} align perfectly with what we are looking for.

Our HR team will be in touch shortly with the formal offer letter, compensation details, \
and onboarding information.

We look forward to welcoming you to the team!

Best regards,
FairHire AI Recruitment Team
"""


async def draft_offer_email(
    candidate_name: str,
    job_title: str,
    matched_skills: list[str],
    final_score: float,
) -> str:
    """Returns a personalised offer email body. Falls back to template on failure."""
    skills_str = ", ".join(matched_skills[:6]) if matched_skills else "your technical expertise"
    score_str = f"{final_score:.0f}" if final_score else "—"

    try:
        prompt = _PROMPT.format(
            job_title=job_title,
            candidate_name=candidate_name,
            skills=skills_str,
            score=score_str,
        )
        response = await _client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        text = response.text.strip()
        # Strip any accidental markdown
        text = re.sub(r"^```.*?```$", "", text, flags=re.DOTALL).strip()
        if len(text) > 100:
            return text
    except Exception as exc:
        log.warning("offer_service: Gemini draft failed — %s", exc)

    return _FALLBACK.format(
        candidate_name=candidate_name,
        job_title=job_title,
        skills=skills_str,
        score=score_str,
    )
