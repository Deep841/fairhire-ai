import sys
sys.path.insert(0, ".")

try:
    from services.scoring_service import score_impact
    print("OK: scoring_service")
except Exception as e:
    print(f"FAIL: scoring_service — {e}")

try:
    from services.jd_matcher import match_candidate_to_jd, MatchResult
    print("OK: jd_matcher")
except Exception as e:
    print(f"FAIL: jd_matcher — {e}")

try:
    from routes.match import router
    print("OK: routes.match")
except Exception as e:
    print(f"FAIL: routes.match — {e}")

try:
    from core.app_factory import create_app
    app = create_app()
    print("OK: app_factory / full app")
except Exception as e:
    print(f"FAIL: app_factory — {e}")

print("Done.")
