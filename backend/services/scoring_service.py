"""
services/scoring_service.py

Deterministic impact scoring — no external API required.

Scores achievement sentences from the resume using:
  - Quantified results (numbers + units = strongest signal)
  - Action verb strength (led/scaled > built > developed)
  - JD keyword overlap (achievement mentions required skills)
  - Sentence length and specificity

Returns:
    impact_score      float 0.0-1.0
    impact_highlights list[str]  — top 3 scored sentences
"""
from __future__ import annotations

import logging
import re

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Signal patterns
# ---------------------------------------------------------------------------

# Quantified results — strongest signal ("40%", "3x", "10k users", "200ms")
_QUANTIFIED_RE = re.compile(
    r"\d+\s*(%|x\b|times\b|users?\b|ms\b|seconds?\b|hours?\b|days?\b"
    r"|k\b|million\b|billion\b|tb\b|gb\b|mb\b|requests?\b|calls?\b"
    r"|lines?\b|repos?\b|services?\b|apis?\b|endpoints?\b)",
    re.IGNORECASE,
)

# High-signal action verbs — leadership / delivery / impact
_STRONG_VERBS = re.compile(
    r"\b(led|owned|architected|designed|scaled|launched|shipped|drove"
    r"|reduced|increased|improved|optimised|optimized|automated|migrated"
    r"|saved|generated|grew|cut|boosted|deployed|refactored|built|created"
    r"|developed|implemented|delivered|managed|established|spearheaded)\b",
    re.IGNORECASE,
)

# Weak filler phrases — penalise vague sentences
_WEAK_PHRASES = re.compile(
    r"\b(responsible for|worked on|helped with|assisted in|involved in"
    r"|participated in|exposure to|familiar with|knowledge of)\b",
    re.IGNORECASE,
)

# Achievement sentence detector — must contain at least one action verb
_ACHIEVEMENT_RE = re.compile(
    r"\b(reduc\w+|increas\w+|improv\w+|optimis\w+|optimiz\w+|achiev\w+"
    r"|deliver\w+|built|developed|designed|led|managed|launched|shipped"
    r"|scaled|automated|saved|generated|grew|cut|boosted|deployed"
    r"|migrated|refactor\w+|architected|owned|drove|spearheaded)\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def score_impact(resume_text: str, jd_text: str) -> tuple[float, list[str]]:
    """
    Deterministic impact scorer — no external API.
    Returns (impact_score 0.0-1.0, top 3 achievement sentences).
    """
    sentences = _extract_achievement_sentences(resume_text)
    if not sentences:
        log.debug("impact_scorer: no achievement sentences found")
        return 0.0, []

    jd_keywords = _extract_jd_keywords(jd_text)
    scored = [(_score_sentence(s, jd_keywords), s) for s in sentences]
    scored.sort(key=lambda x: x[0], reverse=True)

    if not scored:
        return 0.0, []

    # Normalise: mean of top-5 scores divided by max possible (10)
    top_scores = [s for s, _ in scored[:5]]
    normalised = sum(top_scores) / (len(top_scores) * 10)
    impact_score = round(min(max(normalised, 0.0), 1.0), 4)

    highlights = [sent for _, sent in scored[:3]]
    log.debug("impact_scorer: score=%.3f highlights=%d", impact_score, len(highlights))
    return impact_score, highlights


# ---------------------------------------------------------------------------
# Sentence scoring
# ---------------------------------------------------------------------------

def _score_sentence(sentence: str, jd_keywords: set[str]) -> float:
    """Score a single achievement sentence 0-10."""
    score = 0.0

    # Quantified result = +4 pts (strongest signal)
    quant_count = len(_QUANTIFIED_RE.findall(sentence))
    score += min(quant_count * 4.0, 4.0)

    # Strong action verb = +2 pts
    if _STRONG_VERBS.search(sentence):
        score += 2.0

    # JD keyword overlap = +1 pt per matching keyword (max 3)
    sentence_lower = sentence.lower()
    jd_hits = sum(1 for kw in jd_keywords if kw in sentence_lower)
    score += min(jd_hits * 1.0, 3.0)

    # Weak filler phrase = -2 pts
    if _WEAK_PHRASES.search(sentence):
        score -= 2.0

    # Sentence length bonus — specific sentences tend to be longer
    words = len(sentence.split())
    if words >= 15:
        score += 1.0
    elif words < 6:
        score -= 1.0

    return max(0.0, min(score, 10.0))


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


def _extract_jd_keywords(jd_text: str) -> set[str]:
    """Extract meaningful single words from JD for overlap scoring."""
    # Remove common stop words, keep technical/domain words
    stop = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "have", "has", "had", "will", "would", "could", "should", "may", "might",
        "we", "you", "our", "your", "their", "this", "that", "these", "those",
        "as", "if", "not", "no", "so", "do", "does", "did", "can", "its",
        "experience", "required", "preferred", "must", "ability", "strong",
        "good", "excellent", "great", "work", "team", "role", "position",
    }
    words = re.findall(r"[a-z][a-z0-9+#.]{2,}", jd_text.lower())
    return {w for w in words if w not in stop}
