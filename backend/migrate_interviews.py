import asyncio
from sqlalchemy import text
from db.session import init_engine
from config import settings

async def migrate():
    engine = init_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        # Add interviewer_name if missing
        await conn.execute(text(
            "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255)"
        ))
        print("OK: interviewer_name column ready")

        # Drop old interviewer_id FK if it exists
        await conn.execute(text(
            "ALTER TABLE interviews DROP COLUMN IF EXISTS interviewer_id"
        ))
        print("OK: old interviewer_id removed")

    await engine.dispose()
    print("Migration done - restart backend now")

asyncio.run(migrate())
