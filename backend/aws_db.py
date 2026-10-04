# ============================================
# NivAI — aws_db.py: AWS DynamoDB Operations
# ============================================
try:
    import boto3
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False
    boto3 = None
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from config import Config

# In-memory fallback store (used when DynamoDB not configured)
_LOCAL_STORE = {'grievances': {}, 'departments': {}, 'users': {}}


def get_dynamodb():
    """Get DynamoDB resource or None if not configured."""
    if not HAS_BOTO3 or not Config.AWS_ACCESS_KEY_ID:
        return None
    try:
        return boto3.resource(
            'dynamodb',
            region_name=Config.AWS_REGION,
            aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY
        )
    except Exception as e:
        print(f'[DynamoDB] Connection error: {e}')
        return None


def _convert_decimals(obj):
    """Convert DynamoDB Decimal to float/int for JSON."""
    if isinstance(obj, list):
        return [_convert_decimals(i) for i in obj]
    if isinstance(obj, dict):
        return {k: _convert_decimals(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return float(obj) if obj % 1 else int(obj)
    return obj




def _supabase_configured() -> bool:
    """Return True when server-side Supabase credentials are configured."""
    return bool(os.getenv("SUPABASE_URL", "").strip() and os.getenv("SUPABASE_SECRET_KEY", "").strip())


def _supabase_request(method: str, path: str, payload=None, prefer: str = ""):
    """Call Supabase PostgREST using server-only credentials (never expose to frontend)."""
    base_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    secret = os.getenv("SUPABASE_SECRET_KEY", "").strip()
    if not base_url or not secret:
        raise RuntimeError("Supabase is not configured: set SUPABASE_URL and SUPABASE_SECRET_KEY")
    url = f"{base_url}/rest/v1/{path.lstrip('/')}"
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "apikey": secret,
        "Authorization": f"Bearer {secret}",
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        # Avoid logging headers or credentials; only surface the response body/status.
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"Supabase HTTP {exc.code}: {detail}") from None


def _supabase_get_grievance(ticket_id: str):
    query = urllib.parse.urlencode({"ticket_id": f"eq.{ticket_id}", "select": "data", "limit": "1"})
    rows = _supabase_request("GET", f"complaints?{query}") or []
    return rows[0].get("data") if rows else None


def _supabase_save_grievance(data: dict) -> bool:
    payload = {"ticket_id": data["ticket_id"], "data": data}
    query = urllib.parse.urlencode({"on_conflict": "ticket_id"})
    _supabase_request("POST", f"complaints?{query}", payload=[payload], prefer="resolution=merge-duplicates,return=minimal")
    return True


def _supabase_all_grievances(limit: int = 200):
    query = urllib.parse.urlencode({"select": "data", "order": "created_at.desc", "limit": str(limit)})
    rows = _supabase_request("GET", f"complaints?{query}") or []
    return [row["data"] for row in rows if isinstance(row.get("data"), dict)]


# ===== GRIEVANCES =====

def save_grievance(data: dict) -> bool:
    """Save a new grievance to DynamoDB or local store."""
    if _supabase_configured():
        try:
            return _supabase_save_grievance(data)
        except Exception as e:
            print(f'[Supabase] Save error: {e}')
            return False
    db = get_dynamodb()
    if not db:
        _LOCAL_STORE['grievances'][data['ticket_id']] = data
        print(f"[DB-Local] Saved grievance: {data['ticket_id']}")
        return True
    try:
        table = db.Table(Config.DYNAMODB_GRIEVANCES_TABLE)
        # Convert float to Decimal for DynamoDB
        item = json.loads(json.dumps(data), parse_float=Decimal)
        table.put_item(Item=item)
        return True
    except Exception as e:
        print(f'[DynamoDB] Save error: {e}')
        _LOCAL_STORE['grievances'][data['ticket_id']] = data
        return True  # Fallback to local


def get_grievance(ticket_id: str) -> dict | None:
    """Get a single grievance by ticket ID."""
    if _supabase_configured():
        try:
            return _supabase_get_grievance(ticket_id)
        except Exception as e:
            print(f'[Supabase] Get error: {e}')
            return None
    db = get_dynamodb()
    if not db:
        return _LOCAL_STORE['grievances'].get(ticket_id)
    try:
        table = db.Table(Config.DYNAMODB_GRIEVANCES_TABLE)
        resp = table.get_item(Key={'ticket_id': ticket_id})
        item = resp.get('Item')
        return _convert_decimals(item) if item else None
    except Exception as e:
        print(f'[DynamoDB] Get error: {e}')
        return _LOCAL_STORE['grievances'].get(ticket_id)


def get_all_grievances(department: str = None, date_str: str = None, limit: int = 200) -> list:
    """Get grievances, optionally filtered by department/date."""
    if _supabase_configured():
        try:
            items = _supabase_all_grievances(limit)
            if department and department != 'admin':
                items = [i for i in items if i.get('department_id') == department or i.get('department') == department]
            if date_str:
                items = [i for i in items if i.get('timestamp', '').startswith(date_str)]
            items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return items[:limit]
        except Exception as e:
            print(f'[Supabase] List error: {e}')
            return []
    db = get_dynamodb()

    if not db:
        items = list(_LOCAL_STORE['grievances'].values())
        if department and department != 'admin':
            items = [i for i in items if i.get('department_id') == department or i.get('department') == department]
        items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return items[:limit]

    try:
        table = db.Table(Config.DYNAMODB_GRIEVANCES_TABLE)
        resp = table.scan(Limit=limit)
        items = resp.get('Items', [])
        items = _convert_decimals(items)

        if department and department != 'admin':
            items = [i for i in items if i.get('department_id') == department]
        if date_str:
            items = [i for i in items if i.get('timestamp', '').startswith(date_str)]

        items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return items
    except Exception as e:
        print(f'[DynamoDB] Scan error: {e}')
        return list(_LOCAL_STORE['grievances'].values())


def get_recent_by_pincode(pincode: str, category: str = None, days: int = 7) -> list:
    """Get recent complaints in the same area for duplicate detection."""
    all_items = get_all_grievances(limit=500)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = []
    for item in all_items:
        if item.get('pincode') != pincode:
            continue
        if category and item.get('category') != category:
            continue
        try:
            ts = datetime.fromisoformat(item['timestamp'])
            if ts > cutoff:
                result.append(item)
        except (KeyError, ValueError):
            pass
    return result


def update_grievance_status(ticket_id: str, new_status: str, officer: str = '') -> bool:
    """Update status and append to status_history."""
    now = datetime.now(timezone.utc).isoformat()
    history_entry = {'status': new_status, 'timestamp': now, 'updated_by': officer}

    if _supabase_configured():
        try:
            grievance = _supabase_get_grievance(ticket_id)
            if not grievance:
                return False
            grievance['status'] = new_status
            grievance['status_history'] = grievance.get('status_history', []) + [history_entry]
            return _supabase_save_grievance(grievance)
        except Exception as e:
            print(f'[Supabase] Update error: {e}')
            return False

    db = get_dynamodb()
    if not db:
        if ticket_id in _LOCAL_STORE['grievances']:
            g = _LOCAL_STORE['grievances'][ticket_id]
            g['status'] = new_status
            g['status_history'] = g.get('status_history', []) + [history_entry]
            return True
        return False

    try:
        table = db.Table(Config.DYNAMODB_GRIEVANCES_TABLE)
        table.update_item(
            Key={'ticket_id': ticket_id},
            UpdateExpression='SET #s = :s, status_history = list_append(if_not_exists(status_history, :empty), :h)',
            ExpressionAttributeNames={'#s': 'status'},
            ExpressionAttributeValues={':s': new_status, ':h': [history_entry], ':empty': []}
        )
        return True
    except Exception as e:
        print(f'[DynamoDB] Update error: {e}')
        return False


# ===== DEPARTMENTS =====

def transfer_complaint(ticket_id: str, new_department: str, new_department_id: str, officer: str = 'admin') -> bool:
    """Transfer a complaint to a different department (admin only)."""
    now = datetime.now(timezone.utc).isoformat()
    history_entry = {
        'status': 'Transferred',
        'timestamp': now,
        'updated_by': officer,
        'note': f'Transferred to {new_department}'
    }

    if _supabase_configured():
        try:
            grievance = _supabase_get_grievance(ticket_id)
            if not grievance:
                return False
            grievance['department'] = new_department
            grievance['department_id'] = new_department_id
            grievance['status_history'] = grievance.get('status_history', []) + [history_entry]
            return _supabase_save_grievance(grievance)
        except Exception as e:
            print(f'[Supabase] Transfer error: {e}')
            return False

    db = get_dynamodb()
    if not db:
        if ticket_id in _LOCAL_STORE['grievances']:
            g = _LOCAL_STORE['grievances'][ticket_id]
            g['department'] = new_department
            g['department_id'] = new_department_id
            g['status_history'] = g.get('status_history', []) + [history_entry]
            return True
        return False

    try:
        table = db.Table(Config.DYNAMODB_GRIEVANCES_TABLE)
        table.update_item(
            Key={'ticket_id': ticket_id},
            UpdateExpression='SET department = :d, department_id = :did, status_history = list_append(if_not_exists(status_history, :empty), :h)',
            ExpressionAttributeValues={
                ':d': new_department,
                ':did': new_department_id,
                ':h': [history_entry],
                ':empty': []
            }
        )
        return True
    except Exception as e:
        print(f'[DynamoDB] Transfer error: {e}')
        return False


def get_departments() -> list:
    """Get all departments."""
    db = get_dynamodb()
    if not db:
        from backend.router import get_all_departments
        return get_all_departments()
    try:
        table = db.Table(Config.DYNAMODB_DEPARTMENTS_TABLE)
        resp = table.scan()
        return _convert_decimals(resp.get('Items', []))
    except Exception as e:
        print(f'[DynamoDB] Dept scan error: {e}')
        from backend.router import get_all_departments
        return get_all_departments()


def save_department(dept: dict) -> bool:
    """Save a new department."""
    db = get_dynamodb()
    if not db:
        _LOCAL_STORE['departments'][dept['dept_id']] = dept
        return True
    try:
        table = db.Table(Config.DYNAMODB_DEPARTMENTS_TABLE)
        table.put_item(Item=dept)
        return True
    except Exception as e:
        print(f'[DynamoDB] Dept save error: {e}')
        return False


# ===== ANALYTICS =====

def get_analytics_data() -> dict:
    """Compute analytics from grievances."""
    all_items = get_all_grievances(limit=10000)
    now = datetime.now(timezone.utc)
    cutoff_30 = now - timedelta(days=30)
    cutoff_14 = now - timedelta(days=14)

    by_category = {}
    by_urgency = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
    by_dept = {}
    daily = {}
    heatmap = {}
    total_30 = 0
    resolved = 0

    for item in all_items:
        try:
            ts = datetime.fromisoformat(item.get('timestamp', ''))
        except ValueError:
            continue

        # 30-day window
        if ts > cutoff_30:
            total_30 += 1
            cat = item.get('category', 'Other')
            by_category[cat] = by_category.get(cat, 0) + 1
            urg = item.get('urgency', 'MEDIUM')
            by_urgency[urg] = by_urgency.get(urg, 0) + 1
            dept = item.get('department', 'Other')
            if dept not in by_dept:
                by_dept[dept] = {'total': 0, 'resolved': 0}
            by_dept[dept]['total'] += 1
            if item.get('status') == 'Resolved':
                by_dept[dept]['resolved'] += 1

            # Pincode heatmap
            pin = item.get('pincode') or item.get('location', 'Unknown')[:10]
            if pin not in heatmap:
                heatmap[pin] = {'area': item.get('location', pin)[:20], 'pincode': pin,
                                'water': 0, 'electricity': 0, 'roads': 0, 'sanitation': 0, 'other': 0, 'total': 0}
            cat_key = {'Water Supply': 'water', 'Electricity': 'electricity', 'Roads': 'roads',
                       'Sanitation': 'sanitation'}.get(cat, 'other')
            heatmap[pin][cat_key] += 1
            heatmap[pin]['total'] += 1

        # 14-day daily volume
        if ts > cutoff_14:
            day = ts.strftime('%d %b')
            daily[day] = daily.get(day, 0) + 1

        if item.get('status') == 'Resolved':
            resolved += 1

    dept_resolution = {
        d: round((v['resolved'] / v['total']) * 100) if v['total'] else 0
        for d, v in by_dept.items()
    }

    daily_volume = [{'date': d, 'count': c} for d, c in sorted(daily.items())]

    return {
        'total_30d': total_30,
        'avg_classification_time': '< 45 sec',
        'resolution_rate': round((resolved / len(all_items)) * 100) if all_items else 0,
        'by_category': dict(sorted(by_category.items(), key=lambda x: x[1], reverse=True)),
        'by_urgency': by_urgency,
        'daily_volume': daily_volume,
        'dept_resolution': dept_resolution,
        'heatmap': sorted(heatmap.values(), key=lambda x: x['total'], reverse=True)[:10]
    }
