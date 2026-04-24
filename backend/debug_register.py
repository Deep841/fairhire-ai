import asyncio
import sys

async def main():
    try:
        # Test DB connection first
        import asyncpg
        conn = await asyncpg.connect(
            host='localhost', port=5432,
            user='postgres', password='postgres',
            database='facehire'
        )
        print("DB connection: OK")
        
        # Check hr_users table exists
        result = await conn.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='hr_users'"
        )
        print(f"hr_users table exists: {result == 1}")
        
        # Try inserting a test user directly
        import uuid
        from passlib.context import CryptContext
        pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed = pwd.hash("testpass123")
        
        test_id = uuid.uuid4()
        await conn.execute("""
            INSERT INTO hr_users (id, email, hashed_password, full_name, role, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (email) DO NOTHING
        """, test_id, "test@test.com", hashed, "Test User", "hr", True)
        print("Direct DB insert: OK")
        
        count = await conn.fetchval("SELECT COUNT(*) FROM hr_users")
        print(f"hr_users row count: {count}")
        
        await conn.close()
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(main())
