# 🏛️ Nivaran — AI-Based Citizen Grievance Classification System

> *Apni Samasya, Sahi Jagah* — Your Problem, The Right Place

An AI-powered platform where Indian citizens can submit complaints in any of 24 Indian languages. The system automatically classifies complaints, detects urgency, and routes them to the correct government department.

---

## 🚀 Quick Start (Run Locally)

### Step 1 — Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 2 — Set up environment variables
```bash
cp .env.example .env
# Open .env and add your API keys
```

### Step 3 — Run the app
```bash
python app.py
```

### Step 4 — Open in browser
```
http://localhost:5000
```

---

## 🔑 API Keys You Need

| Service | Where to Get | Required? |
|---------|-------------|-----------|
| OpenRouter API | https://openrouter.ai | ✅ For AI classification |
| Google Translate | https://console.cloud.google.com | Optional |
| AWS Access Key | https://aws.amazon.com/iam | Optional (has local fallback) |
| AWS SNS Topic | AWS Console | Optional |

> **Note:** App works WITHOUT any API keys using keyword-based fallback classification and local in-memory storage. Perfect for demo/hackathon!

---

## 🎮 Demo Login Credentials

| Username | Password | Department |
|----------|----------|------------|
| admin | admin123 | Super Admin |
| water.officer | water123 | Jal Nigam |
| pwd.officer | pwd123 | PWD |
| elec.officer | elec123 | DISCOM |

---

## 📁 Project Structure

```
nivaran/
├── app.py              ← Flask server (main entry point)
├── config.py           ← All configuration & API keys
├── requirements.txt
├── .env.example        ← Copy to .env
│
├── /backend            ← Python AI/DB modules
│   ├── classifier.py   ← Mistral AI via OpenRouter
│   ├── urgency.py      ← Urgency keyword scoring
│   ├── translator.py   ← Google Translate API
│   ├── router.py       ← Department routing table
│   ├── duplicate.py    ← Duplicate detection
│   ├── notifier.py     ← AWS SNS notifications
│   └── aws_db.py       ← DynamoDB operations
│
├── /templates          ← HTML pages (Jinja2)
│   ├── index.html      ← Citizen complaint form
│   ├── tracking.html   ← Ticket tracker
│   ├── dashboard.html  ← Department officer view
│   ├── admin.html      ← Super admin panel
│   └── analytics.html  ← Charts & insights
│
├── /static
│   ├── /css            ← All stylesheets
│   └── /js             ← All JavaScript modules
│
└── /offline
    └── service-worker.js  ← PWA offline support
```

---

## ✨ Features

- 🤖 **AI Classification** — Mistral 7B via OpenRouter
- 🌐 **24 Indian Languages** — Hindi, Tamil, Bengali, Telugu + more
- 🎤 **Voice Input** — Web Speech API in native language
- 🚨 **Urgency Detection** — AI + keyword scoring
- 🏛️ **Auto Department Routing** — Smart routing table
- 📍 **GPS Location** — Reverse geocoding via Nominatim
- 🔄 **Duplicate Detection** — Text similarity check
- 📊 **Analytics Dashboard** — Chart.js visualizations
- 📡 **Offline Support** — PWA with IndexedDB queue
- ☁️ **AWS DynamoDB** — Cloud database
- 📱 **AWS SNS** — SMS/Email notifications
- 📱 **Mobile Responsive** — Mobile-first design

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Pure HTML + CSS + JavaScript (no frameworks) |
| Charts | Chart.js |
| Backend | Python + Flask |
| AI | Mistral 7B via OpenRouter API |
| Translation | Google Cloud Translation API |
| Database | AWS DynamoDB |
| Notifications | AWS SNS |
| PWA | Service Worker + IndexedDB |

---

## 👥 Team

Built for Hackathon — BIST Bansal, Bhopal

*Powered by Nivaran*
