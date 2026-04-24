import urllib.request
import urllib.error
import json

BASE = "http://127.0.0.1:8000"

def get(path):
    try:
        r = urllib.request.urlopen(f"{BASE}{path}", timeout=3)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:200]
    except Exception as e:
        return "ERR", str(e)

def post(path, data, headers=None):
    try:
        body = json.dumps(data).encode()
        req = urllib.request.Request(
            f"{BASE}{path}", data=body,
            headers={"Content-Type": "application/json", **(headers or {})}
        )
        r = urllib.request.urlopen(req, timeout=5)
        return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]
    except Exception as e:
        return "ERR", str(e)

print("=" * 60)
print("FAIRHIRE AI — SYSTEM STATUS CHECK")
print("=" * 60)

# 1. Health
code, body = get("/health")
print(f"\n1. Health:          {code} — {body}")

# 2. OpenAPI (confirms all routes loaded)
code, body = get("/openapi.json")
if code == 200:
    print(f"2. Routes loaded:   {code} — {len(body.get('paths', {}))} endpoints")
else:
    print(f"2. Routes:          {code} — {body}")

# 3. Auth register
code, body = post("/api/v1/auth/register", {
    "email": "statuscheck@test.com",
    "password": "testpass123",
    "full_name": "Status Check",
    "role": "hr"
})
print(f"3. Auth register:   {code} — {str(body)[:100]}")

# 4. Auth login
code, body = post("/api/v1/auth/login",
    "username=statuscheck@test.com&password=testpass123",
    headers={"Content-Type": "application/x-www-form-urlencoded"}
)
# login uses form data, need different approach
import urllib.parse
try:
    form = urllib.parse.urlencode({"username": "statuscheck@test.com", "password": "testpass123"}).encode()
    req = urllib.request.Request(
        f"{BASE}/api/v1/auth/login", data=form,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    r = urllib.request.urlopen(req, timeout=5)
    data = json.loads(r.read())
    token = data.get("access_token", "")
    print(f"4. Auth login:      200 — token={token[:30]}...")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:200]
    print(f"4. Auth login:      {e.code} — {body}")
    token = ""
except Exception as e:
    print(f"4. Auth login:      ERR — {e}")
    token = ""

# 5. Jobs list (needs auth)
if token:
    try:
        req = urllib.request.Request(
            f"{BASE}/api/v1/jobs",
            headers={"Authorization": f"Bearer {token}"}
        )
        r = urllib.request.urlopen(req, timeout=3)
        jobs = json.loads(r.read())
        print(f"5. Jobs list:       200 — {len(jobs)} jobs in DB")
    except urllib.error.HTTPError as e:
        print(f"5. Jobs list:       {e.code} — {e.read().decode()[:100]}")
    except Exception as e:
        print(f"5. Jobs list:       ERR — {e}")

    # 6. Create job
    try:
        body = json.dumps({"title": "Test Job", "description": "Test JD", "status": "draft"}).encode()
        req = urllib.request.Request(
            f"{BASE}/api/v1/jobs", data=body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
        )
        r = urllib.request.urlopen(req, timeout=5)
        job = json.loads(r.read())
        print(f"6. Create job:      201 — id={str(job.get('id',''))[:8]}... title={job.get('title')}")
    except urllib.error.HTTPError as e:
        print(f"6. Create job:      {e.code} — {e.read().decode()[:200]}")
    except Exception as e:
        print(f"6. Create job:      ERR — {e}")

print("\n" + "=" * 60)
