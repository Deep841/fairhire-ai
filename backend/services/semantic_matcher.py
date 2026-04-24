"""
services/semantic_matcher.py

Async semantic similarity between a candidate profile and a job description
using the existing Gemini embedding model.

Design decisions
----------------
* google-generativeai's embed_content() is synchronous — we offload it to a
  thread-pool executor so it never blocks the event loop.
* Any failure (API key missing, quota, network, model error) returns 0.0 so
  the caller can rebalance weights and continue with deterministic scoring.
* Profile text is serialised into natural language so the embedding captures
  semantic intent rather than raw keyword lists.
"""
from __future__ import annotations

import asyncio
import logging
import math
from functools import lru_cache

from embeddings.embedder import embed_text

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def semantic_similarity(profile_text: str, jd_text: str) -> float:
    """
    Return cosine similarity in [0.0, 1.0] between *profile_text* and *jd_text*.

    Returns 0.0 on any embedding failure so the caller can fall back to
    deterministic-only scoring without crashing.
    """
    try:
        loop = asyncio.get_running_loop()
        profile_vec, jd_vec = await asyncio.gather(
            loop.run_in_executor(None, _embed_sync, profile_text),
            loop.run_in_executor(None, _embed_jd_cached, jd_text),
        )
        return _cosine(profile_vec, jd_vec)
    except Exception as exc:
        log.warning("semantic_matcher: embedding failed (%s) — semantic score set to 0.0", exc)
        return 0.0


def build_profile_text(
    skills: tuple[str, ...],
    education: tuple[str, ...],
    certifications: tuple[str, ...],
    experience_years: int | None,
) -> str:
    """
    Serialise a candidate profile into a natural-language paragraph that
    gives the embedding model enough context for meaningful similarity.

    Example output:
        "Candidate skills: Python, FastAPI, Docker, AWS.
         Education: Bachelor Of Technology, Computer Science.
         Certifications: Aws Certified Developer.
         Experience: 4 years of professional experience."
    """
    parts: list[str] = []
    if skills:
        parts.append(f"Candidate skills: {', '.join(skills)}.")
    if education:
        parts.append(f"Education: {', '.join(education)}.")
    if certifications:
        parts.append(f"Certifications: {', '.join(certifications)}.")
    if experience_years is not None:
        parts.append(f"Experience: {experience_years} years of professional experience.")
    return " ".join(parts) if parts else "No profile information available."


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _embed_sync(text: str) -> list[float]:
    """Synchronous wrapper for candidate profile — called inside run_in_executor."""
    return embed_text(text)


@lru_cache(maxsize=64)
def _embed_jd_cached(jd_text: str) -> list[float]:
    """Cached JD embedding — same JD is not re-embedded for every candidate."""
    return embed_text(jd_text)


def _cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity clamped to [0.0, 1.0]."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    if mag_a == 0.0 or mag_b == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (mag_a * mag_b)))
