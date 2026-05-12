# ============================================
# Nivaran — classifier.py
# Classification pipeline:
#   1. Google Gemini (FREE 1,500 req/day — needs GEMINI_API_KEY from aistudio.google.com)
#   2. OpenRouter AI (if OPENROUTER_API_KEY set)
#   3. Keyword fallback (always works, no key needed)
# ============================================
import json
import os
import requests

OPENROUTER_URL  = 'https://openrouter.ai/api/v1/chat/completions'
OPENROUTER_MODEL  = 'mistralai/mistral-7b-instruct:free'
FALLBACK_MODEL    = 'google/gemma-2-9b-it:free'
GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

SYSTEM_PROMPT = """You are a government complaint classifier for India.
You will receive complaint text IN ENGLISH. Classify it and respond with ONLY this exact JSON
(no markdown, no extra text, no explanation):

{
  "category": "one of: Water Supply | Electricity | Roads | Sanitation | Parks | Police | Health | Education | Transport | Other",
  "department": "exact department name (e.g. Fire Services, Jal Nigam, PWD, DISCOM, Municipal Corporation, Health Department, Police Department, General Administration)",
  "urgency": "HIGH | MEDIUM | LOW",
  "summary": "1-2 sentence plain English summary of the specific issue",
  "confidence": 0.9
}

Category rules:
- Health: hospital, doctor, medicine, ambulance, heart attack, injury, medical emergency, disease, clinic
- Water Supply: water pipe, leak, no water, drainage, sewage, flood
- Electricity: power cut, electricity, wire, transformer, shock
- Roads: pothole, road, footpath, bridge, street
- Sanitation: garbage, toilet, drain, waste, sewage smell
- Police: crime, theft, harassment, safety, violence, attack
- Fire/Emergency: fire, blast, gas leak → Other → Fire Services
- Parks: park, garden, playground, tree
- Transport: bus, auto, traffic, signal

Urgency:
- HIGH: fire, flood, accident, death, heart attack, emergency, sewage overflow, collapsed structure, no water 3+ days, gas leak, electrocution, violence
- MEDIUM: broken infrastructure, pending 1+ week, public inconvenience
- LOW: minor requests, suggestions, cosmetic issues

Output ONLY valid JSON. No markdown. No explanation."""


def classify_complaint(english_text: str) -> dict:
    """
    Classify a complaint given in English.
    Returns: category, department, urgency, summary, confidence.
    """
    # 1. Try Gemini (free tier — 1,500 req/day, very reliable)
    gemini_key = os.getenv('GEMINI_API_KEY', '')
    if gemini_key:
        result = _try_gemini(english_text, gemini_key)
        if result:
            return result
        print('[Classifier] Gemini failed, trying OpenRouter...')

    # 2. Try OpenRouter
    openrouter_key = os.getenv('OPENROUTER_API_KEY', '')
    if openrouter_key:
        for model in [OPENROUTER_MODEL, FALLBACK_MODEL]:
            result = _try_openrouter(english_text, model, openrouter_key)
            if result:
                return result
            print(f'[Classifier] {model} failed, trying next...')

    if not gemini_key and not openrouter_key:
        print('[Classifier] No API keys set — using keyword fallback')
        print('[Classifier] Tip: Set GEMINI_API_KEY in .env for free AI classification')

    print('[Classifier] All AI methods failed — using keyword fallback')
    return _fallback_classify(english_text)


def _try_gemini(text: str, api_key: str) -> dict | None:
    """Use Google Gemini 1.5 Flash — free tier, 1,500 requests/day."""
    try:
        resp = requests.post(
            f'{GEMINI_URL}?key={api_key}',
            headers={'Content-Type': 'application/json'},
            json={
                'contents': [{
                    'parts': [{
                        'text': SYSTEM_PROMPT + f'\n\nClassify this complaint:\n\n"{text}"'
                    }]
                }],
                'generationConfig': {
                    'temperature': 0.1,
                    'maxOutputTokens': 350,
                },
            },
            timeout=20,
        )
        if not resp.ok:
            print(f'[Classifier] Gemini → HTTP {resp.status_code}: {resp.text[:120]}')
            return None

        raw = resp.json()['candidates'][0]['content']['parts'][0]['text'].strip()
        return _parse_classification(raw, 'Gemini')
    except Exception as e:
        print(f'[Classifier] Gemini error: {e}')
        return None


def _try_openrouter(text: str, model: str, api_key: str) -> dict | None:
    """Use OpenRouter free models as backup."""
    try:
        resp = requests.post(
            OPENROUTER_URL,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://nivaran.gov.in',
                'X-Title': 'Nivaran Grievance System',
            },
            json={
                'model': model,
                'max_tokens': 350,
                'temperature': 0.1,
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user',   'content': f'Classify this complaint:\n\n"{text}"'},
                ],
            },
            timeout=20,
        )
        if not resp.ok:
            print(f'[Classifier] {model} → HTTP {resp.status_code}')
            return None

        raw = resp.json()['choices'][0]['message']['content'].strip()
        return _parse_classification(raw, model)
    except Exception as e:
        print(f'[Classifier] {model} error: {e}')
        return None


def _parse_classification(raw: str, source: str) -> dict | None:
    """Parse and validate a JSON classification response."""
    try:
        raw = raw.replace('```json', '').replace('```', '').strip()
        start, end = raw.find('{'), raw.rfind('}')
        if start == -1 or end == -1:
            return None
        result = json.loads(raw[start:end + 1])
        for k in ('category', 'department', 'urgency', 'summary'):
            if k not in result:
                raise ValueError(f'Missing key: {k}')

        summary = str(result.get('summary', '')).strip()
        generic = ['citizen has filed a grievance', 'grievance requiring review', 'filed a grievance']
        if not summary or any(p in summary.lower() for p in generic):
            cat  = result.get('category', 'Other')
            dept = result.get('department', 'General Administration')
            summary = f'Citizen reports a {cat.lower()} issue requiring attention from {dept}.'

        print(f'[Classifier] {source} → urgency={result["urgency"]} category={result["category"]}')
        return {
            'category':   str(result.get('category',   'Other')),
            'department': str(result.get('department', 'General Administration')),
            'urgency':    str(result.get('urgency',    'MEDIUM')),
            'summary':    summary,
            'confidence': float(result.get('confidence', 0.8)),
        }
    except Exception as e:
        print(f'[Classifier] Parse error from {source}: {e}')
        return None


def _fallback_classify(text: str) -> dict:
    """Keyword-based fallback — always works, no internet needed."""
    t = text.lower()

    rules = [
        (['heart attack', 'heart', 'cardiac', 'ambulance', 'emergency', 'hospital',
          'health', 'doctor', 'medicine', 'injury', 'accident', 'unconscious', 'bleeding', 'ill', 'sick'],
         'Health', 'Health Department'),
        (['fire', 'blast', 'explosion', 'burn', 'burning', 'smoke'],
         'Other', 'Fire Services'),
        (['water', 'pipe', 'leak', 'supply', 'drainage', 'sewage', 'nali', 'flood'],
         'Water Supply', 'Jal Nigam'),
        (['electric', 'electricity', 'wire', 'transformer', 'cable', 'current', 'power', 'shock', 'light'],
         'Electricity', 'DISCOM'),
        (['road', 'pothole', 'footpath', 'bridge', 'street', 'highway', 'gutter', 'divider'],
         'Roads', 'PWD'),
        (['garbage', 'sanitation', 'toilet', 'drain', 'waste', 'sweep', 'sewer', 'dirty'],
         'Sanitation', 'Municipal Corporation'),
        (['park', 'garden', 'playground', 'tree'],
         'Parks', 'Parks Department'),
        (['police', 'crime', 'theft', 'harassment', 'safety', 'loot', 'attack', 'violence'],
         'Police', 'Police Department'),
        (['school', 'education', 'teacher', 'student', 'college'],
         'Education', 'Education Department'),
        (['bus', 'transport', 'auto', 'traffic', 'signal', 'vehicle'],
         'Transport', 'Transport Department'),
    ]

    for keywords, category, department in rules:
        if any(kw in t for kw in keywords):
            high_kws = ['heart attack', 'cardiac', 'fire', 'blast', 'ambulance',
                        'emergency', 'unconscious', 'bleeding', 'flood', 'collapse']
            urgency = 'HIGH' if any(kw in t for kw in high_kws) else 'MEDIUM'
            return {
                'category':   category,
                'department': department,
                'urgency':    urgency,
                'summary':    f'Citizen reports a {category.lower()} issue requiring attention from {department}.',
                'confidence': 0.5,
            }

    return {
        'category':   'Other',
        'department': 'General Administration',
        'urgency':    'MEDIUM',
        'summary':    'Citizen has filed a general grievance requiring review.',
        'confidence': 0.3,
    }
