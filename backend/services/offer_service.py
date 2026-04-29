"""
services/offer_service.py

Generates a personalised offer email draft using rule-based templates.
HR reviews and edits before sending — never auto-sends without approval.
If Gemini API key is configured, uses Gemini for richer personalisation.
Otherwise falls back to a smart template that uses matched skills and score.
"""
from __future__ import annotations

import logging
import re

from config import settings

log = logging.getLogger(__name__)


async def draft_offer_email(
    candidate_name: str,
    job_title: str,
    matched_skills: list[str],
    final_score: float,
) -> str:
    """Returns a personalised offer email body."""
    skills_str = ", ".join(matched_skills[:6]) if matched_skills else "your technical expertise"
    score_str = f"{final_score:.0f}" if final_score else "—"

    # Try Gemini if key is configured
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "<your-gemini-api-key>":
        try:
            from google import genai
            _client = genai.Client(api_key=settings.GEMINI_API_KEY)
            prompt = (
                f"Write a warm, professional job offer email (150-200 words).\n"
                f"Role: {job_title}\nCandidate: {candidate_name}\n"
                f"Matched skills: {skills_str}\nScore: {score_str}/100\n"
                f"Include: congratulations, role name, 2-3 specific strengths, next steps.\n"
                f"Return ONLY the email body, no subject line."
            )
            response = await _client.aio.models.generate_content(
                model="gemini-2.0-flash", contents=prompt
            )
            text = re.sub(r"^```.*?```$", "", response.text.strip(), flags=re.DOTALL).strip()
            if len(text) > 100:
                return text
        except Exception as exc:
            log.warning("offer_service: Gemini draft failed — %s", exc)

    # Smart deterministic fallback — personalised using actual data
    top_skills = matched_skills[:3] if matched_skills else []
    skill_sentence = (
        f"Your expertise in {', '.join(top_skills[:-1])} and {top_skills[-1]}"
        if len(top_skills) >= 2
        else f"Your expertise in {top_skills[0]}" if top_skills
        else "Your strong technical background"
    )

    score_comment = (
        "Your profile stood out as one of our strongest candidates."
        if final_score >= 80
        else "Your profile was a strong match for what we are looking for."
        if final_score >= 65
        else "After careful evaluation, we believe you are a great fit for this role."
    )

    return f"""Dear {candidate_name},

Congratulations! We are delighted to offer you the position of {job_title}.

{score_comment} {skill_sentence} aligns perfectly with the requirements of this role.

Our HR team will be in touch shortly with the formal offer letter, compensation details, and onboarding information. Please confirm your acceptance within 3 business days.

We look forward to welcoming you to the team!

Best regards,
FairHire AI Recruitment Team"""
