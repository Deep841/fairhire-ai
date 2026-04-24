import asyncio
import asyncpg

async def test():
    results = []
    for pwd in ['postgres', 'admin', 'password', '1710', '12345', 'root', '']:
        try:
            conn = await asyncpg.connect(
                host='localhost', port=5432,
                user='postgres', password=pwd,
                database='postgres'
            )
            dbs = await conn.fetch("SELECT datname FROM pg_database WHERE datistemplate = false")
            db_names = [r['datname'] for r in dbs]
            results.append(f"PASSWORD WORKS: '{pwd}'")
            results.append(f"Databases: {db_names}")
            await conn.close()
            break
        except Exception as e:
            results.append(f"pwd='{pwd}': FAIL - {str(e)[:80]}")

    output = "\n".join(results)
    print(output)
    with open("pg_check_result.txt", "w") as f:
        f.write(output + "\n")

asyncio.run(test())
