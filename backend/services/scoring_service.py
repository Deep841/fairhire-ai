"""
services/scoring_service.py

Impact-based scoring via Gemini.

Extracts achievement sentences from resume text and scores the business
impact each achievement would bring to the target role.

Returns:
    impact_score      float 0.0-1.0  — normalised mean of per-sentence scores
    impact_highlights list[str]      — top 3 achievement sentences (for UI)
"""
from __future__ import annotations

import json
import logging
import re

from google import genai

from config import settings

log = logging.getLogger(__name__)

_client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Sentence-level achievement signals
_ACHIEVEMENT_RE = re.compile(
    r"(?i)(?:"
    r"reduc\w+|increas\w+|improv\w+|optimis\w+|optimiz\w+|achiev\w+|deliver\w+|"
    r"built|developed|designed|led|managed|launched|shipped|scaled|automated|"
    r"saved|generated|grew|cut|boosted|deployed|migrated|refactor\w+"
    r")"
)

_PROMPT = """\
You are an expert technical recruiter evaluating candidate achievements.

Job Description:
{jd}

Candidate achievement sentences:
{sentences}

For each sentence, score the business impact it demonstrates for THIS specific role (0-10).
0 = irrelevant or vague, 10 = directly solves a core need of the role with measurable outcome.

Respond ONLY with valid JSON in this exact format:
{{"scores": [<int>, ...], "highlights": ["<top achievement 1>", "<top achievement 2>", "<top achievement 3>"]}}

Rules:
- scores array must have exactly the same length as the input sentences
- highlights must be the 3 sentences with highest scores (verbatim from input)
- if fewer than 3 sentences exist, include all of them in highlights
"""


async def score_impact(resume_text: str, jd_text: str) -> tuple[float, list[str]]:
    """
    Returns (impact_score 0.0-1.0, top impact highlights).
    Falls back to (0.0, []) on any Gemini failure so the caller
    redistributes weights gracefully.
    """
    sentences = _extract_achievement_sentences(resume_text)
    if not sentences:
        log.debug("impact_scorer: no achievement sentences found")
        return 0.0, []

    prompt = _PROMPT.format(
        jd=jd_text[:3000],
        sentences="\n".join(f"{i + 1}. {s}" for i, s in enumerate(sentences[:20])),
    )

    try:
        response = await _client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        raw = response.text.strip()
        # Strip markdown code fences if Gemini wraps output in ```json
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()
        data = json.loads(raw)

        scores: list[int] = data.get("scores", [])
        highlights: list[str] = data.get("highlights", [])

        if not scores:
            return 0.0, []

        normalised = sum(scores) / (len(scores) * 10)
        return round(min(max(normalised, 0.0), 1.0), 4), highlights[:3]

    except Exception as exc:
        log.warning("impact_scorer: Gemini call failed — %s", exc)
        return 0.0, []


def _extract_achievement_sentences(text: str) -> list[str]:
    """Split resume text into sentences and keep only achievement-signal ones."""
    raw_sentences = re.split(r"(?<=[.!?])\s+|\n", text)
    results: list[str] = []
    for s in raw_sentences:
        s = s.strip().lstrip("-•·* ")
        if len(s) < 20:
            continue
        if _ACHIEVEMENT_RE.search(s):
            results.append(s)
    return results
