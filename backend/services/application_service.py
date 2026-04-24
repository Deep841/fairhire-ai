"""
services/application_service.py

CRUD + scoring logic for the Application pipeline entity.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Application


async def create(
    db: AsyncSession,
    job_id: uuid.UUID,
    candidate_id: uuid.UUID,
    resume_score: float | None = None,
    matched_skills: list[str] | None = None,
    missing_skills: list[str] | None = None,
) -> Application:
    app = Application(
        job_id=job_id,
        candidate_id=candidate_id,
        resume_score=resume_score,
        final_score=resume_score,  # starts as resume score until test/interview added
        matched_skills=matched_skills or [],
        missing_skills=missing_skills or [],
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    return app


async def get_by_id(db: AsyncSession, app_id: uuid.UUID) -> Application | None:
    return await db.get(Application, app_id)


async def list_by_job(db: AsyncSession, job_id: uuid.UUID) -> list[Application]:
    result = await db.execute(
        select(Application)
        .where(Application.job_id == job_id)
        .order_by(Application.final_score.desc().nullslast())
    )
    return list(result.scalars().all())


async def update_stage(
    db: AsyncSession,
    app: Application,
    stage: str,
    status: str | None = None,
) -> Application:
    app.stage = stage
    if status:
        app.status = status
    app.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(app)
    return app


async def record_test_score(
    db: AsyncSession,
    app: Application,
    test_score: float,
) -> Application:
    _STAGE_ORDER = ["applied", "shortlisted", "test_sent", "tested", "interview_1", "interview_2", "offered", "rejected"]
    app.test_score = test_score
    # Only advance to "tested", never regress a candidate already further along
    current_idx = _STAGE_ORDER.index(app.stage) if app.stage in _STAGE_ORDER else 0
    if current_idx < _STAGE_ORDER.index("tested"):
        app.stage = "tested"
    app.final_score = _compute_final(app)
    app.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(app)
    return app


async def record_interview_score(
    db: AsyncSession,
    app: Application,
    score: float,
    round_number: int,
) -> Application:
    _STAGE_ORDER = ["applied", "shortlisted", "test_sent", "tested", "interview_1", "interview_2", "offered", "rejected"]
    if round_number == 1:
        app.interview_score = score
        target_stage = "interview_1"
    else:
        app.hr_interview_score = score
        target_stage = "interview_2"
    # Only advance stage, never regress
    current_idx = _STAGE_ORDER.index(app.stage) if app.stage in _STAGE_ORDER else 0
    target_idx = _STAGE_ORDER.index(target_stage)
    if target_idx > current_idx:
        app.stage = target_stage
    app.final_score = _compute_final(app)
    app.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(app)
    return app


def _compute_final(app: Application) -> float:
    """
    Weighted composite score.
    Weights are stored on the application so HR can configure per-job.
    Only includes components that have been scored.
    interview_weight and hr_interview_weight mirror test_weight proportionally.
    """
    scores: list[tuple[float, float]] = []  # (score, weight)

    if app.resume_score is not None:
        scores.append((app.resume_score, app.resume_weight))
    if app.test_score is not None:
        scores.append((app.test_score, app.test_weight))
    if app.interview_score is not None:
        scores.append((app.interview_score, app.test_weight))  # same weight as test
    if app.hr_interview_score is not None:
        scores.append((app.hr_interview_score, app.resume_weight // 2))  # half of resume weight

    if not scores:
        return 0.0

    total_weight = sum(w for _, w in scores)
    return round(sum(s * w for s, w in scores) / total_weight, 1)
