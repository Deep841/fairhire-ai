from __future__ import annotations

import uuid
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Candidate


async def get_or_create(
    db: AsyncSession,
    full_name: str,
    email: str,
    resume_text: str | None,
    phone: str | None = None,
) -> tuple[Candidate, bool]:
    """
    Returns (candidate, created).
    If a candidate with same email OR phone exists, updates their record.
    Otherwise creates a new one.
    """
    # Build dedup query — match on email, or phone if provided
    conditions = [Candidate.email == email]
    if phone:
        conditions.append(Candidate.phone == phone)

    result = await db.execute(
        select(Candidate).where(or_(*conditions)).limit(1)
    )
    existing = result.scalars().first()

    if existing:
        # Update with latest info
        existing.full_name = full_name
        existing.resume_text = resume_text
        if phone:
            existing.phone = phone
        await db.commit()
        await db.refresh(existing)
        return existing, False

    # Create new
    candidate = Candidate(
        full_name=full_name,
        email=email,
        phone=phone,
        resume_text=resume_text,
    )
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    return candidate, True


async def create(
    db: AsyncSession,
    full_name: str,
    email: str,
    resume_text: str | None,
    phone: str | None = None,
) -> Candidate:
    """Legacy create — raises IntegrityError on duplicate email."""
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
