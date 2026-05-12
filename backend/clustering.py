# ============================================
# Nivaran — clustering.py
# Groups similar complaints from the same area,
# escalates urgency based on cluster size.
# ============================================
import difflib
from datetime import datetime, timedelta, timezone
from collections import defaultdict


def cluster_complaints(all_complaints: list,
                       similarity_threshold: float = 0.50,
                       min_cluster_size: int = 2,
                       days: int = 30) -> list:
    """
    Group similar complaints from the same pincode/area into clusters.
    Escalates urgency when 2+ similar complaints come from the same area.
    Returns a sorted list of cluster dicts.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    recent = []
    for c in all_complaints:
        try:
            ts = datetime.fromisoformat(c.get('timestamp', ''))
            if ts.tzinfo is None:
                from datetime import timezone as tz
                ts = ts.replace(tzinfo=tz.utc)
            if ts > cutoff:
                recent.append(c)
        except (ValueError, TypeError):
            pass

    area_category_groups = defaultdict(list)
    for c in recent:
        pincode = (c.get('pincode') or '').strip()
        if not pincode:
            loc = (c.get('location') or '').strip()
            pincode = loc[:15] if loc else ''
        if not pincode:
            continue
        category = c.get('category', 'Other')
        area_category_groups[(pincode, category)].append(c)

    clusters = []
    for (pincode, category), complaints in area_category_groups.items():
        sub_clusters = _group_by_similarity(complaints, similarity_threshold)
        for sub in sub_clusters:
            if len(sub) < min_cluster_size:
                continue

            urgency_order = {'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
            rep = max(sub, key=lambda c: (
                urgency_order.get(c.get('urgency', 'LOW'), 1),
                c.get('timestamp', '')
            ))

            base_urgency = rep.get('urgency', 'MEDIUM')
            escalated = _escalate_urgency(base_urgency, len(sub))

            dept = rep.get('department', 'General Administration')
            dept_id = rep.get('department_id', 'admin')

            cluster_id = f"CLU-{pincode[:8].replace(' ', '')}-{category[:3].upper()}-{len(sub)}"

            clusters.append({
                'cluster_id':             cluster_id,
                'pincode':                pincode,
                'area':                   rep.get('location', pincode)[:40],
                'category':               category,
                'department':             dept,
                'department_id':          dept_id,
                'complaint_count':        len(sub),
                'base_urgency':           base_urgency,
                'escalated_urgency':      escalated,
                'was_escalated':          escalated != base_urgency,
                'representative_ticket':  rep.get('ticket_id', ''),
                'representative_summary': rep.get('summary', ''),
                'tickets':                [c.get('ticket_id', '') for c in sub],
                'latest_timestamp':       max(c.get('timestamp', '') for c in sub),
                'statuses':               list({c.get('status', 'Submitted') for c in sub}),
            })

    clusters.sort(
        key=lambda c: (
            c['complaint_count'],
            {'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}.get(c['escalated_urgency'], 1)
        ),
        reverse=True
    )
    return clusters


def _group_by_similarity(complaints: list, threshold: float) -> list:
    """Greedy text-similarity clustering within an area+category bucket."""
    used = [False] * len(complaints)
    groups = []

    for i, c in enumerate(complaints):
        if used[i]:
            continue
        group = [c]
        used[i] = True
        text_i = _clean(c.get('original_text', '') or c.get('summary', ''))

        for j, d in enumerate(complaints):
            if used[j] or i == j:
                continue
            text_j = _clean(d.get('original_text', '') or d.get('summary', ''))
            if not text_i or not text_j:
                continue
            ratio = difflib.SequenceMatcher(None, text_i, text_j).ratio()
            if ratio >= threshold:
                group.append(d)
                used[j] = True

        groups.append(group)
    return groups


def _clean(text: str) -> str:
    if not text:
        return ''
    return ' '.join(text.lower().split())[:300]


def _escalate_urgency(current: str, count: int) -> str:
    """
    Escalation rules:
      2+ complaints → LOW → MEDIUM
      3+ complaints → MEDIUM → HIGH
      5+ complaints → always HIGH
    """
    if count >= 5:
        return 'HIGH'
    if count >= 3:
        if current == 'LOW':
            return 'MEDIUM'
        if current == 'MEDIUM':
            return 'HIGH'
    if count >= 2 and current == 'LOW':
        return 'MEDIUM'
    return current
