import sys
sys.path.insert(0, ".")

tests = [
    ("services.publisher_service", "publish_linkedin, publish_naukri, publish_x, create_google_form"),
    ("routes.publish", "router"),
    ("routes.intake", "router"),
    ("config", "settings"),
    ("core.app_factory", "create_app"),
]

for module, names in tests:
    try:
        mod = __import__(module, fromlist=names.split(", "))
        for name in [n.strip() for n in names.split(",")]:
            assert hasattr(mod, name), f"missing {name}"
        print(f"OK: {module}")
    except Exception as e:
        print(f"FAIL: {module} -- {e}")

from config import settings
print(f"OK: X_ENABLED={settings.X_ENABLED}")
print(f"OK: GOOGLE_FORMS_ENABLED={settings.GOOGLE_FORMS_ENABLED}")

from services.publisher_service import publish_linkedin, publish_naukri
r = publish_linkedin("Senior Engineer", "We need a Python expert.", "https://forms.google.com/test")
assert r.success and "linkedin.com" in r.url
print(f"OK: LinkedIn URL generated: {r.url[:60]}...")

r2 = publish_naukri("Senior Engineer", "We need a Python expert.", None)
assert r2.success and "FairHire AI" in r2.message
print(f"OK: Naukri post generated ({len(r2.message)} chars)")

print("\nSprint 6 backend verification complete.")
