# ============================================
# NivAI — notifier.py
# NO billing SNS — replaced with:
#   1. In-memory alert store (UI toast notifications)
#   2. ntfy.sh (100% free push notifications, no signup)
#   3. Console log as fallback
# ============================================
import requests
from datetime import datetime

# In-memory alert store — UI polls this for notifications
# Stored as list of dicts, newest first
_ALERT_STORE = []
MAX_ALERTS = 100  # keep last 100 alerts in memory


def _store_alert(alert_type: str, ticket_id: str, category: str,
                 department: str, location: str, summary: str, urgency: str = 'HIGH'):
    """Store alert in memory for UI to display."""
    alert = {
        'id':         len(_ALERT_STORE) + 1,
        'type':       alert_type,
        'ticket_id':  ticket_id,
        'category':   category,
        'department': department,
        'location':   location,
        'summary':    summary,
        'urgency':    urgency,
        'timestamp':  datetime.utcnow().isoformat(),
        'read':       False
    }
    _ALERT_STORE.insert(0, alert)
    if len(_ALERT_STORE) > MAX_ALERTS:
        _ALERT_STORE.pop()
    return alert


def get_alerts(unread_only: bool = False) -> list:
    """Return stored alerts — called by /api/alerts endpoint."""
    if unread_only:
        return [a for a in _ALERT_STORE if not a['read']]
    return _ALERT_STORE


def mark_all_read():
    """Mark all alerts as read."""
    for a in _ALERT_STORE:
        a['read'] = True


def get_unread_count() -> int:
    return sum(1 for a in _ALERT_STORE if not a['read'])


def _notify_ntfy(title: str, message: str, priority: str = 'high', topic: str = 'nivai-alerts'):
    """
    Send push notification via ntfy.sh — completely FREE, no signup.
    Users subscribe to their topic at: https://ntfy.sh/<topic>
    Or use the ntfy mobile app (Android/iOS) — free.
    """
    try:
        # Encode headers as ASCII (ntfy requires ASCII — strip emoji, collapse spaces)
        import re
        safe_title = re.sub(r'\s+', ' ', title.encode('ascii', 'ignore').decode('ascii')).strip() or 'NivAI Alert'
        r = requests.post(
            f'https://ntfy.sh/{topic}',
            data=message.encode('utf-8'),
            headers={
                'Title':       safe_title,
                'Priority':    priority,
                'Tags':        'rotating_light',
                'Content-Type':'text/plain; charset=utf-8',
            },
            timeout=5
        )
        if r.status_code == 200:
            print(f'[ntfy] Notification sent → ntfy.sh/{topic}')
            return True
        else:
            print(f'[ntfy] Failed: {r.status_code}')
    except Exception as e:
        print(f'[ntfy] Error: {e}')
    return False


# ── PUBLIC API ────────────────────────────────────────────────────

def notify_high_urgency(ticket_id: str, category: str, department: str,
                        location: str, summary: str):
    """
    Called when a HIGH urgency complaint is submitted.
    1. Stores alert in memory (shown in UI dashboard as badge)
    2. Sends free push via ntfy.sh (no billing ever)
    """
    print(f'[Notifier] 🚨 HIGH urgency: {ticket_id} | {category} → {department}')

    # Store for UI
    _store_alert(
        alert_type='HIGH_URGENCY',
        ticket_id=ticket_id,
        category=category,
        department=department,
        location=location,
        summary=summary,
        urgency='HIGH'
    )

    # Free push notification via ntfy.sh
    _notify_ntfy(
        title=f'🚨 HIGH: {category} — {ticket_id}',
        message=f'Department: {department}\nLocation: {location}\nSummary: {summary}',
        priority='urgent',
        topic='nivai-high-urgency'  # anyone can subscribe to this
    )


def notify_complaint_registered(ticket_id: str, category: str,
                                 department: str, urgency: str):
    """
    Called when ANY complaint is registered.
    Shows a UI alert badge on the dashboard.
    """
    print(f'[Notifier] ✅ Complaint registered: {ticket_id}')

    _store_alert(
        alert_type='COMPLAINT_REGISTERED',
        ticket_id=ticket_id,
        category=category,
        department=department,
        location='',
        summary=f'New {urgency} complaint in {category}',
        urgency=urgency
    )


def notify_citizen_status(contact: str, ticket_id: str, new_status: str):
    """
    Notify citizen of status update.
    Since no billing SMS, we log it + send ntfy if contact looks like a ntfy topic.
    """
    print(f'[Notifier] 📱 Status update for {contact}: {ticket_id} → {new_status}')

    if contact and not contact.startswith('+') and '@' not in contact:
        # Treat contact as an ntfy topic if it's a plain string (not phone/email)
        _notify_ntfy(
            title=f'NivAI Update — {ticket_id}',
            message=f'Your complaint status: {new_status}',
            priority='default',
            topic=contact
        )
