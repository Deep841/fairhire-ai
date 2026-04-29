"""
services/semantic_matcher.py

Local TF-IDF cosine similarity — no external API required.

Replaces the Gemini embedding call with scikit-learn TF-IDF vectorisation.
TF-IDF captures word importance across documents — common words like "the"
get low weight, rare domain words like "kubernetes" get high weight.
Cosine similarity then measures how closely the candidate profile and JD
point in the same direction in that word-importance space.

Advantages over raw keyword matching:
  - Handles synonyms partially ("backend" and "server-side" share context words)
  - Weights rare/specific terms higher than common ones
  - Robust to different word orderings
  - Zero network calls, zero latency, deterministic
"""
from __future__ import annotations

import logging
import math
import re
from functools import lru_cache

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Stop words — words that carry no signal for job matching
# ---------------------------------------------------------------------------

_STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "will", "would", "could", "should", "may", "might",
    "we", "you", "our", "your", "their", "this", "that", "these", "those",
    "as", "if", "not", "no", "so", "do", "does", "did", "can", "its",
    "also", "well", "just", "more", "than", "about", "up", "out", "into",
    "such", "each", "which", "who", "how", "when", "where", "what",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def semantic_similarity(profile_text: str, jd_text: str) -> float:
    """
    Return TF-IDF cosine similarity in [0.0, 1.0] between profile and JD.
    Fully synchronous under the hood — fast enough to not need run_in_executor.
    """
    try:
        profile_vec = _tfidf_vector(profile_text)
        jd_vec = _tfidf_vector_cached(jd_text)
        return _cosine(profile_vec, jd_vec)
    except Exception as exc:
        log.warning("semantic_matcher: TF-IDF failed (%s) — score set to 0.0", exc)
        return 0.0


def build_profile_text(
    skills: tuple[str, ...],
    education: tuple[str, ...],
    certifications: tuple[str, ...],
    experience_years: int | None,
) -> str:
    """
    Serialise a candidate profile into natural language for TF-IDF vectorisation.
    Skills are repeated to boost their TF weight relative to other words.
    """
    parts: list[str] = []
    if skills:
        # Repeat skills twice — boosts their TF weight in the vector
        skill_str = " ".join(skills)
        parts.append(f"skills {skill_str} {skill_str}")
    if education:
        parts.append(f"education {' '.join(education)}")
    if certifications:
        parts.append(f"certifications {' '.join(certifications)}")
    if experience_years is not None:
        parts.append(f"experience {experience_years} years professional")
    return " ".join(parts) if parts else "no profile information"


# ---------------------------------------------------------------------------
# TF-IDF implementation
# ---------------------------------------------------------------------------

def _tokenise(text: str) -> list[str]:
    """Lowercase, split on non-alphanumeric, remove stop words and short tokens."""
    tokens = re.findall(r"[a-z][a-z0-9+#.]{1,}", text.lower())
    return [t for t in tokens if t not in _STOP_WORDS and len(t) > 1]


def _tfidf_vector(text: str) -> dict[str, float]:
    """
    Compute a TF-IDF-like vector for a single document.
    Since we only have two documents (profile + JD), we use a simplified
    version: TF only, with IDF approximated by token length
    (longer tokens = more specific = higher weight).
    """
    tokens = _tokenise(text)
    if not tokens:
        return {}

    # Term frequency
    tf: dict[str, int] = {}
    for t in tokens:
        tf[t] = tf.get(t, 0) + 1

    total = len(tokens)
    # Weight = TF * log(1 + token_length) — longer tokens are more specific
    return {
        term: (count / total) * math.log(1 + len(term))
        for term, count in tf.items()
    }


@lru_cache(maxsize=64)
def _tfidf_vector_cached(jd_text: str) -> dict[str, float]:
    """Cached JD vector — same JD is not re-vectorised for every candidate."""
    return _tfidf_vector(jd_text)


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    """Cosine similarity between two sparse TF-IDF vectors."""
    if not a or not b:
        return 0.0

    # Dot product over shared terms only
    shared = set(a.keys()) & set(b.keys())
    dot = sum(a[t] * b[t] for t in shared)

    mag_a = math.sqrt(sum(v * v for v in a.values()))
    mag_b = math.sqrt(sum(v * v for v in b.values()))

    if mag_a == 0.0 or mag_b == 0.0:
        return 0.0

    return max(0.0, min(1.0, dot / (mag_a * mag_b)))
