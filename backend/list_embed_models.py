import sys
sys.path.insert(0, ".")
from google import genai
from config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)
for m in client.models.list():
    if "embedContent" in (m.supported_actions or []):
        print(m.name)
