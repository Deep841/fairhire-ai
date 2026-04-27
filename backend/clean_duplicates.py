"""
Remove duplicate applications and candidates from the database.
Keeps the most recent application per candidate+job pair.
"""
import asyncio
from sqlalchemy import text
from db.session import init_engine
from config import settings

async def clean():
    engine = init_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        # Remove duplicate applications - keep latest per candidate+job
        await conn.execute(text("""
            DELETE FROM applications
            WHERE id NOT IN (
                SELECT DISTINCT ON (candidate_id, job_id) id
                FROM applications
                ORDER BY candidate_id, job_id, applied_at DESC
            )
        """))
        print("DONE: Duplicate applications removed")

        # Remove duplicate candidates - keep latest per email
        await conn.execute(text("""
            DELETE FROM candidates
            WHERE id NOT IN (
                SELECT DISTINCT ON (email) id
                FROM candidates
                ORDER BY email, id DESC
            )
        """))
        print("DONE: Duplicate candidates removed")

        r1 = await conn.execute(text("SELECT COUNT(*) FROM applications"))
        r2 = await conn.execute(text("SELECT COUNT(*) FROM candidates"))
        print(f"Applications remaining: {r1.scalar()}")
        print(f"Candidates remaining: {r2.scalar()}")

    await engine.dispose()

asyncio.run(clean())
