# HealthTech Testing & Demo Credentials

This document provides full credentials and guided testing workflows for the HealthTech application.

---

## 🔑 User Accounts

| Role | Username | Password | Full Name | Extra Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `adminpass123` | Chief Medical Director | System Superuser with full governance & Django admin access |
| **Doctor** | `doctor` | `doctorpass123` | Dr. Sarah Connor | Specialization: **Consultant Cardiologist** |
| **Doctor 2** | `dr_babatunde` | `doctorpass123` | Dr. Babatunde Adeleke | Specialization: **Emergency Medicine & Trauma** |
| **Doctor 3** | `dr_amina` | `doctorpass123` | Dr. Amina Bello | Specialization: **Consultant Pulmonologist** |
| **Patient 1** | `patient` | `patientpass123` | Alex Murphy | Blood Group: **O+**, Active Health Profile, Lab CMP & ECG uploaded |
| **Patient 2** | `chioma` | `patientpass123` | Chioma Okonkwo | Blood Group: **A+**, Asthma treatment plan |

---

## 🚀 Quick Testing Workflows

### 1. Doctor Workflow
1. Navigate to **http://localhost:3000/login**.
2. Sign in using `doctor` / `doctorpass123`.
3. You will be redirected to the **Doctor Dashboard** (`/doctor/dashboard`):
   - View live overview metrics (Appointments Today, Total Patients, Next Slot).
   - View Today's schedule with patient Alex Murphy.
4. Click **My Schedule** (`/doctor/appointments`):
   - View existing slots and booked sessions.
   - Add new availability time slots using the "Add Availability" form.
5. Click **My Patients** (`/doctor/patients`):
   - View directory of assigned patients.
   - Click "Draft Record" or "View Records".
6. Click **Medical Records** (`/doctor/records`):
   - View existing verified records for assigned patients.
   - Click "+ Draft New Record" and select Alex Murphy from the assigned patients dropdown.

---

### 2. Patient Workflow
1. Sign in using `patient` / `patientpass123`.
2. You will be redirected to the **Patient Dashboard** (`/patient/dashboard`):
   - View your upcoming visit with Dr. Sarah Connor.
   - View verified diagnosis summary.
3. Click **Appointments** (`/patient/appointments`):
   - Browse open slots published by Dr. Sarah Connor.
   - Click "Book Slot" to test real-time concurrency reservation.
4. Click **Medical Records** (`/patient/records`):
   - Review your NDPR-protected diagnosis, symptoms, clinical treatment plan, and prescription.
5. Click **AI Symptom Checker** (`/patient/triage`):
   - Describe symptoms (e.g., *"I have had a mild chest flutter and shortness of breath for two days"*).
   - Receive intelligent assessment with clinical disclaimers and 1-click specialist fast-track booking (via Google Gemini Cloud AI or clinical fallback).
6. Click **Emergency Profile (QR)** (`/patient/emergency`):
   - View your emergency card: Blood Group `O+`, emergency contact Ellen Murphy, Allergies (Penicillin, Peanuts), and Chronic Conditions.
   - View your scannable Emergency QR code.
   - Test the direct link to the public First Responder paramedic scan page!

---

### 3. Patient EHR & Document Upload Workflow
1. Navigate to **Medical Records** (`/patient/records`).
2. Notice the two dedicated tabs:
   - **Tab 1: "My Uploaded Health Documents & Lab Tests"**:
     - Click **"+ Upload Health Document"**.
     - Enter title (e.g., *"Full Blood Count (FBC) & Malaria Test"*).
     - Select category (*Laboratory / Blood Test*, *Scans & X-Rays*, *Prescriptions*, *Discharge Summaries*, *Vaccines*, or *Past Medical History*).
     - Enter clinic name (e.g. *"Reddington Hospital"*), document date, notes, and attach a file (PDF, PNG, JPG).
     - Save to encrypt and store in your electronic health record.
   - **Tab 2: "Doctor Encounters & Verified Prescriptions"**:
     - Read official clinical notes, symptoms, and treatment plans authored by your physician.
3. Doctors (`/doctor/records`) can also view your uploaded lab tests and EHR reports under their **"Patient Uploaded EHR & Lab Reports"** tab!

---

### 4. Emergency Paramedic / Mobile Phone QR Scanner
- When scanning the QR code with your **physical smartphone camera**:
  1. Ensure your smartphone is connected to the **same Wi-Fi network** as this computer (`192.168.1.184`).
  2. Open the patient emergency page (`/patient/emergency`). The QR code automatically targets `http://192.168.1.184:3000/emergency/[uuid]`.
  3. Scan the QR code directly with your phone camera or QR scanner.
  4. The emergency vitals pass will load instantly on your phone!
  5. If testing on your computer browser, click **"Preview Paramedic Scan Page"** or open:
     **http://localhost:3000/emergency/8539b970-0c48-4fcb-a682-80183d63bffd**
- **No login is required**. First responders instantly see critical medical vitals, severe allergies with color-coded warning badges, and a one-tap phone call button for emergency contacts.

---

### 5. Admin & Operations Governance Workflow
1. Navigate to **http://localhost:3000/login**.
2. Sign in using `admin` / `adminpass123`.
3. You will be redirected to the **Operations & Governance Portal** (`/admin/dashboard`):
   - **Live Platform Metrics:** Total Patients, Active Doctors, Consultations Booked, Encrypted EHR & Passes.
   - **Clinician Credentialing:** One-click toggles to activate or suspend practicing privileges for doctors.
   - **Telehealth Audit Stream:** Real-time visibility into all booked consultations across the hospital.
4. Click **Doctor Credentialing** (`/admin/doctors`):
   - Search physicians by name, specialty, or email.
   - Filter by active or suspended licenses.
   - Toggle privileges with instant toast notifications.
5. Click **Patients & Registry** (`/admin/patients`):
   - Search the patient registry.
   - Inspect active emergency QR passes and encrypted document tallies.
6. Click **Django Admin** in the sidebar (or top right button) to launch the low-level administrative database console (`http://localhost:8000/admin/`).
7. Click **"+ Onboard New Clinician"** to register and credential new physicians directly from the frontend.

---

### 6. Virtual Telehealth Video Consultation Rooms
- **Consultation Room #1 (Dr. Sarah Connor & Alex Murphy):**
  - **URL:** [https://health-tech-psi.vercel.app/consultation/1](https://health-tech-psi.vercel.app/consultation/1)
  - **Doctor Account:** `doctor` / `doctorpass123`
  - **Patient Account:** `patient` / `patientpass123`
- **Consultation Room #3 (Dr. Sarah Connor & Chioma Okonkwo):**
  - **URL:** [https://health-tech-psi.vercel.app/consultation/3](https://health-tech-psi.vercel.app/consultation/3)
  - **Doctor Account:** `doctor` / `doctorpass123`
  - **Patient Account:** `chioma` / `patientpass123`

#### Video Call Features:
- **Live WebRTC Stream with TURN/STUN Relay:** Enables real-time video and audio feeds across different networks (e.g., mobile cellular 4G/5G <-> home Wi-Fi).
- **Call Controls:** Mute microphone, toggle camera, or end consultation.
- **Resilient Fallback:** If webcam hardware is busy or exclusive to another tab/app, automatically falls back to encrypted audio-only streaming without halting the call.
- **One-Click Reconnect:** Click `🔄 Reconnect` in the header at any time to re-negotiate ICE candidates and signaling without reloading.
- **In-Call Clinical Chat:** Real-time messages sent strictly between the attending physician and patient.
- **Consultation End Notification:** When either participant leaves or ends the consultation, the other device is notified immediately with a session termination modal.

---

### 7. Profile & Personal Details Management
- **Patient Profile & Emergency Vitals:** [https://health-tech-psi.vercel.app/patient/profile](https://health-tech-psi.vercel.app/patient/profile)
  - Allows patients to view and update:
    - First Name, Last Name, Email address
    - Blood Group (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`)
    - Date of Birth, Height (cm), Weight (kg)
    - Emergency Contact Name & Emergency Contact Phone Number
    - Clinical Allergies & Chronic Conditions (with 1-click addition and removal tags)
  - All updates sync immediately with the emergency QR pass and backend NDPR encrypted database.
- **Doctor Profile & Credentials:** [https://health-tech-psi.vercel.app/doctor/profile](https://health-tech-psi.vercel.app/doctor/profile)
  - Allows physicians to update:
    - First Name, Last Name, Email address
    - Clinical Specialization (e.g., *Cardiology*, *Emergency Medicine & Trauma*, *Pulmonology*, *General Practice*)
  - Updates immediately propagate across the patient booking schedule and prescription generator.

---

### 7. Official Medical Prescription & Encounter Summary Generator
1. Navigate to **Medical Records** (`/patient/records`).
2. Under the **"Doctor Encounters & Verified Prescriptions"** tab, click **"Print Official Rx"**.
3. Displays the print-ready clinical prescription slip featuring:
   - Hospital Letterhead & Regulatory License numbers.
   - Attending physician details, patient NDPR identifier, diagnosis, and symptoms.
   - Official `℞` medication box with dosage, frequency, and treatment directives.
   - Authenticity stamp and clinician signature line.
   - Click **"Print / Save as PDF"** to print or export as an official PDF.

---

## 🛠️ Re-Seeding Test Data
To re-seed or reset test data at any time:
```powershell
# From project root
.\backend\venv\Scripts\python.exe backend\create_test_users.py
```
