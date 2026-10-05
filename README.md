# 🏛️ Niv-AI — AI-Based Citizen Grievance Management System

> **Apni Samasya, Sahi Jagah** — Your Problem, The Right Place

Niv-AI is an AI-powered grievance management system designed to help organize citizen complaints, classify issues, identify relevant government departments, and prioritize complaints based on urgency.

The project combines a Python Flask backend with a web-based interface to make grievance handling more structured and accessible.

## 🚀 Key Features

- 🤖 **AI-Powered Complaint Classification** — Uses Google's Gemini API when configured, with keyword-based fallback classification.
- 🏛️ **Department Identification** — Helps determine the appropriate department for a complaint.
- 🚨 **Urgency Classification** — Categorizes complaints by urgency.
- 📊 **Admin Dashboard** — Provides an interface for administrators to manage and review complaints.
- 🗂️ **Complaint Management** — Supports complaint status and record management.
- 🔔 **In-App Alerts** — Includes backend functionality for retrieving alerts and unread alert counts.
- 🌐 **Translation Support** — Includes a translation service integration point.
- ☁️ **Database Integration** — Includes AWS database integration code, depending on configuration.
- 📱 **Web-Based Interface** — Built with HTML, CSS, and JavaScript.

*Note: Available functionality may depend on environment configuration, API credentials, database setup, and the deployed version.*

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask |
| AI Classification | Google Gemini API |
| Fallback Classification | Keyword-based classification |
| Database Integration | AWS database module |
| Notifications | Application alert functionality |
| Deployment | Vercel deployment configuration |

## 📁 Project Structure

```text
Niv-AI/
├── app.py                  # Flask application entry point
├── requirements.txt        # Python dependencies
├── backend/
│   ├── classifier.py       # AI and fallback classification
│   ├── aws_db.py           # AWS database integration
│   └── ...                 # Other backend modules
├── templates/
│   ├── admin.html          # Admin dashboard
│   └── ...                 # Other HTML templates
├── static/                 # Static assets, if included
└── README.md               # Project documentation
```

*The structure above highlights the main files; additional modules and directories may be present in the repository.*

## ⚙️ Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/AimToCode/Niv-AI.git
cd Niv-AI
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Configure the environment variables required by your selected services.

For Gemini-based classification, set:

```text
GEMINI_API_KEY=your_gemini_api_key
```

Use your local environment or hosting provider's environment-variable settings. **Never commit real API keys, passwords, or other secrets to GitHub.**

Additional variables may be required if AWS or other integrations are enabled.

### 5. Start the application

```bash
python app.py
```

### 6. Open the application

Visit the local URL printed by Flask in your terminal. The default development URL is commonly:

```text
http://127.0.0.1:5000
```

## 🔑 Configuration

| Service | Purpose |
|---|---|
| Google Gemini API | AI-based complaint classification |
| Keyword fallback | Provides a fallback classification path |
| AWS integration | Supports configured database functionality |
| Translation integration | Supports translation-related functionality |

The exact environment variables required depend on which integrations you enable. Consult the relevant backend modules before configuring optional services.

## 🌐 Deployment

The project is connected to GitHub:

**Repository:** https://github.com/AimToCode/Niv-AI

The application is being deployed through Vercel. Deployment success and backend compatibility depend on the project's Vercel configuration, Python runtime support, and environment variables.

## 🎯 Project Objective

The goal of Niv-AI is to simplify grievance management by helping route complaints to the appropriate departments and making complaint handling more organized.

The project explores practical applications of artificial intelligence, backend development, and web technologies to address a real-world public-service problem.

## 👨‍💻 Project Team

**Project:** Niv-AI — AI-Based Citizen Grievance Management System

**Built for:** Hackathon / Student Project

**Institution:** Bansal College of Engineering, Mandideep

## 🤝 Contributions

Suggestions, bug reports, and improvements are welcome. Feel free to explore the repository and contribute to making the project better.

---

⭐ If you find this project interesting, consider starring the repository!

**Developed as a student project exploring AI-powered solutions for citizen grievance management.**
