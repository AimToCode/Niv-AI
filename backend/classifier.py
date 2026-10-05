# ============================================
# Nivaran — classifier.py
#
# Classification pipeline:
#   1. Google Gemini API
#   2. Keyword-based fallback
#
# OpenRouter is optional and not required.
# ============================================

import json
import os
import time
import requests



GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/gemini-flash-latest:generateContent"
)


SYSTEM_PROMPT = """
You are a government complaint classifier for India.

Classify the complaint and return ONLY valid JSON:
{
  "category": "Water Supply | Electricity | Roads | Sanitation | Parks | Police | Health | Education | Transport | Other",
  "department": "Responsible department name",
  "urgency": "HIGH | MEDIUM | LOW",
  "summary": "Specific 1-2 sentence summary of the complaint",
  "confidence": 0.9
}

CATEGORY RULES:
- Health: hospital, doctor, medicine, ambulance, injury, illness.
- Water Supply: no water, water supply, water pipeline, water leak.
- Electricity: power cut, electric wire, transformer, electrocution.
- Roads: potholes, damaged roads, footpaths, bridges, street damage.
- Sanitation: garbage, waste collection, dirty public places, blocked drains.
- Police: crime, theft, harassment, violence, public safety.
- Other + Fire Services: fire, explosion, gas leak.
- Parks: parks, gardens, playgrounds, public trees.
- Education: schools, colleges, teachers, educational facilities.
- Transport: buses, public transport, traffic signals, transport services.
- Other: issues not covered by the above categories.

URGENCY RULES:
- HIGH: immediate threat to life, fire, serious accident, electrocution,
  violence, major flooding, gas leak, collapsed structure.
- MEDIUM: damaged infrastructure, recurring service problems,
  public inconvenience, or unresolved complaints.
- LOW: suggestions, minor requests, and cosmetic issues.
- Roads: potholes and damaged roads should normally be MEDIUM.
- HIGH only if the road issue creates an immediate serious safety risk,
  such as a collapsed bridge or a major accident hazard.
- LOW only for minor cosmetic issues or suggestions.
- Never classify a significant broken road or large pothole as LOW
  unless the complaint clearly indicates that it is only cosmetic.

Use only the specified category and urgency values.
Do not invent facts or exaggerate severity.
Return ONLY JSON. No Markdown or explanation.
"""


VALID_CATEGORIES = {
    "Water Supply",
    "Electricity",
    "Roads",
    "Sanitation",
    "Parks",
    "Police",
    "Health",
    "Education",
    "Transport",
    "Other",
}

VALID_URGENCIES = {"HIGH", "MEDIUM", "LOW"}


def classify_complaint(english_text: str) -> dict:
    """
    Classify an English complaint.
    Gemini is tried first; keyword fallback is always available.
    """

    text = str(english_text or "").strip()

    if not text:
        return {
            "category": "Other",
            "department": "General Administration",
            "urgency": "LOW",
            "summary": "No complaint text was provided.",
            "confidence": 0.0,
        }

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    if gemini_key:
        result = _try_gemini(text, gemini_key)

        if result is not None:
            return result

        print("[Classifier] Gemini unavailable; using keyword fallback.")
    else:
        print("[Classifier] GEMINI_API_KEY missing; using keyword fallback.")

    return _fallback_classify(text)


def _try_gemini(text: str, api_key: str) -> dict | None:
    """Call Gemini, retrying temporary errors up to three times."""

    for attempt in range(3):
        try:
            response = requests.post(
                f"{GEMINI_URL}?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": (
                                        SYSTEM_PROMPT
                                        + "\n\nComplaint:\n"
                                        + text
                                    )
                                }
                            ]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.1,
                        "maxOutputTokens": 800,
                        "responseMimeType": "application/json",
                    },
                },
                timeout=25,
            )

            if response.ok:
                data = response.json()
                candidates = data.get("candidates", [])

                if not candidates:
                    print("[Classifier] Gemini returned no candidates.")
                    return None

                content = candidates[0].get("content", {})
                parts = content.get("parts", [])

                raw = "".join(
                    part.get("text", "")
                    for part in parts
                ).strip()

                if not raw:
                    print("[Classifier] Gemini returned empty text.")
                    return None

                return _parse_classification(raw, "Gemini")

            print(
                f"[Classifier] Gemini HTTP {response.status_code} "
                f"(attempt {attempt + 1}/3)"
            )

            # Retry only temporary server/rate-limit errors.
            retryable = response.status_code in {
                429, 500, 502, 503, 504
            }

            if not retryable:
                # Do not print the full response because it may
                # contain unnecessary diagnostic information.
                return None

        except requests.RequestException as error:
            print(
                f"[Classifier] Network error "
                f"(attempt {attempt + 1}/3): {error}"
            )

        except (ValueError, KeyError, TypeError, IndexError) as error:
            print(f"[Classifier] Gemini response error: {error}")
            return None

        if attempt < 2:
            time.sleep(attempt + 1)

    print("[Classifier] Gemini retries exhausted.")
    return None


def _parse_classification(raw: str, source: str) -> dict | None:
    """Parse, validate, and normalize the model's JSON response."""

    try:
        raw = raw.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()

        start = raw.find("{")
        end = raw.rfind("}")

        if start == -1 or end == -1 or end < start:
            print(f"[Classifier] No JSON found in {source} response.")
            return None

        result = json.loads(raw[start:end + 1])

        category = str(result.get("category", "Other")).strip()
        department = str(
            result.get("department", "General Administration")
        ).strip()
        urgency = str(result.get("urgency", "MEDIUM")).upper().strip()
        summary = str(result.get("summary", "")).strip()

        if category not in VALID_CATEGORIES:
            print(f"[Classifier] Invalid category from {source}.")
            return None

        if urgency not in VALID_URGENCIES:
            print(f"[Classifier] Invalid urgency from {source}.")
            return None

        if not department:
            department = "General Administration"

        if not summary:
            return None

        confidence = float(result.get("confidence", 0.8))
        confidence = max(0.0, min(1.0, confidence))

        print(
            f"[Classifier] {source} classification successful: "
            f"category={category}, urgency={urgency}"
        )

        return {
            "category": category,
            "department": department,
            "urgency": urgency,
            "summary": summary,
            "confidence": confidence,
        }

    except (ValueError, TypeError, json.JSONDecodeError) as error:
        print(f"[Classifier] Could not parse {source} response: {error}")
        return None


def _fallback_classify(text: str) -> dict:
    """
    Keyword-based fallback.
    Works without an AI API, but is less accurate than Gemini.
    """

    t = text.lower()

    # More specific rules should be checked before general rules.
    rules = [
        (
            [
                "heart attack", "cardiac arrest", "ambulance",
                "unconscious", "bleeding heavily", "medical emergency",
                "hospital emergency", "serious injury",
            ],
            "Health",
            "Health Department",
            "HIGH",
        ),
        (
            [
                "fire", "blaze", "explosion", "gas leak",
                "building collapse",
            ],
            "Other",
            "Fire Services",
            "HIGH",
        ),
        (
            [
                "electrocution", "electric shock", "live wire",
                "sparking wire", "fallen electric wire",
            ],
            "Electricity",
            "DISCOM",
            "HIGH",
        ),
        (
            [
                "flood", "flooding", "sewage overflow",
                "sewage overflowing",
            ],
            "Water Supply",
            "Municipal Corporation",
            "HIGH",
        ),
        (
            [
                "no water for 3 days", "no water for three days",
                "no water for 4 days", "no water for four days",
                "no water for 5 days", "no water for five days",
            ],
            "Water Supply",
            "Jal Nigam",
            "HIGH",
        ),
        (
            [
                "pothole", "damaged road", "broken road",
                "road damage", "broken bridge", "damaged footpath",
                "broken footpath",
            ],
            "Roads",
            "PWD",
            "MEDIUM",
        ),
        (
            [
                "no water", "water supply", "water shortage",
                "water pipeline", "water pipe leak", "water leakage",
            ],
            "Water Supply",
            "Jal Nigam",
            "MEDIUM",
        ),
        (
            [
                "power cut", "electricity", "electric wire",
                "transformer", "power outage", "no electricity",
                "street light not working",
            ],
            "Electricity",
            "DISCOM",
            "MEDIUM",
        ),
        (
            [
                "garbage", "rubbish", "waste collection",
                "dirty public place", "public toilet",
                "bad smell from garbage", "sewer blockage",
                "blocked drain", "drain is blocked",
            ],
            "Sanitation",
            "Municipal Corporation",
            "MEDIUM",
        ),
        (
            [
                "police", "theft", "robbery", "harassment",
                "violence", "criminal activity",
            ],
            "Police",
            "Police Department",
            "MEDIUM",
        ),
        (
            [
                "hospital", "doctor", "medicine", "clinic",
                "healthcare", "health center", "health centre",
            ],
            "Health",
            "Health Department",
            "MEDIUM",
        ),
        (
            [
                "school", "college", "teacher", "classroom",
                "education", "exam facility",
            ],
            "Education",
            "Education Department",
            "MEDIUM",
        ),
        (
            [
                "bus", "public transport", "transport service",
                "traffic signal", "bus stop",
            ],
            "Transport",
            "Transport Department",
            "MEDIUM",
        ),
        (
            [
                "park", "garden", "playground", "public tree",
            ],
            "Parks",
            "Parks Department",
            "LOW",
        ),
    ]

    for keywords, category, department, urgency in rules:
        if any(keyword in t for keyword in keywords):
            return {
                "category": category,
                "department": department,
                "urgency": urgency,
                "summary": (
                    f"Citizen reports a {category.lower()} issue "
                    f"requiring attention from {department}."
                ),
                "confidence": 0.5,
            }

    return {
        "category": "Other",
        "department": "General Administration",
        "urgency": "MEDIUM",
        "summary": (
            "The complaint requires review by the appropriate department."
        ),
        "confidence": 0.3,
    }
