import json
import urllib.error
import urllib.request

import config

SYSTEM_PROMPT = (
    "You are the Indian Journeys AI Travel Assistant for an eco-tourism website. "
    "Help users with destination discovery, travel planning, booking guidance, route questions, "
    "and practical tourism suggestions in India. Keep replies concise, friendly, and useful. "
    "Prefer recommendations that fit nature, culture, scenic stays, and meaningful travel."
)


def is_gemini_configured() -> bool:
    return bool(config.GEMINI_API_KEY)


def chat_with_gemini(message: str) -> str:
    if not is_gemini_configured():
        raise RuntimeError("Gemini API is not configured. Add GEMINI_API_KEY in backend/.env and restart the backend.")

    request_url = f"{config.GEMINI_API_URL}/{config.GEMINI_MODEL}:generateContent"
    payload = {
        "system_instruction": {
            "parts": [
                {"text": SYSTEM_PROMPT},
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": message},
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 400,
        },
    }

    request = urllib.request.Request(
        request_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-goog-api-key": config.GEMINI_API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini API request failed with status {exc.code}. {error_body[:220]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError("Could not reach the Gemini API. Check your internet connection and API configuration.") from exc
    except Exception as exc:
        raise RuntimeError("Unexpected Gemini API error while generating a reply.") from exc

    candidates = body.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini API returned no candidates.")

    parts = (candidates[0].get("content") or {}).get("parts") or []
    content = " ".join(part.get("text", "").strip() for part in parts if part.get("text")).strip()

    if not content:
        raise RuntimeError("Gemini API returned an empty reply.")

    return content
