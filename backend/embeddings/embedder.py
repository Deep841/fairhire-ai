from google import genai
from config import settings

_client = genai.Client(api_key=settings.GEMINI_API_KEY)


def embed_text(text: str) -> list[float]:
    response = _client.models.embed_content(
        model=settings.EMBEDDING_MODEL,
        contents=text,
    )
    return response.embeddings[0].values
