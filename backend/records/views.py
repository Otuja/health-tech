from rest_framework import viewsets, serializers, generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import models
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import MedicalRecord, EmergencyProfile, Allergy, ChronicCondition, PatientDocument
from .serializers import (
    MedicalRecordSerializer, 
    EmergencyProfileSerializer, 
    AllergySerializer, 
    ChronicConditionSerializer,
    PatientDocumentSerializer
)
from appointments.models import Appointment

User = get_user_model()

class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return MedicalRecord.objects.filter(patient=user)
        elif user.role == 'DOCTOR':
            patients_with_appointments = Appointment.objects.filter(doctor=user).values_list('patient', flat=True)
            return MedicalRecord.objects.filter(
                models.Q(doctor=user) | models.Q(patient__in=patients_with_appointments)
            ).distinct()
        elif user.role == 'ADMIN':
            return MedicalRecord.objects.all()
        return MedicalRecord.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role == 'DOCTOR':
            patient_id = self.request.data.get('patient_id')
            if not patient_id:
                raise serializers.ValidationError({"patient_id": "Patient ID is required."})
            has_appointment = Appointment.objects.filter(doctor=self.request.user, patient_id=patient_id).exists()
            if not has_appointment:
                raise serializers.ValidationError({"patient_id": "You can only create records for assigned patients."})
            serializer.save(doctor=self.request.user, patient_id=patient_id)
        else:
            raise serializers.ValidationError({"detail": "Only doctors can create medical records."})

class PatientDocumentViewSet(viewsets.ModelViewSet):
    """
    Patient Health Record (EHR) & Documents:
    Patients can upload and manage their external lab results, past hospital summaries,
    vaccine cards, and prescription slips.
    Doctors can view documents belonging to their assigned patients.
    """
    serializer_class = PatientDocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return PatientDocument.objects.filter(patient=user)
        elif user.role == 'DOCTOR':
            patient_id = self.request.query_params.get('patient_id')
            patients_with_appointments = Appointment.objects.filter(doctor=user).values_list('patient', flat=True)
            qs = PatientDocument.objects.filter(patient__in=patients_with_appointments)
            if patient_id:
                qs = qs.filter(patient_id=patient_id)
            return qs
        elif user.role == 'ADMIN':
            patient_id = self.request.query_params.get('patient_id')
            if patient_id:
                return PatientDocument.objects.filter(patient_id=patient_id)
            return PatientDocument.objects.all()
        return PatientDocument.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'PATIENT':
            serializer.save(patient=user)
        elif user.role == 'DOCTOR':
            patient_id = self.request.data.get('patient_id')
            if not patient_id:
                raise serializers.ValidationError({"patient_id": "Patient ID is required when doctor uploads on behalf of patient."})
            has_appointment = Appointment.objects.filter(doctor=user, patient_id=patient_id).exists()
            if not has_appointment:
                raise serializers.ValidationError({"patient_id": "You can only upload documents for assigned patients."})
            target_patient = get_object_or_404(User, id=patient_id)
            serializer.save(patient=target_patient)
        elif user.role == 'ADMIN':
            patient_id = self.request.data.get('patient_id')
            target_patient = get_object_or_404(User, id=patient_id) if patient_id else user
            serializer.save(patient=target_patient)
        else:
            serializer.save(patient=user)

class EmergencyProfileViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return EmergencyProfile.objects.filter(patient=user)
        elif user.role == 'DOCTOR':
            return EmergencyProfile.objects.all() # Doctors can see all profiles if needed for triage
        elif user.role == 'ADMIN':
            return EmergencyProfile.objects.all()
        return EmergencyProfile.objects.none()

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='my-profile')
    def my_profile(self, request):
        profile, _ = EmergencyProfile.objects.get_or_create(patient=request.user)
        if request.method in ['PUT', 'PATCH']:
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

class AllergyViewSet(viewsets.ModelViewSet):
    serializer_class = AllergySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Allergy.objects.filter(profile__patient=self.request.user)

    def perform_create(self, serializer):
        profile, _ = EmergencyProfile.objects.get_or_create(patient=self.request.user)
        serializer.save(profile=profile)

class ChronicConditionViewSet(viewsets.ModelViewSet):
    serializer_class = ChronicConditionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChronicCondition.objects.filter(profile__patient=self.request.user)

    def perform_create(self, serializer):
        profile, _ = EmergencyProfile.objects.get_or_create(patient=self.request.user)
        serializer.save(profile=profile)

class PublicEmergencyProfileView(generics.RetrieveAPIView):
    """
    Public endpoint for paramedics to scan QR code and view critical data.
    """
    queryset = EmergencyProfile.objects.all()
    serializer_class = EmergencyProfileSerializer
    permission_classes = [AllowAny]
    lookup_field = 'uuid'

