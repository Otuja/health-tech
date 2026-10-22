from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from appointments.models import Appointment, Slot
from records.models import MedicalRecord, EmergencyProfile, PatientDocument
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user

class IsAdminUserRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.is_staff))

class AdminStatsView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        total_patients = User.objects.filter(role='PATIENT').count()
        doctors_qs = User.objects.filter(role='DOCTOR')
        total_doctors = doctors_qs.count()
        active_doctors = doctors_qs.filter(is_active=True).count()
        total_appointments = Appointment.objects.count()
        total_slots = Slot.objects.count()
        booked_slots = Slot.objects.filter(is_booked=True).count()
        total_records = MedicalRecord.objects.count()
        total_documents = PatientDocument.objects.count()
        total_emergency_profiles = EmergencyProfile.objects.count()

        recent_appts = Appointment.objects.select_related('patient', 'doctor', 'slot').order_by('-created_at')[:6]
        recent_list = [
            {
                "id": a.id,
                "patient_name": f"{a.patient.first_name} {a.patient.last_name}".strip() or a.patient.username,
                "doctor_name": f"Dr. {a.doctor.last_name or a.doctor.username}",
                "doctor_specialization": a.doctor.specialization or "General Practice",
                "start_time": a.slot.start_time.isoformat() if a.slot else None,
                "notes": a.notes,
                "created_at": a.created_at.isoformat()
            }
            for a in recent_appts
        ]

        return Response({
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "active_doctors": active_doctors,
            "total_appointments": total_appointments,
            "total_slots": total_slots,
            "booked_slots": booked_slots,
            "total_records": total_records,
            "total_documents": total_documents,
            "total_emergency_profiles": total_emergency_profiles,
            "recent_appointments": recent_list
        })

class AdminDoctorsListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        doctors = User.objects.filter(role='DOCTOR').order_by('-date_joined')
        data = [
            {
                "id": d.id,
                "username": d.username,
                "name": f"{d.first_name} {d.last_name}".strip() or d.username,
                "email": d.email,
                "specialization": d.specialization or "General Practice",
                "is_active": d.is_active,
                "date_joined": d.date_joined.isoformat(),
                "slot_count": d.slots.count(),
                "appointment_count": d.appointments_as_doctor.count()
            }
            for d in doctors
        ]
        return Response(data)

class AdminDoctorToggleView(APIView):
    permission_classes = [IsAdminUserRole]

    def patch(self, request, pk):
        try:
            doctor = User.objects.get(pk=pk, role='DOCTOR')
            doctor.is_active = not doctor.is_active
            doctor.save()
            return Response({
                "id": doctor.id,
                "is_active": doctor.is_active,
                "message": f"Doctor {'verified and activated' if doctor.is_active else 'suspended'}"
            })
        except User.DoesNotExist:
            return Response({"error": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)

class AdminPatientsListView(APIView):
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        patients = User.objects.filter(role='PATIENT').order_by('-date_joined')
        data = []
        for p in patients:
            has_ep = hasattr(p, 'emergency_profile')
            bg = p.emergency_profile.blood_group if has_ep else None
            data.append({
                "id": p.id,
                "username": p.username,
                "name": f"{p.first_name} {p.last_name}".strip() or p.username,
                "email": p.email,
                "is_active": p.is_active,
                "blood_group": bg,
                "has_emergency_profile": has_ep,
                "date_joined": p.date_joined.isoformat(),
                "appointment_count": p.appointments_as_patient.count(),
                "document_count": p.ehr_documents.count(),
                "record_count": p.medical_records.count()
            })
        return Response(data)

class AdminDoctorCreateView(APIView):
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()
        email = request.data.get('email', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        specialization = request.data.get('specialization', '').strip() or 'General Practice'

        if not username or not password:
            return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "A user with this username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        doctor = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=User.Role.DOCTOR,
            specialization=specialization,
            is_active=True
        )
        return Response({
            "id": doctor.id,
            "username": doctor.username,
            "name": f"Dr. {doctor.last_name or doctor.username}",
            "specialization": doctor.specialization,
            "message": "Physician successfully onboarded and credentialed!"
        }, status=status.HTTP_201_CREATED)

