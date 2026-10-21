# HealthTech Backend (Django)

This is the backend API for the HealthTech application. It is built using Django and Django REST Framework, providing secure API endpoints for authentication, appointment booking, medical records, and AI symptom checking.

## Prerequisites

- Python 3.10+
- [Ollama](https://ollama.com/) (Required for the AI Symptom Checker)

## Installation & Setup

Follow these steps to get the backend server running locally on Windows:

### 1. Activate the Virtual Environment
Navigate to the root directory of your project (where `venv` is located) and activate the virtual environment:
```powershell
# From the root health-tech directory
.\venv\Scripts\Activate.ps1
```

### 2. Install Requirements
Navigate into the `backend` directory and install the necessary Python packages using the generated `requirements.txt`:
```powershell
cd backend
pip install -r requirements.txt
```
*Key dependencies include `Django`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`, and `requests`.*

### 3. Run Database Migrations
We are using SQLite for local development. Apply the database migrations to create the required tables:
```powershell
python manage.py makemigrations
python manage.py migrate
```

### 4. Create an Admin User (Superuser)
You will need a superuser account to access the Django Admin panel and manage users, appointments, and records manually.
```powershell
python manage.py createsuperuser
```
Follow the prompts to set your username, email, and password.

### 5. Start the Development Server
Run the local Django development server:
```powershell
python manage.py runserver
```
The backend API will now be running at **http://localhost:8000/**.

---

## AI Symptom Checker Setup (Ollama)
The `/api/triage/analyze/` endpoint connects to a local instance of Ollama to generate medical triage responses.
1. Download and install Ollama from [ollama.com](https://ollama.com/).
2. Open a separate terminal window and run:
   ```bash
   ollama run llama3
   ```
   *(Note: If Ollama is not running, the API will safely fall back to a default "offline" message without crashing).*

---

## Key Endpoints

- **Auth**: `/api/token/` (POST) - Retrieve JWT access & refresh tokens.
- **Auth**: `/api/users/register/` (POST) - Register a new User (Patient/Doctor).
- **Appointments**: `/api/appointments/slots/` (GET) - Fetch available time slots.
- **Appointments**: `/api/appointments/slots/<id>/book/` (POST) - Book a slot securely.
- **Records**: `/api/records/` (GET) - Fetch NDPR-compliant medical records.
- **AI Triage**: `/api/triage/analyze/` (POST) - AI Symptom evaluation.
