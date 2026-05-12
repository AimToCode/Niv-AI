# ============================================
# NivAI — router.py: Department routing table
# ============================================

ROUTING_TABLE = {
    'Water Supply':  {'dept_id': 'jal_nigam',   'name': 'Jal Nigam',             'response_hrs': {'HIGH': 24, 'MEDIUM': 48, 'LOW': 72}},
    'Electricity':   {'dept_id': 'electricity',  'name': 'DISCOM',                'response_hrs': {'HIGH': 12, 'MEDIUM': 36, 'LOW': 72}},
    'Roads':         {'dept_id': 'pwd',          'name': 'PWD',                   'response_hrs': {'HIGH': 24, 'MEDIUM': 72, 'LOW': 120}},
    'Sanitation':    {'dept_id': 'sanitation',   'name': 'Municipal Corporation', 'response_hrs': {'HIGH': 12, 'MEDIUM': 48, 'LOW': 96}},
    'Parks':         {'dept_id': 'parks',        'name': 'Parks Department',      'response_hrs': {'HIGH': 48, 'MEDIUM': 96, 'LOW': 168}},
    'Police':        {'dept_id': 'police',       'name': 'Police Department',     'response_hrs': {'HIGH': 1,  'MEDIUM': 24, 'LOW': 72}},
    'Health':        {'dept_id': 'health',       'name': 'Health Department',     'response_hrs': {'HIGH': 6,  'MEDIUM': 24, 'LOW': 72}},
    'Education':     {'dept_id': 'education',    'name': 'Education Department',  'response_hrs': {'HIGH': 24, 'MEDIUM': 72, 'LOW': 120}},
    'Transport':     {'dept_id': 'transport',    'name': 'Transport Department',  'response_hrs': {'HIGH': 24, 'MEDIUM': 72, 'LOW': 120}},
    'Other':         {'dept_id': 'admin',        'name': 'General Administration','response_hrs': {'HIGH': 48, 'MEDIUM': 96, 'LOW': 168}},
}


def route_complaint(category: str, urgency: str = 'MEDIUM') -> dict:
    """
    Get department info for a given category.
    Returns dept info dict with response_hours.
    """
    route = ROUTING_TABLE.get(category, ROUTING_TABLE['Other'])
    response_hrs = route['response_hrs'].get(urgency, 72)
    return {
        'dept_id': route['dept_id'],
        'department': route['name'],
        'response_hours': response_hrs,
        'expected_response': f'{response_hrs} hours'
    }


def get_all_departments() -> list:
    """Return all department info as a list."""
    seen = set()
    depts = []
    for cat, info in ROUTING_TABLE.items():
        if info['dept_id'] not in seen:
            seen.add(info['dept_id'])
            depts.append({
                'dept_id': info['dept_id'],
                'name': info['name'],
                'categories': [c for c, r in ROUTING_TABLE.items() if r['dept_id'] == info['dept_id']]
            })
    return depts
