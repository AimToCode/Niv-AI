# ============================================
# Nivaran — urgency.py: Urgency Scoring System
# Covers English + Hindi + Gujarati + Tamil + Bengali keywords
# ============================================

HIGH_KEYWORDS = [
    # English
    'flood', 'fire', 'accident', 'death', 'died', 'hospital', 'emergency',
    'sewage overflow', 'collapsed', 'collapse', 'no water 3', 'no water for',
    'epidemic', 'disease', 'outbreak', 'electrocution', 'shock', 'blast',
    'explosion', 'attack', 'violence', 'danger', 'critical', 'urgent',
    'immediate', 'seepage', 'contaminated', 'poisonous', 'toxic', 'gas leak',
    # Hindi (Devanagari)
    'आग', 'बाढ़', 'हादसा', 'मौत', 'दंगा', 'आपातकाल', 'खतरा',
    # Hindi (Roman/Hinglish)
    'aag', 'barh', 'hadsa', 'maut', 'danga', 'baarish', 'aapatkaal',
    # Gujarati (script)
    'આગ', 'પૂર', 'અકસ્માત', 'મૃત્યુ', 'રોગ', 'ખતરો', 'ઇમરજન્સી',
    # Tamil
    'தீ', 'வெள்ளம்', 'விபத்து', 'மரணம்',
    # Bengali
    'আগুন', 'বন্যা', 'দুর্ঘটনা', 'মৃত্যু',
    # Telugu
    'అగ్ని', 'వరద', 'ప్రమాదం',
    # Kannada
    'ಬೆಂಕಿ', 'ಪ್ರವಾಹ', 'ಅಪಘಾತ',
    # Marathi
    'आग', 'पूर', 'अपघात', 'मृत्यू',
]

MEDIUM_KEYWORDS = [
    # English
    'broken', 'not working', 'pending since', 'no response', 'week',
    'days', 'complained before', 'repeated', 'again', 'still not',
    'inconvenience', 'pothole', 'damaged', 'repair', 'leak', 'overflow',
    # Hindi
    'toot gaya', 'band hai', 'nahi aa raha', 'kaam nahi', 'week se',
    'टूट गया', 'बंद है', 'काम नहीं',
    # Gujarati
    'તૂટ્યો', 'બંધ છે', 'કામ નથી', 'અઠવાડિયા',
]

LOW_KEYWORDS = [
    # English
    'request', 'suggestion', 'minor', 'small', 'please', 'kindly',
    'if possible', 'when convenient', 'would like', 'maintenance',
    # Hindi
    'request kar rahe', 'thodi si', 'chhoti si',
    'अनुरोध', 'सुझाव',
    # Gujarati
    'વિનંતી', 'સૂચન',
]


def score_urgency(text: str, ai_urgency: str = None) -> dict:
    """
    Score urgency based on keywords + AI urgency.
    Covers English, Hindi, and Gujarati keywords.
    Returns dict with urgency and score.
    """
    text_lower = text.lower()

    high_hits = sum(1 for kw in HIGH_KEYWORDS if kw in text_lower or kw in text)
    medium_hits = sum(1 for kw in MEDIUM_KEYWORDS if kw in text_lower or kw in text)
    low_hits = sum(1 for kw in LOW_KEYWORDS if kw in text_lower or kw in text)

    # Keyword-based score
    if high_hits >= 1:
        keyword_urgency = 'HIGH'
        score = 90 + (high_hits * 2)
    elif medium_hits >= 2:
        keyword_urgency = 'HIGH'
        score = 75
    elif medium_hits >= 1:
        keyword_urgency = 'MEDIUM'
        score = 55
    elif low_hits >= 1:
        keyword_urgency = 'LOW'
        score = 25
    else:
        keyword_urgency = 'MEDIUM'
        score = 45

    # Combine with AI urgency (AI gets more weight)
    if ai_urgency:
        ai_weight = {'HIGH': 90, 'MEDIUM': 50, 'LOW': 20}.get(ai_urgency, 50)
        final_score = (score * 0.4) + (ai_weight * 0.6)
        if final_score >= 65:
            final_urgency = 'HIGH'
        elif final_score >= 35:
            final_urgency = 'MEDIUM'
        else:
            final_urgency = 'LOW'
    else:
        final_urgency = keyword_urgency
        final_score = score

    return {
        'urgency': final_urgency,
        'score': round(final_score, 1),
        'keyword_hits': {'high': high_hits, 'medium': medium_hits, 'low': low_hits}
    }
