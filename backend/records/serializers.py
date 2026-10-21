from rest_framework import serializers
from .models import MedicalRecord, EmergencyProfile, Allergy, ChronicCondition, PatientDocument

class MedicalRecordSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_username = serializers.CharField(source='patient.username', read_only=True)

    class Meta:
        model = MedicalRecord
        fields = '__all__'
        read_only_fields = ['patient', 'doctor']

class AllergySerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergy
        fields = '__all__'
        read_only_fields = ['profile']

class ChronicConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChronicCondition
        fields = '__all__'
        read_only_fields = ['profile']

class EmergencyProfileSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    allergies = AllergySerializer(many=True, read_only=True)
    conditions = ChronicConditionSerializer(many=True, read_only=True)

    class Meta:
        model = EmergencyProfile
        fields = '__all__'
        read_only_fields = ['patient', 'uuid']

class PatientDocumentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = PatientDocument
        fields = [
            'id', 'patient', 'patient_name', 'patient_email',
            'title', 'category', 'category_display',
            'facility_or_doctor', 'document_date', 'notes',
            'file', 'created_at'
        ]
        read_only_fields = ['patient', 'created_at']

