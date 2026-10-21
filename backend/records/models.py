from django.db import models
from django.conf import settings
from appointments.models import Appointment

class MedicalRecord(models.Model):
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='medical_records')
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='authored_records')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='records')
    
    diagnosis = models.CharField(max_length=255)
    symptoms = models.TextField()
    treatment_plan = models.TextField()
    prescriptions = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Record for {self.patient.username} - {self.created_at.strftime('%Y-%m-%d')}"

import uuid

class EmergencyProfile(models.Model):
    patient = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='emergency_profile')
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, help_text="Used for public QR code scanning")
    
    blood_group = models.CharField(max_length=5, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Emergency Profile - {self.patient.username}"

class Allergy(models.Model):
    profile = models.ForeignKey(EmergencyProfile, on_delete=models.CASCADE, related_name='allergies')
    name = models.CharField(max_length=100)
    severity = models.CharField(max_length=50, choices=[('Low', 'Low'), ('Moderate', 'Moderate'), ('Severe', 'Severe')])

    def __str__(self):
        return f"{self.name} ({self.severity}) - {self.profile.patient.username}"

class ChronicCondition(models.Model):
    profile = models.ForeignKey(EmergencyProfile, on_delete=models.CASCADE, related_name='conditions')
    name = models.CharField(max_length=100)
    diagnosed_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} - {self.profile.patient.username}"

class PatientDocument(models.Model):
    class Category(models.TextChoices):
        LAB_TEST = 'LAB_TEST', 'Laboratory / Blood Test Result'
        PRESCRIPTION = 'PRESCRIPTION', 'Prescription Slip'
        IMAGING = 'IMAGING', 'Radiology / X-Ray / Scan'
        DISCHARGE = 'DISCHARGE', 'Hospital Discharge Summary'
        IMMUNIZATION = 'IMMUNIZATION', 'Vaccine / Immunization Record'
        HISTORICAL = 'HISTORICAL', 'Past Medical History & EHR Record'
        OTHER = 'OTHER', 'Other Clinical Document'

    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ehr_documents')
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.LAB_TEST)
    facility_or_doctor = models.CharField(max_length=200, blank=True, help_text="Hospital, clinic, or physician name")
    document_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, help_text="Summary of findings, dosages, or notes")
    file = models.FileField(upload_to='patient_ehr/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.patient.username}"
