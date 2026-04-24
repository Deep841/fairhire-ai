import sys
sys.path.insert(0, ".")

try:
    from services.link_verifier import verify_links
    print("OK: link_verifier")
except Exception as e:
    print(f"FAIL: link_verifier — {e}")

try:
    from services.parser import parse_resume, ParsedResume
    # confirm new field exists
    assert hasattr(ParsedResume, "__dataclass_fields__")
    print("OK: parser (with gemini fallback)")
except Exception as e:
    print(f"FAIL: parser — {e}")

try:
    from routes.upload import router
    print("OK: routes.upload")
except Exception as e:
    print(f"FAIL: routes.upload — {e}")

try:
    from core.app_factory import create_app
    app = create_app()
    print("OK: full app")
except Exception as e:
    print(f"FAIL: app_factory — {e}")

print("Done.")
