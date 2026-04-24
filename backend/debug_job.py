import asyncio
import traceback

async def main():
    try:
        from db.session import init_engine
        from db.models import Job, HRUser
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import select, text
        from config import settings

        engine = init_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

        async with Session() as db:
            # Check jobs table columns
            result = await db.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'jobs'
                ORDER BY ordinal_position
            """))
            cols = result.fetchall()
            print("jobs table columns:")
            for c in cols:
                print(f"  {c[0]} ({c[1]}) nullable={c[2]}")

            # Get HR user
            result = await db.execute(select(HRUser).limit(1))
            user = result.scalar_one_or_none()
            print(f"\nHR user: {user.email if user else 'NONE'}")

            if user:
                job = Job(
                    title='Test Job',
                    description='Test JD',
                    deadline=None,
                    status='draft',
                    created_by=user.id,
                )
                db.add(job)
                await db.commit()
                await db.refresh(job)
                print(f"Job created: {job.id}, title={job.title}, status={job.status}")

        await engine.dispose()
        print("\nALL OK")

    except Exception as e:
        print(f"\nERROR: {type(e).__name__}: {e}")
        traceback.print_exc()

asyncio.run(main())
