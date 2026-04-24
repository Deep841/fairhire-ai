"""
Rule-based candidate profile extractor.
Format-agnostic: works for student, experienced, academic, and international resumes.

Skill extraction   — four-tier section-aware pipeline
Education          — scoped to education section; field-of-study tokens safe inside slice only
Certifications     — vendor certs full-text + achievement section line extraction
Experience years   — explicit "N years" + date-range inference with future-year clamping
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from services.skill_taxonomy import SKILL_TAXONOMY

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass(frozen=True, slots=True)
class CandidateProfile:
    skills: tuple[str, ...]
    education: tuple[str, ...]
    certifications: tuple[str, ...]
    experience_years: int | None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    raw_text: str = ""


# ---------------------------------------------------------------------------
# Shared heading prefix — horizontal whitespace + bullet chars only (no \n)
# ---------------------------------------------------------------------------

_H = r"[ \t\-#*\u2022\u2023\u25e6\u2043\u2219]*"


# ---------------------------------------------------------------------------
# Section heading patterns
# ---------------------------------------------------------------------------

_ANY_HEADING = re.compile(
    r"(?im)^[ \t]*(?:[A-Z][A-Za-z &/\-]{2,40})[ \t]*:?[ \t]*$"
)

_SKILL_HEADING = re.compile(
    rf"(?im)^{_H}"
    r"(?:technical\s+skills?|skills?|core\s+competenc(?:y|ies)"
    r"|tools?(?:\s+(?:&|and)\s+technologies?)?|technologies"
    r"|tech(?:nology)?\s+stack|key\s+skills?|areas?\s+of\s+expertise"
    r"|programming\s+languages?|languages?\s+(?:&|and)\s+frameworks?"
    r"|frameworks?(?:\s+(?:&|and)\s+libraries?)?|libraries?|platforms?)"
    rf"{_H}$"
)

_SKILL_STOP = re.compile(
    rf"(?im)^{_H}"
    r"(?:education|academic|experience|employment|work\s+history"
    r"|certifications?|courses?|awards?|publications?|volunteer"
    r"|languages?|references?|summary|objective"
    r"|projects?|personal\s+projects?|academic\s+projects?)"
    rf"{_H}$"
)

_PROJECT_HEADING = re.compile(
    rf"(?im)^{_H}"
    r"(?:projects?|personal\s+projects?|academic\s+projects?"
    r"|side\s+projects?|open[\s\-]source|portfolio"
    r"|notable\s+projects?|selected\s+projects?)"
    rf"{_H}$"
)

_PROJECT_STOP = re.compile(
    rf"(?im)^{_H}"
    r"(?:education|academic|experience|employment|work\s+history"
    r"|certifications?|courses?|awards?|publications?"
    r"|volunteer|languages?|references?|summary|objective)"
    rf"{_H}$"
)

_EXP_HEADING = re.compile(
    rf"(?im)^{_H}"
    r"(?:work\s+experience|professional\s+experience|employment\s+history"
    r"|employment|experience|internships?|work\s+history)"
    rf"{_H}$"
)

_EXP_STOP = re.compile(
    rf"(?im)^{_H}"
    r"(?:education|academic|certifications?|courses?|awards?"
    r"|publications?|projects?|volunteer|languages?"
    r"|references?|skills?|summary|objective)"
    rf"{_H}$"
)

_EDU_HEADING = re.compile(
    rf"(?im)^{_H}"
    r"(?:education|academic(?:\s+background)?|qualifications?"
    r"|academic\s+qualifications?)"
    rf"{_H}$"
)

_ACHIEVEMENT_HEADING = re.compile(
    rf"(?im)^{_H}"
    r"(?:achievements?\s+and\s+certifications?"
    r"|certifications?\s+and\s+achievements?"
    r"|achievements?|certifications?|awards?\s+and\s+certifications?"
    r"|honours?|honors?|recognitions?|accomplishments?)"
    rf"{_H}$"
)

_TECH_STACK_LINE = re.compile(
    r"(?i)(?:tech(?:nologies)?(?:\s+used)?|built\s+with"
    r"|stack|tools?|frameworks?|languages?)\s*[:\-]"
)


# ---------------------------------------------------------------------------
# Skill patterns (compiled once at import)
# ---------------------------------------------------------------------------

_SKILL_PATTERNS: dict[str, re.Pattern[str]] = {
    canonical: re.compile(r"(?i)(?:" + "|".join(aliases) + r")")
    for canonical, aliases in SKILL_TAXONOMY.items()
}


# ---------------------------------------------------------------------------
# Education patterns
# ---------------------------------------------------------------------------

_DEGREE_PATTERN = re.compile(
    r"(?i)\b("
    r"b\.?\s*tech\.?(?:\s+in\s+[\w\s]+)?"
    r"|b\.?\s*e\.?(?:\s+in\s+[\w\s]+)?"
    r"|bachelor\s+of\s+engineering(?:\s+in\s+[\w\s]+)?"
    r"|bachelor\s+of\s+technology(?:\s+in\s+[\w\s]+)?"
    r"|bachelor(?:'?s)?(?:\s+of\s+[\w\s]+)?"
    r"|master(?:'?s)?(?:\s+of\s+[\w\s]+)?"
    r"|ph\.?d\.?(?:\s+in\s+[\w\s]+)?"
    r"|b\.?s\.?c?\.?"
    r"|m\.?s\.?c?\.?"
    r"|m\.?b\.?a\.?"
    r"|associate(?:'?s)?(?:\s+of\s+[\w\s]+)?"
    r"|high\s+school\s+diploma"
    r"|diploma"
    r")\b"
)

# Only applied inside an education section slice — prevents false positives
# from Skills / Projects sections on any resume format.
_FIELD_PATTERN = re.compile(
    r"(?i)\b("
    r"computer\s+science"
    r"|information\s+technology"
    r"|computer\s+engineering"
    r"|software\s+engineering"
    r"|electrical\s+engineering"
    r"|mechanical\s+engineering"
    r"|civil\s+engineering"
    r"|data\s+science"
    r"|artificial\s+intelligence"
    r"|machine\s+learning"
    r"|mathematics|physics|economics"
    r"|business\s+administration"
    r")\b"
)


# ---------------------------------------------------------------------------
# Certification patterns
# ---------------------------------------------------------------------------

# Vendor / professional certs — matched anywhere (unambiguous by name)
_CERT_PATTERN = re.compile(
    r"(?i)\b("
    r"aws\s+certified[\w\s\-]*"
    r"|google\s+cloud\s+certified[\w\s\-]*"
    r"|azure\s+certified[\w\s\-]*"
    r"|certified\s+kubernetes[\w\s\-]*"
    r"|ckad|cka|cks"
    r"|pmp|cpa|cissp"
    r"|comptia[\w\s\+]*"
    r"|oracle\s+certified[\w\s\-]*"
    r"|tensorflow\s+developer\s+certificate"
    r"|professional\s+scrum[\w\s\-]*"
    r"|certified\s+scrum[\w\s\-]*"
    r"|udemy[\w\s\-]*(?:certificate|course|bootcamp)"
    r"|coursera[\w\s\-]*(?:certificate|specialization)?"
    r"|nptel[\w\s\-]*"
    r"|certificate\s+(?:of\s+)?(?:completion|achievement|excellence)[\w\s\-]*"
    r")\b"
)

# Signal words that mark an achievement-section line as worth extracting
_ACHIEVEMENT_SIGNAL = re.compile(
    r"(?i)(?:awarded|winner|won|finalist|semi.?finalist|pre.?final"
    r"|ranked|rank\s+\d|certificate|certified|scholarship"
    r"|selected\s+for|selected\s+as|published|publication|patent)"
)


# ---------------------------------------------------------------------------
# Experience patterns
# ---------------------------------------------------------------------------

_EXP_EXPLICIT = re.compile(
    r"(?i)(\d+)\+?\s+years?\s+(?:of\s+)?(?:professional\s+)?experience"
)

_MONTHS = (
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?"
    r"|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
)
_DATE_RANGE = re.compile(
    rf"(?i)(?:{_MONTHS}\s+)?(\d{{4}})"
    rf"\s*[\u2013\u2014\-]{{1,2}}\s*"
    rf"(?:(?:{_MONTHS}\s+)?(\d{{4}})|present|current|now|till\s+date|to\s+date)"
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_profile(text: str) -> CandidateProfile:
    return CandidateProfile(
        skills=_extract_skills(text),
        education=_extract_education(text),
        certifications=_extract_certifications(text),
        experience_years=_extract_experience_years(text),
        full_name=_extract_name(text),
        email=_extract_email(text),
        phone=_extract_phone(text),
        raw_text=text,
    )


# ---------------------------------------------------------------------------
# Skill extraction — four-tier pipeline
# ---------------------------------------------------------------------------

def _extract_skills(text: str) -> tuple[str, ...]:
    seen:   set[str]  = set()
    result: list[str] = []

    def _collect(src: str, tier: str) -> None:
        before = len(result)
        for canonical, pat in _SKILL_PATTERNS.items():
            if canonical not in seen and pat.search(src):
                seen.add(canonical)
                result.append(canonical)
        added = result[before:]
        log.debug("[skills][%s] added=%s", tier, added) if added else \
            log.debug("[skills][%s] none", tier)

    for i, block in enumerate(_slice_all(_SKILL_HEADING, _SKILL_STOP, text)):
        log.debug("[skills][tier1][block%d] preview=%r", i, block[:120])
        _collect(block, f"tier1/b{i}")

    for i, block in enumerate(_slice_all(_PROJECT_HEADING, _PROJECT_STOP, text)):
        focused = _tech_stack_lines(block)
        _collect(focused if focused.strip() else block, f"tier2/b{i}")

    exp = _slice_one(_EXP_HEADING, _EXP_STOP, text)
    if exp:
        _collect(exp, "tier3")

    _collect(text, "tier4/fallback")
    log.debug("[skills][final] %d skills", len(result))
    return tuple(result)


# ---------------------------------------------------------------------------
# Education extraction — section-scoped
# ---------------------------------------------------------------------------

def _extract_education(text: str) -> tuple[str, ...]:
    edu = _slice_section(text, _EDU_HEADING)
    scan = edu if edu.strip() else text
    use_fields = bool(edu.strip())

    seen:   set[str]  = set()
    unique: list[str] = []

    for m in _DEGREE_PATTERN.findall(scan):
        n = " ".join(m.split()).title()
        if n not in seen:
            seen.add(n)
            unique.append(n)

    if use_fields:
        for m in _FIELD_PATTERN.findall(edu):
            n = " ".join(m.split()).title()
            if n not in seen:
                seen.add(n)
                unique.append(n)

    return tuple(unique)


# ---------------------------------------------------------------------------
# Certification extraction — vendor certs + achievement section lines
# ---------------------------------------------------------------------------

def _extract_certifications(text: str) -> tuple[str, ...]:
    seen:   set[str]  = set()
    unique: list[str] = []

    for m in _CERT_PATTERN.findall(text):
        n = " ".join(m.split()).title()
        if n not in seen:
            seen.add(n)
            unique.append(n)

    ach = _slice_section(text, _ACHIEVEMENT_HEADING)
    if ach.strip():
        for line in ach.splitlines():
            line = line.strip().lstrip("-\u2022\u00b7* ")
            if len(line) < 8:
                continue
            if _ACHIEVEMENT_SIGNAL.search(line):
                entry = " ".join(line.split())[:80].rstrip(",.:").title()
                if entry not in seen:
                    seen.add(entry)
                    unique.append(entry)

    return tuple(unique)


# ---------------------------------------------------------------------------
# Experience years extraction
# ---------------------------------------------------------------------------

def _extract_experience_years(text: str) -> int | None:
    hits: list[int] = [int(n) for n in _EXP_EXPLICIT.findall(text)]

    scoped = _slice_one(_EXP_HEADING, _EXP_STOP, text)
    search = scoped if scoped.strip() else text

    cy = _current_year()
    for m in _DATE_RANGE.finditer(search):
        try:
            start = min(int(m.group(1)), cy)
            end   = min(int(m.group(2)) if m.group(2) else cy, cy)
            span  = end - start
            hits.append(span if span > 0 else 1)
        except (TypeError, ValueError):
            continue

    # Filter out unreasonably large spans (education dates etc.)
    hits = [h for h in hits if 0 < h <= 50]
    return max(hits) if hits else None


# ---------------------------------------------------------------------------
# Section slicing helpers
# ---------------------------------------------------------------------------

def _normalise(text: str) -> str:
    return (text.replace("\r\n", "\n").replace("\r", "\n")
                .replace("\u2028", "\n").replace("\u2029", "\n"))


def _slice_all(
    heading: re.Pattern[str],
    stop: re.Pattern[str],
    text: str,
) -> list[str]:
    """Return all non-empty blocks under every matching heading."""
    text = _normalise(text)
    slices: list[str] = []
    pos = 0
    while True:
        hm = heading.search(text, pos)
        if not hm:
            break
        start = hm.end()
        sm = stop.search(text, start)
        end = sm.start() if sm else len(text)
        pos = sm.end() if sm else len(text)
        block = text[start:end].strip()
        if block:
            slices.append(block)
    return slices


def _slice_one(
    heading: re.Pattern[str],
    stop: re.Pattern[str],
    text: str,
) -> str:
    """Return the first block under a matching heading."""
    blocks = _slice_all(heading, stop, text)
    return blocks[0] if blocks else ""


def _slice_section(text: str, heading: re.Pattern[str]) -> str:
    """Return text under the first matching heading until the next heading."""
    text = _normalise(text)
    m = heading.search(text)
    if not m:
        return ""
    start = m.end()
    stop  = _ANY_HEADING.search(text, start)
    end   = stop.start() if stop else len(text)
    return text[start:end].strip()


def _tech_stack_lines(block: str) -> str:
    """Extract lines following a tech-stack signal inside a project block."""
    lines = block.splitlines()
    out: list[str] = []
    capturing = False
    for line in lines:
        if _TECH_STACK_LINE.search(line):
            capturing = True
            parts = re.split(r"[:\-]", line, maxsplit=1)
            if len(parts) > 1:
                out.append(parts[1])
            continue
        if capturing:
            if not line.strip() or _ANY_HEADING.match(line):
                capturing = False
            else:
                out.append(line)
    return "\n".join(out)


def _current_year() -> int:
    from datetime import date
    return date.today().year


# ---------------------------------------------------------------------------
# Contact extraction
# ---------------------------------------------------------------------------

# Strict email — must have valid TLD, no leading/trailing dots in local part
_EMAIL_RE = re.compile(
    r"(?<![\w.])"           # not preceded by word char or dot
    r"([a-zA-Z0-9][a-zA-Z0-9._%+\-]{0,63}"  # local part starts with alnum
    r"@"
    r"[a-zA-Z0-9][a-zA-Z0-9.\-]{0,253}"     # domain
    r"\.[a-zA-Z]{2,})"      # TLD
    r"(?![\w.@])"           # not followed by word char, dot, or another @
)

# Known fake/placeholder domains to reject
_FAKE_DOMAINS = {"example.com", "test.com", "email.com", "domain.com", "fairhire.local", "mail.com"}

# Phone — requires 10+ digits, anchored to avoid matching inside longer numbers
_PHONE_RE = re.compile(
    r"(?<![\d])"                          # not preceded by digit
    r"(\+?\d[\d\s\-().]{8,18}\d)"         # 10-20 char phone string
    r"(?![\d])"                           # not followed by digit
)

_HEADING_WORDS_SET = {
    "summary", "objective", "profile", "skills", "experience", "education",
    "certifications", "projects", "contact", "references", "awards",
    "publications", "volunteer", "languages", "resume", "curriculum", "vitae",
    "declaration", "hobbies", "interests", "achievements",
}

# Contact section signal — lines containing these are likely in the header
_CONTACT_SIGNAL = re.compile(
    r"(?i)(email|phone|mobile|contact|linkedin|github|portfolio|address|tel)"
)


def _contact_zone(text: str) -> str:
    """
    Return the most likely contact zone of the resume.
    Strategy: first 25 lines, OR lines around the first email/phone signal.
    This avoids picking up emails from job descriptions or references sections.
    """
    lines = text.splitlines()
    # Always include first 25 lines
    zone_lines = lines[:25]
    # Also include any line with a contact signal in first 60 lines
    for line in lines[25:60]:
        if _CONTACT_SIGNAL.search(line):
            zone_lines.append(line)
    return "\n".join(zone_lines)


def _extract_email(text: str) -> str | None:
    """
    Extract email — prefers contact zone, validates domain, rejects fakes.
    Falls back to full text if not found in contact zone.
    """
    for search_text in [_contact_zone(text), text]:
        for m in _EMAIL_RE.finditer(search_text):
            email = m.group(1).lower().strip(".")
            # Reject if local part ends with a dot
            local = email.split("@")[0]
            if local.endswith(".") or local.startswith("."):
                continue
            domain = email.split("@")[1] if "@" in email else ""
            if domain in _FAKE_DOMAINS:
                continue
            # Reject emails that look like they're inside a URL path
            pos = m.start()
            preceding = search_text[max(0, pos-10):pos]
            if "/" in preceding or "://" in preceding:
                continue
            return email
    return None


def _extract_phone(text: str) -> str | None:
    """
    Extract phone — searches contact zone first, validates digit count.
    """
    for search_text in [_contact_zone(text), text]:
        for m in _PHONE_RE.finditer(search_text):
            raw = m.group(1).strip()
            digits = sum(c.isdigit() for c in raw)
            # Must have 10-15 digits (international numbers)
            if digits < 10 or digits > 15:
                continue
            # Reject if it looks like a year range (e.g. 2019-2023)
            if re.fullmatch(r"\d{4}[\s\-]\d{4}", raw.strip()):
                continue
            return raw
    return None


def _extract_name(text: str) -> str | None:
    """
    Extract candidate name — scans first 15 lines.
    Handles: normal case, ALL CAPS, hyphenated names.
    Skips lines with emails, URLs, phone numbers, or heading words.
    """
    lines = text.splitlines()[:15]
    for line in lines:
        line = line.strip()
        if not line or len(line) > 55:
            continue
        # Skip lines with contact info
        if "@" in line or "http" in line or "/" in line:
            continue
        if _PHONE_RE.search(line):
            continue
        words = line.split()
        if len(words) < 2 or len(words) > 5:
            continue
        if any(c.isdigit() for c in line):
            continue
        if any(c in line for c in "|\\<>{}[]#$%"):
            continue
        if line.lower().rstrip(":") in _HEADING_WORDS_SET:
            continue
        # ALL CAPS names (common in Indian/international resumes)
        if line.isupper():
            if all(w.replace("-", "").isalpha() for w in words):
                return line.title()
            continue
        # Normal or title case — allow hyphens in names
        clean = [w.replace("-", "") for w in words]
        if all(w and w[0].isupper() and w.replace("'", "").isalpha() for w in clean):
            return line
    return None
