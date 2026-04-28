import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from config import settings
import requests
import urllib3
urllib3.disable_warnings()

print("RESEND_API_KEY:", settings.RESEND_API_KEY[:12] + "..." if settings.RESEND_API_KEY else "NOT SET")

resp = requests.post(
    "https://api.resend.com/emails",
    headers={
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "from": settings.RESEND_FROM_EMAIL,
        "to": ["kumardeep2003@gmail.com"],
        "subject": "FairHire AI — Email Test",
        "html": "<h2>Email is working!</h2><p>Resend + FairHire AI configured correctly.</p>",
    },
    verify=False,
    timeout=15,
)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")
