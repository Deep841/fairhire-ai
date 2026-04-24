import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Candidate


async def create(
    db: AsyncSession,
    full_name: str,
    email: str,
    resume_text: str | None,
    phone: str | None = None,
) -> Candidate:
    candidate = Candidate(
        full_name=full_name,
        email=email,
        phone=phone,
        resume_text=resume_text,
    )
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    return candidate


async def list_all(db: AsyncSession) -> list[Candidate]:
    result = await db.execute(select(Candidate))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, candidate_id: uuid.UUID) -> Candidate | None:
    return await db.get(Candidate, candidate_id)
