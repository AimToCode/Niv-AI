# ============================================
# Nivaran — config.py
# ============================================
import os
from dotenv import load_dotenv

# Always resolve .env relative to this file's directory,
# not the working directory — so it works no matter where python is run from
_here = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_here, '.env')
load_dotenv(dotenv_path=_env_path, override=True)

_key = os.getenv('OPENROUTER_API_KEY', '')
print('=' * 52)
if _key:
    print(f'  [OK]  OPENROUTER_API_KEY loaded: {_key[:12]}...')
else:
    print('  [!!]  OPENROUTER_API_KEY is NOT set!')
    print(f'  [!!]  Expected .env at: {_env_path}')
    print(f'  [!!]  .env file found: {os.path.exists(_env_path)}')
    print('  [!!]  Add this line to your .env file:')
    print('  [!!]  OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx')
print('=' * 52)


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'nivaran-dev-secret-2026')
    DEBUG = True

    # OpenRouter API — used for AI classification AND translation
    # Get a free key at https://openrouter.ai
    OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY', '')
    OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
    # Tested & confirmed working free models on OpenRouter
    AI_MODEL = 'google/gemma-4-31b-it:free'
    TRANSLATION_MODEL = 'google/gemma-4-31b-it:free'

    # AWS DynamoDB (optional — app uses local memory without this)
    AWS_ACCESS_KEY_ID     = os.getenv('AWS_ACCESS_KEY_ID', '')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '')
    AWS_REGION            = os.getenv('AWS_REGION', 'ap-south-1')
    DYNAMODB_GRIEVANCES_TABLE  = 'nivaran-grievances'
    DYNAMODB_DEPARTMENTS_TABLE = 'nivaran-departments'
    DYNAMODB_USERS_TABLE       = 'nivaran-users'

    # ntfy.sh topic for push notifications (FREE — no signup)
    NTFY_TOPIC = os.getenv('NTFY_TOPIC', 'nivaran-high-urgency')

    # Rate limiting
    RATELIMIT_DEFAULT    = '100 per hour'
    RATELIMIT_STORAGE_URL= 'memory://'

    # Demo login credentials
    DEMO_USERS = {
        'admin':         {'password': 'admin123',  'department': 'admin',       'name': 'Super Admin'},
        'water.officer': {'password': 'water123',  'department': 'jal_nigam',   'name': 'Water Officer'},
        'pwd.officer':   {'password': 'pwd123',    'department': 'pwd',         'name': 'PWD Officer'},
        'elec.officer':  {'password': 'elec123',   'department': 'electricity', 'name': 'Electricity Officer'},
    }
