import sys
sys.path.insert(0, ".")

errors = []

modules = [
    "services.parser",
    "services.scoring_service",
    "services.jd_matcher",
    "services.link_verifier",
    "services.notification_service",
    "services.publisher_service",
    "routes.upload",
    "routes.match",
    "routes.candidates",
    "routes.jobs",
    "routes.interviews",
    "routes.publish",
    "routes.intake",
    "core.app_factory",
]

for m in modules:
    try:
        __import__(m)
        print(f"OK: {m}")
    except Exception as e:
        print(f"FAIL: {m} -- {e}")
        errors.append(m)

if errors:
    print(f"\n{len(errors)} module(s) failed: {errors}")
else:
    print("\nAll modules OK — server should start cleanly.")
