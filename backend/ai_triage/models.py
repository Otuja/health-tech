import uuid
from django.db import models
from django.conf import settings

class AIConsultationSession(models.Model):
    class Category(models.TextChoices):
        CLINICAL_TRIAGE = 'CLINICAL_TRIAGE', 'Clinical Symptom Triage'
        NUTRITION_DIET = 'NUTRITION_DIET', 'Nutrition & Dietary Health'
        LIFESTYLE_WELLNESS = 'LIFESTYLE_WELLNESS', 'Lifestyle & Preventive Wellness'
        MEDICATION_INQUIRY = 'MEDICATION_INQUIRY', 'Medications & Pharmacotherapy'
        GENERAL_HEALTH = 'GENERAL_HEALTH', 'General Health Guidance'

    class Urgency(models.TextChoices):
        ROUTINE = 'ROUTINE', 'Routine / Self-Care'
        MODERATE = 'MODERATE', 'Moderate (Clinic Review Recommended)'
        URGENT = 'URGENT', 'Urgent (Fast-Track Consultation)'
        EMERGENCY = 'EMERGENCY', 'Critical Emergency (Immediate ER)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_consultation_sessions')
    title = models.CharField(max_length=255, default='New Health Consultation')
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.GENERAL_HEALTH)
    urgency = models.CharField(max_length=30, choices=Urgency.choices, default=Urgency.ROUTINE)
    is_emergency = models.BooleanField(default=False)
    emergency_reason = models.CharField(max_length=255, blank=True)
    recommended_specialty = models.CharField(max_length=100, default='General Practice')
    disclaimer_acknowledged = models.BooleanField(default=True, help_text="Medical AI terms acknowledged by patient")
    ndpr_compliant = models.BooleanField(default=True, help_text="Compliant with NDPR & Health Data Privacy requirements")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} - {self.patient.username} ({self.created_at.strftime('%Y-%m-%d')})"

class AIConsultationMessage(models.Model):
    class Sender(models.TextChoices):
        USER = 'user', 'Patient'
        AI = 'ai', 'HealthTech AI'

    session = models.ForeignKey(AIConsultationSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=10, choices=Sender.choices)
    content = models.TextField()
    routing_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.upper()} in {self.session.id} at {self.created_at.strftime('%H:%M:%S')}"
