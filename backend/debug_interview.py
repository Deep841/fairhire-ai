import asyncio
import httpx

BASE = "http://localhost:8000/api/v1"

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{BASE}/auth/login",
            data={"username": "deep@test.com", "password": "deep1234"})
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get a real application id
        r = await client.get(f"{BASE}/jobs/", headers=headers)
        job_id = r.json()[0]["id"]
        r = await client.get(f"{BASE}/applications/?job_id={job_id}", headers=headers)
        apps = r.json()
        if not apps:
            print("No applications")
            return
        app = apps[0]
        print(f"Testing with candidate: {app['candidate_name']}, app_id: {app['id']}")

        # Try scheduling interview
        payload = {
            "candidate_id": app["candidate_id"],
            "job_id": app["job_id"],
            "application_id": app["id"],
            "round_number": 1,
            "scheduled_at": "2026-04-29T10:00:00",
            "meet_link": "jhatuke.com",
            "interviewer_id": "dr.jhatuke",
            "notes": None,
        }
        r = await client.post(f"{BASE}/interviews/", headers=headers, json=payload)
        print(f"POST /interviews/ -> {r.status_code}")
        print(r.text[:500])

asyncio.run(test())
