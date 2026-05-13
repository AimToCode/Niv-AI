# ============================================
# Nivaran — app.py (FIXED & FULLY WORKING)
# Run: python app.py
# Open: http://localhost:5000
# ============================================
import os
import json
import random
import string
import requests
from datetime import datetime, timezone
from flask import Flask, request, jsonify, render_template, send_from_directory

# Optional imports — app works without them
try:
    from flask_cors import CORS
    HAS_CORS = True
except ImportError:
    HAS_CORS = False
    print("[WARN] flask-cors not installed — install with: pip install flask-cors")

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    HAS_LIMITER = True
except ImportError:
    HAS_LIMITER = False
    print("[WARN] flask-limiter not installed — rate limiting disabled")

from config import Config
from backend.classifier import classify_complaint
from backend.urgency import score_urgency
from backend.translator import detect_script_language, translate_to_english
from backend.router import route_complaint, get_all_departments
from backend.duplicate import check_duplicate, check_user_duplicate
from backend.notifier import (notify_high_urgency, notify_citizen_status,
                               notify_complaint_registered, get_alerts,
                               mark_all_read, get_unread_count)
from backend.aws_db import (
    save_grievance, get_grievance, get_all_grievances,
    get_recent_by_pincode, update_grievance_status,
    get_departments, save_department, get_analytics_data,
    transfer_complaint
)
from backend.clustering import cluster_complaints

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config.from_object(Config)

if HAS_CORS:
    CORS(app, origins=['*'])

# Dummy limiter decorator if flask-limiter not installed
if HAS_LIMITER:
    limiter = Limiter(key_func=get_remote_address, app=app,
                      default_limits=[], storage_uri="memory://")
    rate_limit = limiter.limit
else:
    class _FakeLimiter:
        def limit(self, *a, **k):
            def decorator(f): return f
            return decorator
    limiter = _FakeLimiter()

# ── HELPERS ─────────────────────────────────────────────────────
def gen_ticket():
    return f"GRV-{datetime.now().strftime('%Y%m%d')}-{''.join(random.choices(string.digits,k=4))}"

def ok(data=None):
    return jsonify({'success': True, 'data': data or {}})

def err(msg, code=400):
    return jsonify({'success': False, 'error': msg, 'data': {}}), code

def clean(v):
    return str(v).strip()[:5000] if v else ''

# ── PAGES ────────────────────────────────────────────────────────
@app.route('/')
def index(): return render_template('index.html', clerk_key=Config.CLERK_PUBLISHABLE_KEY)

@app.route('/tracking')
def tracking(): return render_template('tracking.html')

@app.route('/dashboard')
def dashboard(): return render_template('dashboard.html')

@app.route('/admin')
def admin(): return render_template('admin.html')

@app.route('/analytics')
def analytics(): return render_template('analytics.html')

@app.route('/offline/service-worker.js')
def sw(): return send_from_directory('offline','service-worker.js',mimetype='application/javascript')

# ── SUBMIT ───────────────────────────────────────────────────────
@app.route('/api/submit', methods=['POST'])
@limiter.limit('20 per hour')
def api_submit():
    d = request.get_json(silent=True) or {}
    text = clean(d.get('text',''))
    loc  = clean(d.get('location',''))
    if not text or len(text)<5: return err('Complaint text required (min 5 chars)')
    if not loc: return err('Location is required')

    pincode  = clean(d.get('pincode',''))
    language = clean(d.get('language','en'))
    contact  = clean(d.get('contact',''))
    cat_hint = clean(d.get('category_hint',''))
    lat      = d.get('lat'); lng = d.get('lng')
    force          = d.get('force_duplicate', False)
    force_user_dup = d.get('force_user_duplicate', False)

    # ── Step 1: Detect language (offline Unicode, no API needed) ──
    det_lang = detect_script_language(text)
    print(f'[App] Detected language: {det_lang}')

    # ── Step 2: Translate to English (MyMemory → OpenRouter fallback) ──
    if det_lang != 'en':
        en_text = translate_to_english(text, det_lang)
        is_trans = (en_text.strip() != text.strip())
        if not is_trans:
            print(f'[App] Translation unchanged — using original for classification')
            en_text = text
    else:
        en_text  = text
        is_trans = False

    # ── Step 3: Classify using English text (OpenRouter AI) ──
    cl = classify_complaint(en_text)
    if cat_hint: cl['category'] = cat_hint

    # ── Step 3.5: Same-user duplicate check (runs before pincode check) ──
    if not force_user_dup and contact and len(contact) >= 6:
        contact_lower = contact.strip().lower()
        all_grievances = get_all_grievances(limit=500)
        user_prior = [
            g for g in all_grievances
            if g.get('contact', '').strip().lower() == contact_lower
        ]
        udup = check_user_duplicate(en_text, contact, user_prior)
        if udup['is_user_duplicate']:
            return jsonify({
                'success': True,
                'is_user_duplicate': True,
                'data': {
                    'duplicate_of': udup['duplicate_of'],
                    'user_language': language or det_lang,
                }
            })

    if not force and pincode:
        recent = get_recent_by_pincode(pincode, cat_hint)
        dup = check_duplicate(en_text, cat_hint, pincode, recent)
        if dup['is_duplicate']:
            return jsonify({'success':True,'is_duplicate':True,'data':{'duplicate_of':dup['duplicate_of']}})

    urg   = score_urgency(en_text, cl['urgency'])['urgency']
    route = route_complaint(cl['category'], urg)
    now   = datetime.now(timezone.utc).isoformat()
    ticket= gen_ticket()

    save_grievance({'ticket_id':ticket,'timestamp':now,'original_text':text,
        'translated_text':en_text,'detected_language':det_lang,'user_language':language,
        'is_translated':is_trans,
        'category':cl['category'],'department':route['department'],
        'department_id':route['dept_id'],'urgency':urg,'summary':cl['summary'],
        'confidence':cl['confidence'],'location':loc,'pincode':pincode,
        'lat':str(lat) if lat else '','lng':str(lng) if lng else '',
        'contact':contact,'status':'Classified',
        'status_history':[
            {'status':'Submitted','timestamp':now},
            {'status':'Classified','timestamp':now},
        ],
        'is_duplicate':False,'duplicate_of':'','photo_url':''})

    notify_complaint_registered(ticket, cl["category"], route["department"], urg)
    if urg=="HIGH": notify_high_urgency(ticket,cl["category"],route["department"],loc,cl["summary"])

    return ok({'ticket_id':ticket,'category':cl['category'],'department':route['department'],
               'urgency':urg,'summary':cl['summary'],'expected_response':route['expected_response'],'status':'Submitted'})

# ── TRACK ────────────────────────────────────────────────────────
@app.route('/api/track/<tid>')
def api_track(tid):
    g = get_grievance(tid.upper())
    return ok(g) if g else err('Complaint not found',404)

# ── COMPLAINTS ───────────────────────────────────────────────────
@app.route('/api/complaints')
def api_complaints():
    return ok(get_all_grievances(
        department=request.args.get('department',''),
        date_str=request.args.get('date',''),
        limit=int(request.args.get('limit',100))))

# ── UPDATE STATUS ────────────────────────────────────────────────
@app.route('/api/update-status', methods=['POST'])
def api_update():
    d  = request.get_json(silent=True) or {}
    tid= clean(d.get('ticket_id','')).upper()
    st = clean(d.get('status',''))
    dp = clean(d.get('department',''))
    if st not in ['Submitted','Classified','Assigned','In Progress','Resolved','Closed']:
        return err('Invalid status')
    if not update_grievance_status(tid,st,dp): return err('Not found',404)
    g = get_grievance(tid)
    if g and g.get('contact'): notify_citizen_status(g['contact'],tid,st)
    return ok({'ticket_id':tid,'status':st})

# ── ANALYTICS ────────────────────────────────────────────────────
@app.route('/api/analytics')
def api_analytics(): return ok(get_analytics_data())

# ── CLUSTERS ─────────────────────────────────────────────────────
@app.route('/api/clusters')
def api_clusters():
    dept = request.args.get('department', '')
    all_items = get_all_grievances(limit=10000)
    clusters = cluster_complaints(all_items)
    if dept and dept != 'admin':
        clusters = [c for c in clusters if c.get('department_id') == dept]
    return ok(clusters)

# ── TRANSFER (super admin only) ───────────────────────────────────
@app.route('/api/transfer', methods=['POST'])
def api_transfer():
    d = request.get_json(silent=True) or {}
    tid       = clean(d.get('ticket_id', '')).upper()
    new_dept  = clean(d.get('department', ''))
    new_did   = clean(d.get('department_id', ''))
    officer   = clean(d.get('officer', 'admin'))
    if not tid or not new_dept:
        return err('ticket_id and department required')
    g = get_grievance(tid)
    if not g:
        return err('Complaint not found', 404)
    if not transfer_complaint(tid, new_dept, new_did, officer):
        return err('Transfer failed', 500)
    return ok({'ticket_id': tid, 'new_department': new_dept})

# ── LOGIN ────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
@limiter.limit('20 per minute')
def api_login():
    d = request.get_json(silent=True) or {}
    u = Config.DEMO_USERS.get(clean(d.get('username','')))
    if u and u['password']==clean(d.get('password','')):
        return ok({'username':d.get('username'),'name':u['name'],
                   'department':clean(d.get('department','')) or u['department'],
                   'role':'admin' if u['department']=='admin' else 'officer'})
    return err('Invalid credentials',401)

# ── DEPARTMENTS ──────────────────────────────────────────────────
@app.route('/api/departments', methods=['GET'])
def api_get_depts(): return ok(get_departments())

@app.route('/api/departments', methods=['POST'])
def api_add_dept():
    d = request.get_json(silent=True) or {}
    name = clean(d.get('name',''))
    if not name: return err('Name required')
    dept = {'dept_id':name.lower().replace(' ','_'),'name':name,
            'categories':d.get('categories',[]),'officer_emails':d.get('officer_emails',[]),'sns_topic_arn':''}
    save_department(dept)
    return ok(dept)

# ── MY COMPLAINTS (lookup by contact) ────────────────────────────
@app.route('/api/my-complaints')
@limiter.limit('30 per minute')
def api_my_complaints():
    contact = clean(request.args.get('contact', ''))
    if not contact or len(contact) < 6:
        return err('Please provide a valid phone number or email (min 6 characters)', 400)
    all_items = get_all_grievances(limit=10000)
    matched = [
        i for i in all_items
        if i.get('contact', '').strip().lower() == contact.strip().lower()
    ]
    # Sort newest first
    matched.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    # Return safe subset of fields (no internal metadata)
    results = [
        {
            'ticket_id':   i.get('ticket_id', ''),
            'category':    i.get('category', '—'),
            'urgency':     i.get('urgency', '—'),
            'status':      i.get('status', '—'),
            'location':    i.get('location', '—'),
            'summary':     i.get('summary', ''),
            'timestamp':   i.get('timestamp', ''),
            'department':  i.get('department', '—'),
        }
        for i in matched
    ]
    return ok(results)

# ── DUPLICATE CHECK ──────────────────────────────────────────────
@app.route('/api/check-duplicate', methods=['POST'])
def api_dup():
    d  = request.get_json(silent=True) or {}
    t  = clean(d.get('text','')); cat=clean(d.get('category','')); pin=clean(d.get('pincode',''))
    rc = get_recent_by_pincode(pin,cat) if pin else []
    return ok(check_duplicate(t,cat,pin,rc))

# ── HEALTH ───────────────────────────────────────────────────────
@app.route('/api/health')
def api_health():
    items = get_all_grievances(limit=10000)
    today = datetime.now().strftime('%Y-%m-%d')
    return ok({'total':len(items),
               'today': sum(1 for i in items if i.get('timestamp','').startswith(today)),
               'pending':sum(1 for i in items if i.get('status') not in ['Resolved','Closed']),
               'resolved':sum(1 for i in items if i.get('status')=='Resolved'),
               'services':{'ai':bool(Config.OPENROUTER_API_KEY),'translate':True,
                            'db':bool(Config.AWS_ACCESS_KEY_ID),'notifications':True},
               'unread_alerts': get_unread_count()})


# ── ALERTS (UI notifications — no billing) ───────────────────────
@app.route('/api/alerts')
def api_alerts():
    unread = request.args.get('unread', 'false').lower() == 'true'
    return ok(get_alerts(unread_only=unread))

@app.route('/api/alerts/read', methods=['POST'])
def api_mark_read():
    mark_all_read()
    return ok({'message': 'All alerts marked as read'})

@app.route('/api/alerts/count')
def api_alert_count():
    return ok({'count': get_unread_count()})

# ── CLASSIFY ─────────────────────────────────────────────────────
@app.route('/classify', methods=['POST'])
def api_classify():
    d = request.get_json(silent=True) or {}
    complaint = clean(d.get('complaint', ''))
    if not complaint or len(complaint) < 3:
        return err('complaint text is required (min 3 chars)')

    api_key = os.environ.get('OPENROUTER_API_KEY', '')
    if not api_key:
        return err('OPENROUTER_API_KEY is not configured', 503)

    system_prompt = (
        "You are a government complaint classifier. "
        "Given a citizen complaint, respond with ONLY valid JSON — no markdown, no explanation.\n\n"
        "Format:\n"
        '{"department": "...", "urgency": "...", "confidence": "..."}\n\n'
        "department must be exactly one of: Road, Water, Electricity, Healthcare, Police, Education, Sanitation\n"
        "urgency must be exactly one of: Low, Medium, High, Critical\n"
        "confidence must be a decimal between 0 and 1 (e.g. 0.92)\n\n"
        "Urgency rules:\n"
        "- Critical: life-threatening emergency, fire, flood, electrocution, heart attack, gas leak, violent crime\n"
        "- High: no water 3+ days, power outage, sewage overflow, road collapse, serious injury\n"
        "- Medium: broken infrastructure, pending repair, recurring issue\n"
        "- Low: minor request, suggestion, cosmetic issue\n\n"
        "Output ONLY the JSON object."
    )

    _models = [
        'google/gemma-4-26b-a4b-it:free',
        'openai/gpt-oss-20b:free',
        'nvidia/nemotron-nano-9b-v2:free',
        'liquid/lfm-2.5-1.2b-instruct:free',
        'google/gemma-4-31b-it:free',
        'meta-llama/llama-3.3-70b-instruct:free',
    ]

    resp = None
    last_status = None
    for _model in _models:
        try:
            resp = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://nivaran.gov.in',
                    'X-Title': 'Nivaran Grievance System',
                },
                json={
                    'model': _model,
                    'max_tokens': 100,
                    'temperature': 0.1,
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': f'Classify this complaint:\n\n"{complaint}"'},
                    ],
                },
                timeout=20,
            )
            if resp.status_code == 429:
                last_status = 429
                print(f'[Classify] {_model} → 429 rate limited, trying next model')
                continue
            break
        except requests.exceptions.Timeout:
            return err('Classification request timed out', 504)
        except requests.exceptions.RequestException as e:
            return err(f'Network error: {str(e)}', 502)

    if resp is None or not resp.ok:
        code = last_status or (resp.status_code if resp else 502)
        return err(f'All models rate limited or unavailable (HTTP {code})', 503)

    try:
        raw = resp.json()['choices'][0]['message']['content'].strip()
        raw = raw.replace('```json', '').replace('```', '').strip()
        start, end = raw.find('{'), raw.rfind('}')
        if start == -1 or end == -1:
            raise ValueError('No JSON object found in response')
        result = json.loads(raw[start:end + 1])

        valid_depts = {'Road', 'Water', 'Electricity', 'Healthcare', 'Police', 'Education', 'Sanitation'}
        valid_urgency = {'Low', 'Medium', 'High', 'Critical'}

        department = str(result.get('department', 'Road'))
        if department not in valid_depts:
            department = 'Road'
        urgency = str(result.get('urgency', 'Medium'))
        if urgency not in valid_urgency:
            urgency = 'Medium'
        try:
            confidence = str(round(float(result.get('confidence', 0.8)), 2))
        except (TypeError, ValueError):
            confidence = '0.8'

        return jsonify({'department': department, 'urgency': urgency, 'confidence': confidence})
    except Exception as e:
        return err(f'Failed to parse classification response: {str(e)}', 500)


# ── DEBUG (visit /api/debug in browser to check config) ──────────
@app.route('/api/debug')
def api_debug():
    import os
    key = os.getenv('OPENROUTER_API_KEY', '')
    return jsonify({
        'api_key_set': bool(key),
        'api_key_preview': (key[:12] + '...') if key else 'NOT SET',
        'ai_model': Config.AI_MODEL,
        'env_file': __import__('os').path.join(
            __import__('os').path.dirname(__import__('os').path.abspath('config.py')), '.env'
        )
    })

@app.errorhandler(404)
def nf(e): return jsonify({'success':False,'error':'Not found','data':{}}),404
@app.errorhandler(429)
def rl(e): return jsonify({'success':False,'error':'Too many requests','data':{}}),429
@app.errorhandler(500)
def se(e): return jsonify({'success':False,'error':'Server error','data':{}}),500

if __name__ == '__main__':
    print("\n" + "="*52)
    print("  🏛️  Nivaran — Citizen Grievance System")
    print("  🌐  Open in browser: http://localhost:5000")
    print("  🔐  Login: admin / admin123")
    print("  📋  Dashboard: http://localhost:5000/dashboard")
    print("="*52 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
