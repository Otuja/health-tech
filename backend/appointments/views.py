from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from rest_framework.permissions import IsAuthenticated
from .models import Slot, Appointment
from .serializers import SlotSerializer, AppointmentSerializer

class SlotViewSet(viewsets.ModelViewSet):
    queryset = Slot.objects.all()
    serializer_class = SlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'DOCTOR':
            return Slot.objects.filter(doctor=self.request.user)
        return Slot.objects.filter(is_booked=False)

    def perform_create(self, serializer):
        if self.request.user.role != 'DOCTOR':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only doctors can create slots.")
        serializer.save(doctor=self.request.user)

    @action(detail=True, methods=['post'])
    def book(self, request, pk=None):
        if request.user.role != 'PATIENT':
            return Response({"detail": "Only patients can book slots."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            with transaction.atomic():
                # concurrency protection: select_for_update prevents race conditions
                slot = Slot.objects.select_for_update().get(pk=pk, is_booked=False)
                
                appointment = Appointment.objects.create(
                    patient=request.user,
                    doctor=slot.doctor,
                    slot=slot,
                    notes=request.data.get('notes', '')
                )
                
                slot.is_booked = True
                slot.save()
                
                serializer = AppointmentSerializer(appointment)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Slot.DoesNotExist:
            return Response({"detail": "Slot not found or already booked."}, status=status.HTTP_400_BAD_REQUEST)

class AppointmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return Appointment.objects.filter(patient=user)
        elif user.role == 'DOCTOR':
            return Appointment.objects.filter(doctor=user)
        return Appointment.objects.none()

    @action(detail=False, methods=['get'], url_path='my-patients')
    def my_patients(self, request):
        if request.user.role != 'DOCTOR':
            return Response({"detail": "Only doctors can view assigned patients."}, status=status.HTTP_403_FORBIDDEN)
        
        appointments = Appointment.objects.filter(doctor=request.user).select_related('patient', 'slot')
        patients_map = {}
        for appt in appointments:
            p = appt.patient
            if p.id not in patients_map:
                patients_map[p.id] = {
                    "id": p.id,
                    "username": p.username,
                    "name": p.get_full_name() or p.username,
                    "email": p.email,
                    "appointment_count": 0,
                    "latest_appointment": appt.slot.start_time
                }
            patients_map[p.id]["appointment_count"] += 1
            if appt.slot.start_time > patients_map[p.id]["latest_appointment"]:
                patients_map[p.id]["latest_appointment"] = appt.slot.start_time

        return Response(list(patients_map.values()))
