import urllib.request
import urllib.error
import json
import time

# Wait for server
for i in range(10):
    try:
        r = urllib.request.urlopen("http://localhost:8000/health", timeout=2)
        print("Health:", r.read().decode())
        break
    except Exception:
        time.sleep(1)
else:
    print("FAIL: server did not start in time")
    raise SystemExit(1)

# Smoke test POST /api/v1/match/jd
payload = json.dumps({
    "candidate_profile": {
        "skills": ["Python", "FastAPI"],
        "education": ["Bachelor of Computer Science"],
        "certifications": [],
        "experience_years": 3,
        "resume_text": (
            "Reduced API latency by 40% by rewriting the caching layer. "
            "Led a team of 5 engineers to ship a payments feature used by 200k users. "
            "Automated deployment pipeline saving 3 hours per release."
        )
    },
    "job_description": "Senior Python engineer, FastAPI, 3+ years experience, build scalable APIs"
}).encode()

req = urllib.request.Request(
    "http://localhost:8000/api/v1/match/jd",
    data=payload,
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read().decode())
    print("\n--- Match Result ---")
    print(f"fit_score:         {data['fit_score']}")
    print(f"impact_score:      {data['impact_score']}")
    print(f"skill_overlap:     {data['skill_overlap_score']}")
    print(f"semantic:          {data['semantic_similarity_score']}")
    print(f"impact_highlights: {data['impact_highlights']}")
    print(f"explanation:       {json.dumps(data['explanation'], indent=2)}")
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode())
