import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        host='localhost', port=5432,
        user='postgres', password='postgres',
        database='facehire'
    )
    tables = await conn.fetch("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    results = ["Tables in facehire database:"]
    for t in tables:
        cols = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1 ORDER BY ordinal_position
        """, t['table_name'])
        col_names = [c['column_name'] for c in cols]
        results.append(f"  {t['table_name']}: {col_names}")
    
    output = "\n".join(results)
    print(output)
    with open("verify_tables.txt", "w") as f:
        f.write(output + "\n")
    await conn.close()

asyncio.run(main())
