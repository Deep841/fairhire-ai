import asyncio
from sqlalchemy import text
from db.session import init_engine
from config import settings

async def clean():
    engine = init_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        # Delete applications for corrupted candidate first
        await conn.execute(text(
            "DELETE FROM applications WHERE candidate_id IN "
            "(SELECT id FROM candidates WHERE email = 'mahajanamahajan2be22@thapar.edu')"
        ))
        # Delete the corrupted candidate
        await conn.execute(text(
            "DELETE FROM candidates WHERE email = 'mahajanamahajan2be22@thapar.edu'"
        ))
        print("DONE")

        r = await conn.execute(text("SELECT full_name, email FROM candidates ORDER BY full_name"))
        for row in r.fetchall():
            print(f"  {row[0]} | {row[1]}")

    await engine.dispose()

asyncio.run(clean())
