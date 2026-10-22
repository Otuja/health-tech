import os
import django
from datetime import datetime, timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from appointments.models import Slot, Appointment
from records.models import MedicalRecord, EmergencyProfile, Allergy, ChronicCondition, PatientDocument

User = get_user_model()

def create_users():
    print("--- Seeding Authentic Clinical Data ---")

    # 1. Admin User
    admin, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@healthtech.ng',
            'role': 'ADMIN',
            'first_name': 'Chief Medical',
            'last_name': 'Director',
            'is_staff': True,
            'is_superuser': True
        }
    )
    admin.role = 'ADMIN'
    admin.is_staff = True
    admin.is_superuser = True
    admin.first_name = 'Chief Medical'
    admin.last_name = 'Director'
    admin.set_password('adminpass123')
    admin.save()
    print("[OK] Admin: admin / adminpass123")

    # 2. Doctors (Multi-Specialty Clinical Team)
    doctors_data = [
        {
            'username': 'doctor',
            'email': 'dr.connor@healthtech.ng',
            'first_name': 'Sarah',
            'last_name': 'Connor',
            'specialization': 'Consultant Cardiologist'
        },
        {
            'username': 'dr_babatunde',
            'email': 'dr.babatunde@healthtech.ng',
            'first_name': 'Babatunde',
            'last_name': 'Adeleke',
            'specialization': 'Emergency Medicine & Trauma'
        },
        {
            'username': 'dr_amina',
            'email': 'dr.amina@healthtech.ng',
            'first_name': 'Amina',
            'last_name': 'Bello',
            'specialization': 'Consultant Pulmonologist'
        }
    ]

    doctors = []
    for d in doctors_data:
        doc, _ = User.objects.get_or_create(
            username=d['username'],
            defaults={
                'email': d['email'],
                'role': 'DOCTOR',
                'first_name': d['first_name'],
                'last_name': d['last_name'],
                'specialization': d['specialization']
            }
        )
        doc.set_password('doctorpass123')
        doc.first_name = d['first_name']
        doc.last_name = d['last_name']
        doc.specialization = d['specialization']
        doc.save()
        doctors.append(doc)
        print(f"[OK] Doctor: {doc.username} / doctorpass123 ({doc.specialization})")

    primary_doctor = doctors[0] # Dr. Sarah Connor
    emergency_doctor = doctors[1] # Dr. Babatunde Adeleke
    pulmo_doctor = doctors[2] # Dr. Amina Bello

    # 3. Patients
    patient, _ = User.objects.get_or_create(
        username='patient',
        defaults={
            'email': 'alex.murphy@healthtech.ng',
            'role': 'PATIENT',
            'first_name': 'Alex',
            'last_name': 'Murphy'
        }
    )
    patient.set_password('patientpass123')
    patient.first_name = 'Alex'
    patient.last_name = 'Murphy'
    patient.save()
    print("[OK] Patient: patient / patientpass123 (Alex Murphy)")

    patient2, _ = User.objects.get_or_create(
        username='chioma',
        defaults={
            'email': 'chioma.okonkwo@healthtech.ng',
            'role': 'PATIENT',
            'first_name': 'Chioma',
            'last_name': 'Okonkwo'
        }
    )
    patient2.set_password('patientpass123')
    patient2.first_name = 'Chioma'
    patient2.last_name = 'Okonkwo'
    patient2.save()
    print("[OK] Patient: chioma / patientpass123 (Chioma Okonkwo)")

    # 4. Slots & Appointments
    now = timezone.now()
    
    # Dr. Sarah Connor Appointments
    slot1_time = (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    slot1, _ = Slot.objects.get_or_create(
        doctor=primary_doctor,
        start_time=slot1_time,
        defaults={'end_time': slot1_time + timedelta(minutes=45), 'is_booked': True}
    )
    slot1.is_booked = True
    slot1.save()

    appt1, _ = Appointment.objects.get_or_create(
        slot=slot1,
        defaults={
            'patient': patient,
            'doctor': primary_doctor,
            'notes': 'Cardiovascular evaluation: Holter monitor results and morning BP calibration review.'
        }
    )

    # Chioma visit with Dr. Amina
    slot2_time = (now + timedelta(days=2)).replace(hour=14, minute=30, second=0, microsecond=0)
    slot2, _ = Slot.objects.get_or_create(
        doctor=pulmo_doctor,
        start_time=slot2_time,
        defaults={'end_time': slot2_time + timedelta(minutes=30), 'is_booked': True}
    )
    slot2.is_booked = True
    slot2.save()

    Appointment.objects.get_or_create(
        slot=slot2,
        defaults={
            'patient': patient2,
            'doctor': pulmo_doctor,
            'notes': 'Seasonal asthmatic bronchospasm checkup and peak flow meter review.'
        }
    )

    # Additional Available Booking Slots
    for d in [primary_doctor, emergency_doctor, pulmo_doctor]:
        for h in [24, 48, 72, 96]:
            stime = (now + timedelta(hours=h)).replace(minute=0, second=0, microsecond=0)
            Slot.objects.get_or_create(
                doctor=d,
                start_time=stime,
                defaults={'end_time': stime + timedelta(minutes=30), 'is_booked': False}
            )
    print("[OK] Seeded realistic availability schedule across all medical specialties.")

    # 5. Verified Medical Records (Authored by Clinicians)
    MedicalRecord.objects.get_or_create(
        patient=patient,
        doctor=primary_doctor,
        appointment=appt1,
        defaults={
            'diagnosis': 'Stage 1 Essential Hypertension & Sinus Arrhythmia',
            'symptoms': 'Patient presented with intermittent morning occipital headaches, lightheadedness after brisk walking, and documented ambulatory systolic readings averaging 142/90 mmHg.',
            'treatment_plan': '1. Lisinopril 10mg PO QD in the morning.\n2. DASH diet protocol (<2,000mg sodium daily).\n3. Aerobic exercise 30 minutes, 4x weekly.\n4. Repeat 24-hr ambulatory blood pressure monitoring in 4 weeks.',
            'prescriptions': '• Lisinopril 10mg Tablets — Take 1 tablet by mouth daily every morning (#30)\n• Coenzyme Q10 100mg Capsules — 1 capsule daily with food (#30)'
        }
    )

    # 6. Patient EHR & Uploaded Documents (Authentic Clinical Data)
    PatientDocument.objects.get_or_create(
        patient=patient,
        title='Comprehensive Metabolic Panel (CMP) & Lipid Profile',
        defaults={
            'category': PatientDocument.Category.LAB_TEST,
            'facility_or_doctor': 'Synlab Nigeria — Victoria Island Diagnostic Center',
            'document_date': (now - timedelta(days=12)).date(),
            'notes': 'Total Cholesterol: 188 mg/dL (Normal). HDL: 52 mg/dL. LDL: 110 mg/dL. Triglycerides: 130 mg/dL. Fasting Blood Glucose: 92 mg/dL (Euglycemic). Serum Creatinine: 0.9 mg/dL. eGFR > 90 mL/min/1.73m² (Normal renal function).'
        }
    )

    PatientDocument.objects.get_or_create(
        patient=patient,
        title='12-Lead Resting Electrocardiogram (ECG) Report',
        defaults={
            'category': PatientDocument.Category.IMAGING,
            'facility_or_doctor': 'First Cardiology Consultants, Ikoyi, Lagos',
            'document_date': (now - timedelta(days=20)).date(),
            'notes': 'Rate: 72 bpm, Normal Sinus Rhythm with occasional benign premature ventricular contraction (PVC). PR interval: 160ms. QRS duration: 88ms. No ST-segment elevations or ischemic T-wave inversions noted.'
        }
    )

    PatientDocument.objects.get_or_create(
        patient=patient,
        title='Routine Digital Chest Radiograph (PA View)',
        defaults={
            'category': PatientDocument.Category.IMAGING,
            'facility_or_doctor': 'Evercare Hospital Diagnostic Imaging, Lekki',
            'document_date': (now - timedelta(days=45)).date(),
            'notes': 'Normal cardiothoracic ratio (<0.50). Lung parenchyma is clear bilaterally with no consolidations, effusions, or pneumothorax. Costophrenic angles are sharp.'
        }
    )

    PatientDocument.objects.get_or_create(
        patient=patient,
        title='National Yellow Fever & International Health Certificate',
        defaults={
            'category': PatientDocument.Category.IMMUNIZATION,
            'facility_or_doctor': 'Port Health Services, Federal Ministry of Health Nigeria',
            'document_date': datetime(2025, 4, 18).date(),
            'notes': '17D Yellow Fever Vaccine administered (Batch #YF-994821). Lifetime validity confirmed under WHO International Health Regulations (IHR 2005).'
        }
    )
    print("[OK] Seeded realistic patient uploaded EHR documents & diagnostic reports.")

    # 7. Emergency Profile & Pass
    profile, _ = EmergencyProfile.objects.get_or_create(
        patient=patient,
        defaults={
            'blood_group': 'O+',
            'date_of_birth': datetime(1988, 6, 15).date(),
            'weight_kg': 78.50,
            'height_cm': 182.00,
            'emergency_contact_name': 'Ellen Murphy (Spouse)',
            'emergency_contact_phone': '+234 801 234 5678'
        }
    )
    profile.blood_group = 'O+'
    profile.date_of_birth = datetime(1988, 6, 15).date()
    profile.weight_kg = 78.50
    profile.height_cm = 182.00
    profile.emergency_contact_name = 'Ellen Murphy (Spouse)'
    profile.emergency_contact_phone = '+234 801 234 5678'
    profile.save()

    Allergy.objects.get_or_create(
        profile=profile,
        name='Penicillin & Beta-Lactam Antibiotics',
        defaults={'severity': 'Severe'}
    )
    Allergy.objects.get_or_create(
        profile=profile,
        name='Peanuts & Tree Nuts',
        defaults={'severity': 'Moderate'}
    )
    ChronicCondition.objects.get_or_create(
        profile=profile,
        name='Mild Exercise-Induced Asthma',
        defaults={'notes': 'Inhales Albuterol sulfate 2 puffs 15 minutes prior to vigorous exercise. Responsive to bronchodilators.'}
    )
    print(f"[OK] Emergency Vitals Pass configured (UUID: {profile.uuid})")
    print("=== Database successfully updated with authentic clinical health data! ===")

if __name__ == '__main__':
    create_users()
