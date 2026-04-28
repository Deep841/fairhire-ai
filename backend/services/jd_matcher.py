"""
services/jd_matcher.py

Hybrid candidate-job fit scoring.

Scoring weights (nominal — when all components succeed):
    40%  impact score                  (Gemini achievement analysis)
    30%  semantic embedding similarity  (Gemini text-embedding-004)
    20%  taxonomy skill overlap         (deterministic)
    10%  experience relevance           (deterministic)

Fallback: any zero-value component's weight is redistributed
proportionally across the remaining active components so the
total always sums to 100%.
"""
from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass

from services.profile_extractor import CandidateProfile
from services.skill_taxonomy import SKILL_TAXONOMY, SKILL_WEIGHTS
from services.semantic_matcher import build_profile_text, semantic_similarity
from services.scoring_service import score_impact

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class MatchResult:
    fit_score: int
    matched_skills: tuple[str, ...]
    missing_skills: tuple[str, ...]
    skill_overlap_score: float
    education_relevance_score: float
    experience_relevance_score: float
    semantic_similarity_score: float    # 0.0 when embedding unavailable
    impact_score: float                 # 0.0 when unavailable
    impact_highlights: tuple[str, ...]  # top achievement sentences


# ---------------------------------------------------------------------------
# Compiled skill patterns for JD extraction
# ---------------------------------------------------------------------------

_SKILL_PATTERNS: dict[str, re.Pattern[str]] = {
    canonical: re.compile(r"(?i)(?:" + "|".join(aliases) + r")")
    for canonical, aliases in SKILL_TAXONOMY.items()
}

_TECH_EDUCATION_KEYWORDS = {
    "computer science", "software engineering", "computer engineering",
    "information technology", "data science", "artificial intelligence",
    "machine learning", "electrical engineering",
}

_EXPERIENCE_KEYWORDS = {
    "senior", "lead", "principal", "architect", "manager", "director",
    "years experience", "experienced", "expert",
}

# Nominal weights — must sum to 1.0
_W_IMPACT     = 0.40
_W_SEMANTIC   = 0.30
_W_SKILL      = 0.20
_W_EXPERIENCE = 0.10


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def match_candidate_to_jd(
    profile: CandidateProfile,
    jd_text: str,
    resume_text: str = "",
) -> MatchResult:
    """Hybrid async match: impact + semantic + skill overlap + experience."""
    jd_skills = _extract_jd_skills(jd_text)
    matched = tuple(s for s in profile.skills if s in jd_skills)
    missing = tuple(s for s in jd_skills if s not in profile.skills)

    # Weighted skill score using SKILL_WEIGHTS
    weighted_match = sum(SKILL_WEIGHTS.get(s, 1.0) for s in matched)
    weighted_total = sum(SKILL_WEIGHTS.get(s, 1.0) for s in jd_skills) or 1.0
    skill_score = weighted_match / weighted_total

    experience_score = _compute_experience_relevance(profile.experience_years, jd_text)
    education_score  = _compute_education_relevance(profile.education, jd_text)

    profile_text = build_profile_text(
        profile.skills, profile.education, profile.certifications, profile.experience_years
    )

    # Run semantic + impact concurrently with gather (safer than create_task)
    sem_score, (impact_score, impact_highlights) = await asyncio.gather(
        semantic_similarity(profile_text, jd_text),
        score_impact(resume_text or profile_text, jd_text),
    )

    # Build active weight map — drop zero-value components and redistribute
    raw_weights: dict[str, float] = {
        "impact":     _W_IMPACT     if impact_score > 0.0 else 0.0,
        "semantic":   _W_SEMANTIC   if sem_score    > 0.0 else 0.0,
        "skill":      _W_SKILL,
        "experience": _W_EXPERIENCE,
    }
    total_w = sum(raw_weights.values()) or 1.0
    nw = {k: v / total_w for k, v in raw_weights.items()}

    raw_score = (
        impact_score       * nw["impact"]
        + sem_score        * nw["semantic"]
        + skill_score      * nw["skill"]
        + experience_score * nw["experience"]
    )

    # Missing skill penalty — up to 10 points deducted
    missing_penalty = (len(missing) / len(jd_skills)) * 0.10 if jd_skills else 0.0

    fit_score = int(raw_score * 100) - int(missing_penalty * 100)
    fit_score = max(0, min(100, fit_score))

    log.debug(
        "jd_matcher: fit=%d impact=%.2f sem=%.2f skill=%.2f exp=%.2f penalty=%.2f",
        fit_score, impact_score, sem_score, skill_score, experience_score, missing_penalty,
    )

    return MatchResult(
        fit_score=fit_score,
        matched_skills=matched,
        missing_skills=missing,
        skill_overlap_score=skill_score,
        education_relevance_score=education_score,
        experience_relevance_score=experience_score,
        semantic_similarity_score=sem_score,
        impact_score=impact_score,
        impact_highlights=tuple(impact_highlights),
    )


# ---------------------------------------------------------------------------
# JD skill extraction
# ---------------------------------------------------------------------------

def _extract_jd_skills(jd_text: str) -> set[str]:
    return {c for c, p in _SKILL_PATTERNS.items() if p.search(jd_text)}


# ---------------------------------------------------------------------------
# Education relevance
# ---------------------------------------------------------------------------

def _compute_education_relevance(education: tuple[str, ...], jd_text: str) -> float:
    if not education:
        return 0.0
    jd_lower  = jd_text.lower()
    edu_lower = " ".join(education).lower()
    tech_match       = any(kw in edu_lower for kw in _TECH_EDUCATION_KEYWORDS)
    jd_requires_tech = any(kw in jd_lower  for kw in _TECH_EDUCATION_KEYWORDS)
    if tech_match and jd_requires_tech:
        return 1.0
    if tech_match or any("bachelor" in e.lower() or "master" in e.lower() for e in education):
        return 0.7
    return 0.4 if education else 0.0


# ---------------------------------------------------------------------------
# Experience relevance
# ---------------------------------------------------------------------------

def _compute_experience_relevance(experience_years: int | None, jd_text: str) -> float:
    if experience_years is None:
        return 0.0
    jd_lower = jd_text.lower()
    year_matches   = re.findall(r"(\d+)\+?\s*years?\s+(?:of\s+)?experience", jd_lower)
    required_years = int(year_matches[0]) if year_matches else 0
    is_senior_role = any(kw in jd_lower for kw in _EXPERIENCE_KEYWORDS)
    if required_years > 0:
        if experience_years >= required_years:           return 1.0
        if experience_years >= required_years * 0.7:    return 0.8
        if experience_years >= required_years * 0.5:    return 0.6
        return 0.3
    if is_senior_role:
        return 1.0 if experience_years >= 5 else 0.5
    return min(experience_years / 3.0, 1.0)
