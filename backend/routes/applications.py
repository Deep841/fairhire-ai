"""
routes/applications.py

GET    /api/v1/applications?job_id=          — ranked list for a job
POST   /api/v1/applications                  — create (called by intake)
GET    /api/v1/applications/{id}             — single application detail
PATCH  /api/v1/applications/{id}/stage       — advance pipeline stage
POST   /api/v1/applications/{id}/test-score  — record assessment result
POST   /api/v1/applications/{id}/reject      — reject + send email
POST   /api/v1/applications/{id}/offer       — make offer + send email
"""
from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.models import Application, Candidate, Job
from services import application_service
from services.auth_service import get_current_user
from services.notification_service import send_rejection, send_offer, send_test_link
from services.offer_service import draft_offer_email
from db.models import HRUser

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ApplicationOut(BaseModel):
    id: str
    job_id: str
    candidate_id: str
    candidate_name: str
    candidate_email: str
    candidate_phone: str | None
    resume_score: float | None
    test_score: float | None
    interview_score: float | None
    hr_interview_score: float | None
    final_score: float | None
    stage: str
    status: str
    matched_skills: list[str]
    missing_skills: list[str]
    applied_at: str
    resume_weight: int
    test_weight: int


class CreateApplicationIn(BaseModel):
    job_id: uuid.UUID
    candidate_id: uuid.UUID
    resume_score: float | None = None
    matched_skills: list[str] = []
    missing_skills: list[str] = []


class StageIn(BaseModel):
    stage: str


class TestScoreIn(BaseModel):
    test_score: float


class SendTestLinkIn(BaseModel):
    test_link: str
    deadline: str | None = None


class WeightsIn(BaseModel):
    resume_weight: int
    test_weight: int


class OfferDraftOut(BaseModel):
    draft: str
    candidate_name: str
    job_title: str


class SendOfferIn(BaseModel):
    draft: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _enrich(db: AsyncSession, app: Application) -> ApplicationOut:
    candidate: Candidate | None = await db.get(Candidate, app.candidate_id)
    return ApplicationOut(
        id=str(app.id),
        job_id=str(app.job_id),
        candidate_id=str(app.candidate_id),
        candidate_name=candidate.full_name if candidate else "Unknown",
        candidate_email=candidate.email if candidate else "",
        candidate_phone=candidate.phone if candidate else None,
        resume_score=app.resume_score,
        test_score=app.test_score,
        interview_score=app.interview_score,
        hr_interview_score=app.hr_interview_score,
        final_score=app.final_score,
        stage=app.stage,
        status=app.status,
        matched_skills=app.matched_skills or [],
        missing_skills=app.missing_skills or [],
        applied_at=app.applied_at.isoformat(),
        resume_weight=app.resume_weight,
        test_weight=app.test_weight,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[ApplicationOut])
async def list_applications(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> list[ApplicationOut]:
    apps = await application_service.list_by_job(db, job_id)
    return [await _enrich(db, a) for a in apps]


@router.get("/by-candidate/{candidate_id}", response_model=list[ApplicationOut])
async def list_by_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> list[ApplicationOut]:
    from sqlalchemy import select
    result = await db.execute(
        select(Application).where(Application.candidate_id == candidate_id)
        .order_by(Application.applied_at.desc())
    )
    apps = list(result.scalars().all())
    return [await _enrich(db, a) for a in apps]


@router.post("/", response_model=ApplicationOut, status_code=201)
async def create_application(
    body: CreateApplicationIn,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> ApplicationOut:
    app = await application_service.create(
        db,
        job_id=body.job_id,
        candidate_id=body.candidate_id,
        resume_score=body.resume_score,
        matched_skills=body.matched_skills,
        missing_skills=body.missing_skills,
    )
    return await _enrich(db, app)


@router.get("/{app_id}", response_model=ApplicationOut)
async def get_application(
    app_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> ApplicationOut:
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return await _enrich(db, app)


@router.patch("/{app_id}/stage", response_model=ApplicationOut)
async def advance_stage(
    app_id: uuid.UUID,
    body: StageIn,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> ApplicationOut:
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app = await application_service.update_stage(db, app, body.stage)
    return await _enrich(db, app)


@router.post("/webhook/test-score", response_model=ApplicationOut)
async def test_score_webhook(
    body: TestScoreIn,
    app_id: uuid.UUID = Query(..., description="Application UUID — provided by the test platform callback URL"),
    db: AsyncSession = Depends(get_db),
) -> ApplicationOut:
    """Public webhook — called by HackerRank/Mettl/any test platform to auto-ingest scores."""
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app = await application_service.record_test_score(db, app, body.test_score)
    return await _enrich(db, app)


@router.post("/{app_id}/test-score", response_model=ApplicationOut)
async def record_test_score(
    app_id: uuid.UUID,
    body: TestScoreIn,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> ApplicationOut:
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app = await application_service.record_test_score(db, app, body.test_score)
    return await _enrich(db, app)


@router.post("/{app_id}/reject", response_model=ApplicationOut)
async def reject_application(
    app_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> ApplicationOut:
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app = await application_service.update_stage(db, app, "rejected", status="rejected")
    # Fire rejection email
    candidate: Candidate | None = await db.get(Candidate, app.candidate_id)
    job: Job | None = await db.get(Job, app.job_id)
    if candidate and job:
        await send_rejection(candidate.email, candidate.full_name, job.title)
    return await _enrich(db, app)


@router.post("/{app_id}/offer", response_model=ApplicationOut)
async def make_offer(
    app_id: uuid.UUID,
    body: SendOfferIn,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> ApplicationOut:
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app = await application_service.update_stage(db, app, "offered", status="offered")
    candidate: Candidate | None = await db.get(Candidate, app.candidate_id)
    job: Job | None = await db.get(Job, app.job_id)
    if candidate and job:
        await send_offer(candidate.email, candidate.full_name, job.title, body.draft)
    return await _enrich(db, app)


@router.post("/{app_id}/send-test-link", response_model=ApplicationOut)
async def send_test_link_route(
    app_id: uuid.UUID,
    body: SendTestLinkIn,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> ApplicationOut:
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    candidate: Candidate | None = await db.get(Candidate, app.candidate_id)
    job: Job | None = await db.get(Job, app.job_id)
    if candidate and job:
        await send_test_link(
            candidate_email=candidate.email,
            candidate_name=candidate.full_name,
            job_title=job.title,
            test_link=body.test_link,
            deadline=body.deadline,
        )
    app = await application_service.update_stage(db, app, "test_sent")
    return await _enrich(db, app)


@router.patch("/{app_id}/weights", response_model=ApplicationOut)
async def update_weights(
    app_id: uuid.UUID,
    body: WeightsIn,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> ApplicationOut:
    """HR configures resume vs test score weighting per application."""
    if body.resume_weight + body.test_weight != 100:
        raise HTTPException(status_code=400, detail="resume_weight + test_weight must equal 100")
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    app.resume_weight = body.resume_weight
    app.test_weight = body.test_weight
    app.final_score = application_service._compute_final(app)
    await db.commit()
    await db.refresh(app)
    return await _enrich(db, app)


@router.get("/{app_id}/offer-draft", response_model=OfferDraftOut)
async def get_offer_draft(
    app_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: HRUser = Depends(get_current_user),
) -> OfferDraftOut:
    """Generate a Gemini-drafted personalised offer email for HR to review."""
    app = await application_service.get_by_id(db, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    candidate: Candidate | None = await db.get(Candidate, app.candidate_id)
    job: Job | None = await db.get(Job, app.job_id)
    if not candidate or not job:
        raise HTTPException(status_code=404, detail="Candidate or job not found")
    draft = await draft_offer_email(
        candidate_name=candidate.full_name,
        job_title=job.title,
        matched_skills=app.matched_skills or [],
        final_score=app.final_score or 0,
    )
    return OfferDraftOut(draft=draft, candidate_name=candidate.full_name, job_title=job.title)
