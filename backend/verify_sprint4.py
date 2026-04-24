import sys
sys.path.insert(0, ".")

tests = [
    ("services.profile_extractor", "extract_profile, CandidateProfile"),
    ("services.notification_service", "send_application_acknowledgement, send_interview_confirmation, send_rejection"),
    ("services.candidate_service", "create, list_all, get_by_id"),
    ("services.interview_service", "create, list_all"),
    ("routes.candidates", "router"),
    ("routes.interviews", "router"),
    ("routes.upload", "router"),
    ("db.models", "Candidate, Job, Interview"),
    ("config", "settings"),
]

for module, names in tests:
    try:
        mod = __import__(module, fromlist=names.split(", "))
        for name in names.split(", "):
            assert hasattr(mod, name.strip()), f"missing {name}"
        print(f"OK: {module}")
    except Exception as e:
        print(f"FAIL: {module} -- {e}")

# Verify new fields exist
from services.profile_extractor import CandidateProfile
p = CandidateProfile(skills=(), education=(), certifications=(), experience_years=None,
                     full_name="John Doe", email="john@example.com", phone="+91 9876543210")
print(f"OK: CandidateProfile has name={p.full_name}, email={p.email}, phone={p.phone}")

from db.models import Candidate, Interview
assert hasattr(Candidate, "phone"), "Candidate missing phone"
assert hasattr(Interview, "scheduled_at"), "Interview missing scheduled_at"
assert hasattr(Interview, "meet_link"), "Interview missing meet_link"
assert hasattr(Interview, "notes"), "Interview missing notes"
print("OK: DB models have new fields")

# Verify SMTP config loads
from config import settings
print(f"OK: SMTP_ENABLED={settings.SMTP_ENABLED}, HOST={settings.SMTP_HOST}")

print("\nSprint 4 verification complete.")
