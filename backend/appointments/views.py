from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from rest_framework.permissions import IsAuthenticated
from .models import Slot, Appointment, ConsultationMessage, ConsultationSignal
from .serializers import SlotSerializer, AppointmentSerializer, ConsultationMessageSerializer

class SlotViewSet(viewsets.ModelViewSet):
    queryset = Slot.objects.all()
    serializer_class = SlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'DOCTOR':
            return Slot.objects.filter(doctor=user)
        elif user.role == 'ADMIN' or user.is_staff:
            return Slot.objects.all()
        return Slot.objects.filter(is_booked=False)

    def perform_create(self, serializer):
        if self.request.user.role != 'DOCTOR' and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only doctors or admins can create slots.")
        serializer.save(doctor=self.request.user)

    @action(detail=True, methods=['post'])
    def book(self, request, pk=None):
        if request.user.role != 'PATIENT' and not request.user.is_staff:
            return Response({"detail": "Only patients can book slots."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            with transaction.atomic():
                # concurrency protection: select_for_update prevents race conditions
                slot = Slot.objects.select_for_update().get(pk=pk, is_booked=False)
                
                appointment = Appointment.objects.create(
                    patient=request.user,
                    doctor=slot.doctor,
                    slot=slot,
                    notes=request.data.get('notes', ''),
                    status=Appointment.Status.SCHEDULED
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
        if user.role == 'ADMIN' or user.is_staff or user.role == 'DOCTOR':
            return Appointment.objects.all()
        elif user.role == 'PATIENT':
            return Appointment.objects.filter(patient=user)
        return Appointment.objects.none()

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        appointment = self.get_object()
        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in Appointment.Status.choices]

        if new_status not in valid_statuses:
            return Response({"detail": f"Invalid status. Must be one of {valid_statuses}"}, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = new_status
        appointment.save()

        # If cancelled, release slot
        if new_status == Appointment.Status.CANCELLED and appointment.slot:
            appointment.slot.is_booked = False
            appointment.slot.save()

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        appointment = self.get_object()
        
        # Verify user is involved in appointment or is admin
        user = request.user
        is_participant = (user == appointment.patient or user == appointment.doctor or user.role == 'ADMIN' or user.is_staff)
        if not is_participant:
            return Response({"detail": "You do not have permission to view messages for this consultation."}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'POST':
            text = request.data.get('text', '').strip()
            if not text:
                return Response({"detail": "Message text cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

            msg = ConsultationMessage.objects.create(
                appointment=appointment,
                sender=user,
                text=text
            )
            serializer = ConsultationMessageSerializer(msg)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        messages = appointment.messages.all()
        serializer = ConsultationMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='simulate-reply')
    def simulate_reply(self, request, pk=None):
        return Response({"detail": "Automated simulated replies are disabled. Live peer messaging is active."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='signal')
    def send_signal(self, request, pk=None):
        appointment = self.get_object()
        user = request.user
        
        # Verify user is involved in appointment or is admin
        is_participant = (user == appointment.patient or user == appointment.doctor or user.role == 'ADMIN' or user.is_staff)
        if not is_participant:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        signal_type = request.data.get('type')
        payload = request.data.get('payload', {})
        if not signal_type:
            return Response({"detail": "Signal type is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Allow resetting signaling session on fresh reconnect
        if signal_type == 'reset':
            ConsultationSignal.objects.filter(appointment=appointment).delete()
            return Response({"status": "signals_cleared"}, status=status.HTTP_200_OK)

        sig = ConsultationSignal.objects.create(
            appointment=appointment,
            sender=user,
            signal_type=signal_type,
            payload=payload
        )
        return Response({
            "id": sig.id,
            "sender": sig.sender.id,
            "sender_username": sig.sender.username,
            "type": sig.signal_type,
            "payload": sig.payload,
            "created_at": sig.created_at.isoformat()
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='signals')
    def get_signals(self, request, pk=None):
        appointment = self.get_object()
        user = request.user

        is_participant = (user == appointment.patient or user == appointment.doctor or user.role == 'ADMIN' or user.is_staff)
        if not is_participant:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        since_id = request.query_params.get('since', 0)
        try:
            since_id = int(since_id)
        except (ValueError, TypeError):
            since_id = 0

        # Retrieve signals sent by the OTHER peer (exclude current user)
        signals = ConsultationSignal.objects.filter(
            appointment=appointment,
            id__gt=since_id
        ).exclude(sender=user).order_by('id')[:50]

        return Response([{
            "id": s.id,
            "sender": s.sender.id,
            "sender_username": s.sender.username,
            "type": s.signal_type,
            "payload": s.payload,
            "created_at": s.created_at.isoformat()
        } for s in signals])


    @action(detail=False, methods=['get'], url_path='my-patients')
    def my_patients(self, request):
        if request.user.role != 'DOCTOR' and not request.user.is_staff:
            return Response({"detail": "Only doctors or admins can view assigned patients."}, status=status.HTTP_403_FORBIDDEN)
        
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
