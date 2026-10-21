from rest_framework import serializers
from .models import Slot, Appointment

class SlotSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    doctor_username = serializers.CharField(source='doctor.username', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)

    class Meta:
        model = Slot
        fields = '__all__'
        read_only_fields = ['doctor']

class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_username = serializers.CharField(source='patient.username', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    slot_start_time = serializers.DateTimeField(source='slot.start_time', read_only=True)
    slot_end_time = serializers.DateTimeField(source='slot.end_time', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['patient']
