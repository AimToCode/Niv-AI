# Nivaran — Citizen Grievance Classification System

AI-powered Flask web app where citizens submit complaints in 24 Indian languages and the system auto-classifies, scores urgency, and routes them to the correct government department.

## Tech Stack
- **Backend:** Python 3.11 + Flask 3
- **Frontend:** Server-rendered Jinja2 templates + vanilla HTML/CSS/JS (no frameworks)
- **AI:** Mistral 7B via OpenRouter (optional — falls back to keyword classifier)
- **Translation:** Google Cloud Translation API (optional — falls back to no translation)
- **Database:** AWS DynamoDB (optional — falls back to in-memory store)
- **Notifications:** AWS SNS (optional)
- **PWA:** Service worker in `/offline`

## Project Structure
```
app.py              Flask entry point + all routes
config.py           Env var / settings loader
requirements.txt    Python dependencies
backend/            classifier, urgency, translator, router, duplicate, notifier, aws_db
templates/          Jinja2 HTML pages (index, tracking, dashboard, admin, analytics)
static/             css/, js/, manifest.json, assets/
offline/            service-worker.js
```

## Run
The `Start application` workflow runs `python app.py` and serves on port 5000 (Replit webview).

## Environment Variables (all optional)
See `.env.example`. Without keys the app uses local fallbacks (keyword classification + in-memory storage), which is enough for demos.

Keys: `OPENROUTER_API_KEY`, `GOOGLE_TRANSLATE_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SNS_HIGH_URGENCY_TOPIC`, `SECRET_KEY`.

## Demo Logins (department officers)
| Username | Password | Role |
|---|---|---|
| admin | admin123 | Super Admin |
| water.officer | water123 | Jal Nigam |
| pwd.officer | pwd123 | PWD |
| elec.officer | elec123 | DISCOM |
