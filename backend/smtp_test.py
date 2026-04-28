import smtplib, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from config import settings

print(f"Host: {settings.SMTP_HOST}:{settings.SMTP_PORT}")
print(f"User: {settings.SMTP_USERNAME}")
print(f"Enabled: {settings.SMTP_ENABLED}")

try:
    server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
    server.ehlo()
    code, msg = server.starttls()
    print(f"STARTTLS: {code} {msg}")
    server.ehlo()
    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
    print("LOGIN: SUCCESS")
    server.quit()
except smtplib.SMTPAuthenticationError as e:
    print(f"AUTH FAILED: {e.smtp_code} {e.smtp_error}")
except smtplib.SMTPException as e:
    print(f"SMTP ERROR: {type(e).__name__}: {e}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
