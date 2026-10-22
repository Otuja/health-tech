# HealthTech Backend (Django REST Framework)

This is the backend API for the HealthTech application. Built with Django and Django REST Framework, it powers authentication, real-time concurrency-locked appointment scheduling, NDPR-compliant electronic medical records (EHR), and AI-driven clinical symptom triage with Google Gemini.

---

## 📋 Prerequisites

- Python 3.10+
- Google Gemini API Key (optional for development; offline clinical fallback engine is included)

---

## 🛠️ Installation & Setup

### 1. Activate the Virtual Environment
```powershell
# From the root directory:
.\venv\Scripts\Activate.ps1
```

### 2. Install Requirements
```powershell
cd backend
pip install -r requirements.txt
```
Key dependencies:
- `Django==6.1.1`
- `djangorestframework==3.18.1`
- `djangorestframework_simplejwt==5.5.1`
- `django-cors-headers==4.9.0`
- `python-decouple==3.8`
- `requests==2.34.2`

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Populate `.env` with your settings:
```ini
SECRET_KEY=your_django_secret_key_here
DEBUG=True
ALLOWED_HOSTS=*
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run Migrations & Seed Clinical Data
```powershell
python manage.py makemigrations
python manage.py migrate
python create_test_users.py
```

### 5. Start the Server
```powershell
python manage.py runserver
```
The backend API is now live at **http://127.0.0.1:8000/**.

---

## 🧠 AI Clinical Triage Setup (Google Gemini)

The `/api/triage/analyze/` endpoint provides clinical symptom evaluation:
- **Cloud Engine:** Uses Google Gemini (`gemini-flash-lite-latest` or `gemini-3.5-flash`).
- **Resilient Fallback:** If the API key is not supplied or network connectivity drops, the built-in clinical heuristics engine safely evaluates emergencies without crashing.
- **Red-Flag Emergency Detection:** Typo-tolerant regex checks for hemoptysis, severe bleeding, trauma, stroke, and cardiovascular distress.
- **Dynamic Specialist Routing:** Automatically routes to Pulmonology, Cardiology, or Emergency Medicine & Trauma with single-tap booking availability.

---

## 🔌 Core API Endpoints

| Area | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | POST | `/api/token/` | Obtain JWT access and refresh tokens |
| **Auth** | POST | `/api/token/refresh/` | Refresh expired JWT access token |
| **Auth** | POST | `/api/users/register/` | Register new patient account |
| **Profile** | GET | `/api/users/me/` | Authenticated user profile |
| **Admin** | GET | `/api/users/admin/stats/` | System-wide operational dashboard metrics |
| **Admin** | GET/POST | `/api/users/admin/doctors/` | Doctor management and staff onboarding |
| **Appointments** | GET | `/api/appointments/slots/` | View available appointment slots |
| **Appointments** | POST | `/api/appointments/slots/<id>/book/` | Concurrency-protected slot reservation |
| **Records** | GET/POST | `/api/records/` | NDPR-compliant patient clinical records |
| **AI Triage** | POST | `/api/triage/analyze/` | Symptom assessment and doctor routing |
