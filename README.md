# HealthTech Telemedicine Platform

A modern, enterprise-grade, full-stack telemedicine and clinical triage platform built with **Next.js (App Router)**, **Django REST Framework**, and **Google Gemini AI**.

---

## 🌟 Key Features

### 1. AI Clinical Symptom Triage & Specialist Fast-Tracking
- **Google Gemini Cloud AI:** Live streaming typewriter assessment of patient symptoms with structured clinical explanations.
- **Typo-Tolerant Red-Flag Detection:** Proprietary heuristic engine detecting critical life-threatening conditions (severe bleeding, acute chest pain, hemoptysis, stroke symptoms, respiratory distress) regardless of patient typos.
- **1-Click Fast-Track Specialist Booking:** Automatically matches symptoms to qualified clinicians (Pulmonology, Cardiology, Emergency Medicine & Trauma) with single-tap slot reservation directly inside the chat interface.

### 2. Emergency Paramedic QR Pass
- **Offline Scannable Pass:** Instant QR code containing NDPR-compliant emergency data (blood group, allergies, chronic conditions, and next-of-kin contacts).
- **Public First-Responder Scan:** Secure emergency access for paramedics and ER personnel without authentication barriers.

### 3. Telehealth Video Consultations
- **Integrated Video Room:** Real-time patient-doctor video consultation rooms with camera controls, audio toggling, and live in-call clinical messaging.

### 4. Role-Based Governance & Portals
- **Admin Portal:** Hospital-wide operational analytics, physician onboarding, specialty management, and patient verification.
- **Doctor Portal:** Calendar schedule publishing, appointment management, verified EHR drafting, and NDPR-compliant patient records.
- **Patient Portal:** Appointment scheduling with concurrency race-condition locks, personal EHR history, prescription access, and document upload.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Sonner |
| **Backend** | Django 6, Django REST Framework, SQLite (Development) / PostgreSQL (Production) |
| **Configuration** | `python-decouple` with `.env` separation for secrets and API keys |
| **AI Integration** | Google Gemini Generative AI (`gemini-flash-lite-latest` / `gemini-3.5-flash`) with offline heuristic fallback |
| **Authentication** | JWT (`djangorestframework-simplejwt`) with automatic token rotation & refresh |

---

## 🚀 Getting Started

### 1. Backend (Django) Setup

```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows PowerShell
# source venv/bin/activate  # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy template and add your Gemini API key:
cp .env.example .env

# Run database migrations and seed data
python manage.py makemigrations
python manage.py migrate
python create_test_users.py

# Start development server
python manage.py runserver
```
The Django backend API will be running at **http://127.0.0.1:8000/**.

---

### 2. Frontend (Next.js) Setup

```powershell
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start development server
npm run dev
```
The Next.js frontend will be running at **http://localhost:3000/**.

---

## 🔑 Test Credentials

The database comes pre-seeded with multi-specialty clinical staff and test patients:

| Role | Username | Password | Full Name / Specialty |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `adminpass123` | Chief Medical Director (Superuser) |
| **Doctor** | `doctor` | `doctorpass123` | Dr. Sarah Connor (Cardiologist) |
| **Doctor** | `dr_babatunde` | `doctorpass123` | Dr. Babatunde Adeleke (Emergency Medicine & Trauma) |
| **Doctor** | `dr_amina` | `doctorpass123` | Dr. Amina Bello (Consultant Pulmonologist) |
| **Patient** | `patient` | `patientpass123` | Alex Murphy (Blood Group: O+) |
| **Patient** | `chioma` | `patientpass123` | Chioma Okonkwo (Blood Group: A+) |

For complete testing flows and scenarios, see [`TEST_CREDENTIALS.md`](TEST_CREDENTIALS.md).

---

## 📄 License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.
