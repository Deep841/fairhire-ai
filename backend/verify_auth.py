import asyncio

async def main():
    from services.auth_service import hash_password, create_access_token, verify_password
    from config import settings

    # Test bcrypt
    hashed = hash_password("testpass123")
    verified = verify_password("testpass123", hashed)
    print(f"bcrypt hash: OK")
    print(f"bcrypt verify: {verified}")

    # Test JWT
    token = create_access_token("test-id", "test@test.com", "hr")
    print(f"JWT token: OK ({token[:30]}...)")
    print(f"DB URL: {settings.DATABASE_URL}")

    # Test DB register flow end to end
    from db.session import init_engine, Base
    import db.models
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select
    from db.models import HRUser
    import uuid

    engine = init_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        # Check if user already exists
        result = await db.execute(select(HRUser).where(HRUser.email == "arpit.jain1@mphasis.com"))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"User already exists: {existing.email} (id={existing.id})")
        else:
            user = HRUser(
                email="arpit.jain1@mphasis.com",
                hashed_password=hash_password("testpass"),
                full_name="Arpit",
                role="hr",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"User created: {user.email} (id={user.id})")

    await engine.dispose()
    print("ALL OK - backend is ready")

asyncio.run(main())
