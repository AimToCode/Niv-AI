# ============================================
# Nivaran — translator.py
# Language detection: Unicode script ranges (offline, instant, no API)
# Translation pipeline:
#   1. deep-translator / Google Translate (FREE, no API key needed)
#   2. OpenRouter AI (if OPENROUTER_API_KEY set)
#   3. Return original text as last resort
# ============================================
import os
import requests

OPENROUTER_URL    = 'https://openrouter.ai/api/v1/chat/completions'
OPENROUTER_MODEL  = 'mistralai/mistral-7b-instruct:free'
FALLBACK_MODEL    = 'google/gemma-2-9b-it:free'

LANG_NAMES = {
    'hi': 'Hindi',     'bn': 'Bengali',    'gu': 'Gujarati',  'kn': 'Kannada',
    'ml': 'Malayalam', 'mr': 'Marathi',    'ne': 'Nepali',    'or': 'Odia',
    'pa': 'Punjabi',   'ta': 'Tamil',      'te': 'Telugu',    'ur': 'Urdu',
    'sa': 'Sanskrit',  'as': 'Assamese',   'kok':'Konkani',   'sd': 'Sindhi',
    'ks': 'Kashmiri',  'doi':'Dogri',      'mni':'Manipuri',  'sat':'Santali',
    'mai':'Maithili',  'brx':'Bodo',       'en': 'English',
}

# deep-translator uses standard ISO codes but some need mapping
_DEEP_LANG_MAP = {
    'or': 'odia', 'kok': 'konkani', 'doi': 'dogri',
    'mni': 'manipuri', 'sat': 'santali', 'mai': 'maithili',
    'brx': 'bodo', 'sa': 'sanskrit',
}


# ── 1. Offline Unicode script → language code ─────────────────────────────────
def detect_script_language(text: str) -> str:
    """
    Detect language from Unicode character ranges — no API, instant, reliable.
    Returns ISO 639-1 code, or 'en' if only ASCII is found.
    """
    counts = {
        'gu': 0, 'hi': 0, 'bn': 0, 'pa': 0, 'or': 0,
        'ta': 0, 'te': 0, 'kn': 0, 'ml': 0, 'ur': 0,
    }
    for ch in text:
        cp = ord(ch)
        if   0x0A80 <= cp <= 0x0AFF: counts['gu'] += 1
        elif 0x0900 <= cp <= 0x097F: counts['hi'] += 1
        elif 0x0980 <= cp <= 0x09FF: counts['bn'] += 1
        elif 0x0A00 <= cp <= 0x0A7F: counts['pa'] += 1
        elif 0x0B00 <= cp <= 0x0B7F: counts['or'] += 1
        elif 0x0B80 <= cp <= 0x0BFF: counts['ta'] += 1
        elif 0x0C00 <= cp <= 0x0C7F: counts['te'] += 1
        elif 0x0C80 <= cp <= 0x0CFF: counts['kn'] += 1
        elif 0x0D00 <= cp <= 0x0D7F: counts['ml'] += 1
        elif 0x0600 <= cp <= 0x06FF: counts['ur'] += 1

    best = max(counts, key=counts.get)
    if counts[best] > 0:
        print(f'[LangDetect] Script detected: {best} ({counts[best]} chars)')
        return best
    return 'en'


# ── 2. PRIMARY: deep-translator → Google Translate (free, no key) ─────────────
def _deep_translate(text: str, source_lang: str) -> str | None:
    """
    Translate using deep-translator's GoogleTranslator.
    Completely free, no API key required.
    """
    try:
        from deep_translator import GoogleTranslator
        # Map uncommon codes to what deep-translator understands
        src = _DEEP_LANG_MAP.get(source_lang, source_lang)
        translated = GoogleTranslator(source=src, target='en').translate(text)
        if translated and translated.strip().lower() != text.strip().lower():
            print(f'[Translator-Google] {source_lang}→en OK: {translated[:80]}')
            return translated.strip()
    except ImportError:
        print('[Translator-Google] deep-translator not installed — run: pip install deep-translator')
    except Exception as e:
        print(f'[Translator-Google] Failed: {e}')
    return None


# ── 3. SECONDARY: OpenRouter AI (if API key is configured) ────────────────────
def _openrouter_translate(text: str, source_lang: str) -> str | None:
    """
    Translate using OpenRouter AI — backup when deep-translator fails.
    Requires OPENROUTER_API_KEY in .env
    """
    api_key = os.getenv('OPENROUTER_API_KEY', '')
    if not api_key:
        return None

    lang_name = LANG_NAMES.get(source_lang, source_lang.upper())
    prompt = (
        f"Translate the following {lang_name} text to English. "
        f"Output ONLY the English translation — no explanation, no quotes, no prefix.\n\n{text}"
    )

    for model in [OPENROUTER_MODEL, FALLBACK_MODEL]:
        try:
            resp = requests.post(
                OPENROUTER_URL,
                headers={
                    'Authorization':  f'Bearer {api_key}',
                    'Content-Type':   'application/json',
                    'HTTP-Referer':   'https://nivaran.gov.in',
                    'X-Title':        'Nivaran Grievance System',
                },
                json={
                    'model':       model,
                    'messages':    [{'role': 'user', 'content': prompt}],
                    'max_tokens':  400,
                    'temperature': 0.1,
                },
                timeout=15,
            )
            if not resp.ok:
                continue
            result = resp.json()['choices'][0]['message']['content'].strip()
            for prefix in ['Translation:', 'English:', 'English translation:']:
                if result.lower().startswith(prefix.lower()):
                    result = result[len(prefix):].strip()
            if result and result.lower() != text.strip().lower():
                print(f'[Translator-OpenRouter] {model} {source_lang}→en OK')
                return result
        except Exception:
            continue
    return None


# ── Public API ─────────────────────────────────────────────────────────────────
def translate_to_english(text: str, source_lang: str) -> str:
    """
    Translate text from source_lang to English.
    Pipeline:
      1. Google Translate via deep-translator (FREE, no key, very reliable)
      2. OpenRouter AI (backup, needs OPENROUTER_API_KEY)
      3. Return original text
    """
    if not text or not text.strip() or source_lang == 'en':
        return text

    # PRIMARY: Google Translate (free, works for all Indian languages)
    result = _deep_translate(text, source_lang)
    if result:
        return result

    # SECONDARY: OpenRouter AI (if key is set)
    result = _openrouter_translate(text, source_lang)
    if result:
        return result

    print(f'[Translator] All methods failed — using original text for classification')
    return text
