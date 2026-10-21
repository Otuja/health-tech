# HealthTech Application

A full-stack, AI-powered healthcare application built with **Next.js**, **Django**, and **Ollama**.

## Features

- **Role-Based Authentication (JWT):** Secure Patient, Doctor, and Admin portals.
- **Appointment Booking:** Real-time concurrency protection for slot booking to prevent double booking.
- **Strict Medical Records (NDPR Compliant):** Doctors can only access records of patients they are actively treating. Patients can only see their own records.
- **AI Symptom Checker (Triage):** An integrated chat interface utilizing local LLMs (via Ollama) to securely analyze patient symptoms before booking.
- **Modern UI:** Built with Tailwind CSS and Framer Motion for a stunning, responsive, and animated user experience.

## Architecture

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Framer Motion
- **Backend:** Django, Django REST Framework, SQLite (Development)
- **AI Integration:** Python `requests` communicating with a local Ollama instance (e.g., Llama 3)
- **Authentication:** `djangorestframework-simplejwt` (Access & Refresh tokens)

## Getting Started

### 1. Backend (Django) Setup

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # On Windows
pip install -r requirements.txt # Or install django, djangorestframework, djangorestframework-simplejwt, django-cors-headers, requests
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### 2. Frontend (Next.js) Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. AI Triage (Local LLM)
Make sure you have [Ollama](https://ollama.com/) installed and running locally on port `11434`.
```bash
ollama run llama3
```
*Note: If Ollama is not running, the application has a built-in graceful fallback response.*

## License

This project is licensed under the MIT License - tailored for final year academic projects. See the [LICENSE](LICENSE) file for details.

## Test Credentials

For testing purposes, the following accounts have been created. You can use these credentials to log in and test the different portals.

| Role | Username | Password |
| --- | --- | --- |
| **Admin** | `admin` | `adminpass123` |
| **Doctor** | `doctor` | `doctorpass123` |
| **Patient** | `patient` | `patientpass123` |
