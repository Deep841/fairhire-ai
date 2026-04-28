import asyncio
import httpx

BASE = "http://localhost:8000/api/v1"

async def test():
    async with httpx.AsyncClient() as client:
        # Login
        r = await client.post(f"{BASE}/auth/login",
            data={"username": "deep@test.com", "password": "deep1234"})
        if r.status_code != 200:
            # Try register
            r = await client.post(f"{BASE}/auth/register",
                json={"email": "deep@test.com", "password": "deep1234", "full_name": "Deep"})
        
        if r.status_code not in (200, 201):
            print(f"Auth failed: {r.status_code} {r.text}")
            return
        
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Token OK")

        # Get jobs
        r = await client.get(f"{BASE}/jobs/", headers=headers)
        print(f"GET /jobs/ -> {r.status_code}")
        if r.status_code != 200:
            print(r.text[:300])
            return
        
        jobs = r.json()
        if not jobs:
            print("No jobs found")
            return
        
        job_id = jobs[0]["id"]
        print(f"Job ID: {job_id}")

        # Test applications
        r = await client.get(f"{BASE}/applications/?job_id={job_id}", headers=headers)
        print(f"GET /applications/ -> {r.status_code}")
        if r.status_code != 200:
            print(r.text[:500])

        # Test interviews
        r = await client.get(f"{BASE}/interviews/?job_id={job_id}", headers=headers)
        print(f"GET /interviews/ -> {r.status_code}")
        if r.status_code != 200:
            print(r.text[:500])

asyncio.run(test())
