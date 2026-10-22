from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from rest_framework.permissions import IsAuthenticated
from .models import Slot, Appointment, ConsultationMessage
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
        if user.role == 'ADMIN' or user.is_staff:
            return Appointment.objects.all()
        elif user.role == 'PATIENT':
            return Appointment.objects.filter(patient=user)
        elif user.role == 'DOCTOR':
            return Appointment.objects.filter(doctor=user)
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
        appointment = self.get_object()
        user = request.user
        
        # Verify user is involved in appointment or is admin
        is_participant = (user == appointment.patient or user == appointment.doctor or user.role == 'ADMIN' or user.is_staff)
        if not is_participant:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        
        # Determine who replies
        if user == appointment.patient or user.role == 'PATIENT':
            partner = appointment.doctor
            is_doctor_reply = True
        else:
            partner = appointment.patient
            is_doctor_reply = False
            
        last_msg = appointment.messages.filter(sender=user).last()
        last_text = last_msg.text.lower() if last_msg else ""
        
        doctor_name = partner.get_full_name() or partner.username
        
        if is_doctor_reply:
            if any(k in last_text for k in ['pain', 'hurt', 'chest', 'pressure', 'heart', 'breath', 'dizzy']):
                reply_text = f"Thank you for sharing that with me. On a scale of 1 to 10, how intense is the discomfort? Please remain seated, breathe slowly, and let me know if it radiates to your left arm or jaw."
            elif any(k in last_text for k in ['bp', 'blood pressure', 'pulse', 'vital', 'bpm', 'reading']):
                reply_text = f"I've recorded those vitals into your encounter chart. They look consistent with your baseline. Let's monitor your blood pressure closely during this session."
            elif any(k in last_text for k in ['medication', 'pill', 'dose', 'drug', 'prescription', 'refill']):
                reply_text = f"I have your active medication list open in your EHR. I can adjust your dosage or transmit a digital prescription directly to your pharmacy today."
            elif any(k in last_text for k in ['headache', 'fever', 'cough', 'cold', 'temperature', 'throat']):
                reply_text = f"Noted. How long have you experienced these symptoms? Make sure to stay hydrated, and I will note this in your clinical assessment."
            elif any(k in last_text for k in ['hello', 'hi', 'morning', 'afternoon', 'hey', 'doctor']):
                reply_text = f"Hello! I am {doctor_name}. I have your patient file open. How are you feeling today, and what symptoms would you like us to address?"
            elif any(k in last_text for k in ['bye', 'thank', 'thanks', 'done', 'okay', 'ok', 'good']):
                reply_text = f"You are very welcome! Take care and don't hesitate to reach back out if symptoms worsen. You can conclude our video call whenever you are ready."
            else:
                reply_text = f"I have noted your observation in your clinical chart. Can you tell me if this symptom is intermittent or constant throughout the day?"
        else:
            if any(k in last_text for k in ['hello', 'hi', 'how are you']):
                reply_text = "Hello Doctor, thank you for checking in on me today. I am ready for our consultation."
            elif any(k in last_text for k in ['pain', 'scale', 'feel', 'intense']):
                reply_text = "The pain is about a 4 out of 10 today, mostly when I am active or moving."
            elif any(k in last_text for k in ['medication', 'dose', 'pill']):
                reply_text = "Yes Doctor, I've taken the morning dose with breakfast as instructed."
            else:
                reply_text = "Thank you Doctor, I understand and will follow these instructions."

        reply_msg = ConsultationMessage.objects.create(
            appointment=appointment,
            sender=partner,
            text=reply_text
        )
        serializer = ConsultationMessageSerializer(reply_msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
