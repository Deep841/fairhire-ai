import asyncio
import asyncpg

async def fix():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/fairhire")
    print("Connected")

    # Remove duplicate applications — keep the one with the highest score
    result = await conn.execute("""
        DELETE FROM applications a
        USING applications b
        WHERE a.id < b.id
          AND a.job_id = b.job_id
          AND a.candidate_id = b.candidate_id
    """)
    print(f"Duplicates removed: {result}")

    # Add unique constraint
    try:
        await conn.execute("""
            ALTER TABLE applications
            ADD CONSTRAINT uq_application_job_candidate
            UNIQUE (job_id, candidate_id)
        """)
        print("Unique constraint (job_id, candidate_id) added")
    except Exception as e:
        print(f"Constraint skipped (already exists): {e}")

    # Also deduplicate candidates by email
    result2 = await conn.execute("""
        DELETE FROM candidates a
        USING candidates b
        WHERE a.id < b.id
          AND a.email = b.email
    """)
    print(f"Duplicate candidates removed: {result2}")

    await conn.close()
    print("Done.")

asyncio.run(fix())
