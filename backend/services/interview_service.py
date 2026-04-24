import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Interview


async def create(
    db: AsyncSession,
    candidate_id: uuid.UUID,
    job_id: uuid.UUID,
    application_id: uuid.UUID | None = None,
    round_number: int = 1,
    interviewer_id: uuid.UUID | None = None,
    status: str = "scheduled",
    scheduled_at: datetime | None = None,
    meet_link: str | None = None,
    notes: str | None = None,
) -> Interview:
    interview = Interview(
        candidate_id=candidate_id,
        job_id=job_id,
        application_id=application_id,
        round_number=round_number,
        interviewer_id=interviewer_id,
        status=status,
        scheduled_at=scheduled_at,
        meet_link=meet_link,
        notes=notes,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return interview


async def list_by_job(db: AsyncSession, job_id: uuid.UUID) -> list[Interview]:
    result = await db.execute(
        select(Interview).where(Interview.job_id == job_id)
        .order_by(Interview.scheduled_at.asc().nullslast())
    )
    return list(result.scalars().all())


async def list_all(db: AsyncSession) -> list[Interview]:
    result = await db.execute(select(Interview))
    return list(result.scalars().all())
