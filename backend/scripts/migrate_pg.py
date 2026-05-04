import asyncio
import asyncpg

async def migrate():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5432/fairhire")
    print("Connected to PostgreSQL")

    migrations = [
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS score_impact FLOAT",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS score_semantic FLOAT",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS score_skill FLOAT",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS score_cert FLOAT",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS score_experience FLOAT",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_quality_score INTEGER",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500)",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS resume_weight INTEGER DEFAULT 60",
        "ALTER TABLE applications ADD COLUMN IF NOT EXISTS test_weight INTEGER DEFAULT 40",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id)",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS interviewer_name VARCHAR(255)",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published_platforms JSONB DEFAULT '[]'",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS form_url VARCHAR(1000)",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by UUID",
    ]

    for sql in migrations:
        try:
            await conn.execute(sql)
            print(f"  OK : {sql[:72]}")
        except Exception as e:
            print(f"  SKIP: {str(e)[:80]}")

    await conn.close()
    print("\nMigration complete.")

asyncio.run(migrate())
