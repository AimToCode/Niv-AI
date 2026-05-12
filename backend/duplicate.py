# ============================================
# NivAI — duplicate.py: Duplicate detection
# Uses difflib cosine-like similarity
# ============================================
import difflib
from datetime import datetime, timedelta, timezone


def check_duplicate(new_text: str, category: str, pincode: str, recent_complaints: list) -> dict:
    """
    Check if the new complaint is a duplicate of a recent one.
    recent_complaints: list of dicts from DynamoDB (last 7 days, same area).
    Returns: { is_duplicate: bool, duplicate_of: str|None, similarity: float }
    """
    if not recent_complaints or not new_text:
        return {'is_duplicate': False, 'duplicate_of': None, 'similarity': 0.0}

    new_text_clean = _clean(new_text)
    threshold = 0.78  # 78% similarity = duplicate

    for complaint in recent_complaints:
        # Must be same category (if provided)
        if category and complaint.get('category') and complaint['category'] != category:
            continue

        # Must be same pincode area (if provided)
        if pincode and complaint.get('pincode') and complaint['pincode'] != pincode:
            continue

        # Must be within last 7 days
        try:
            filed = datetime.fromisoformat(complaint['timestamp'])
            if (datetime.now(timezone.utc) - filed).days > 7:
                continue
        except (KeyError, ValueError):
            pass

        existing_text = _clean(complaint.get('original_text', '') or complaint.get('translated_text', ''))
        if not existing_text:
            continue

        similarity = difflib.SequenceMatcher(None, new_text_clean, existing_text).ratio()

        if similarity >= threshold:
            return {
                'is_duplicate': True,
                'duplicate_of': complaint.get('ticket_id', ''),
                'similarity': round(similarity, 3)
            }

    return {'is_duplicate': False, 'duplicate_of': None, 'similarity': 0.0}


def check_user_duplicate(new_text: str, contact: str, user_complaints: list, days: int = 30) -> dict:
    """
    Check if the SAME USER (by contact) has already filed a similar complaint.
    Runs BEFORE the pincode-area duplicate check.
    Returns: { is_user_duplicate: bool, duplicate_of: str|None, similarity: float }
    """
    if not contact or not new_text or not user_complaints:
        return {'is_user_duplicate': False, 'duplicate_of': None, 'similarity': 0.0}

    new_text_clean = _clean(new_text)
    threshold = 0.60  # slightly relaxed — same user, we're more cautious

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    for complaint in user_complaints:
        try:
            filed = datetime.fromisoformat(complaint.get('timestamp', ''))
            if filed.tzinfo is None:
                filed = filed.replace(tzinfo=timezone.utc)
            if filed < cutoff:
                continue
        except (ValueError, TypeError):
            pass

        existing_text = _clean(
            complaint.get('original_text', '') or complaint.get('translated_text', '')
        )
        if not existing_text:
            continue

        similarity = difflib.SequenceMatcher(None, new_text_clean, existing_text).ratio()
        if similarity >= threshold:
            return {
                'is_user_duplicate': True,
                'duplicate_of': complaint.get('ticket_id', ''),
                'similarity': round(similarity, 3)
            }

    return {'is_user_duplicate': False, 'duplicate_of': None, 'similarity': 0.0}


def _clean(text: str) -> str:
    """Normalize text for comparison."""
    if not text:
        return ''
    return ' '.join(text.lower().split())
