from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = 'PATIENT', 'Patient'
        DOCTOR = 'DOCTOR', 'Doctor'
        ADMIN = 'ADMIN', 'Admin'
    
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.PATIENT)
    specialization = models.CharField(max_length=100, blank=True, null=True, help_text="For doctors only (e.g. Cardiologist, General Practice)")

    def __str__(self):
        return f"{self.username} ({self.role})"
