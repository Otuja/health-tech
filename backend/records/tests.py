from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from appointments.models import Slot, Appointment
from .models import MedicalRecord

User = get_user_model()

class MedicalRecordPermissionTests(APITestCase):
    def setUp(self):
        self.doc1 = User.objects.create_user(username='doc1', password='pw', role='DOCTOR')
        self.doc2 = User.objects.create_user(username='doc2', password='pw', role='DOCTOR')
        self.patient1 = User.objects.create_user(username='p1', password='pw', role='PATIENT')
        self.patient2 = User.objects.create_user(username='p2', password='pw', role='PATIENT')

        # Doc 1 has appointment with Patient 1
        slot = Slot.objects.create(doctor=self.doc1, start_time=timezone.now(), end_time=timezone.now() + timezone.timedelta(hours=1), is_booked=True)
        Appointment.objects.create(patient=self.patient1, doctor=self.doc1, slot=slot)

        # Create records
        self.record1 = MedicalRecord.objects.create(
            patient=self.patient1, doctor=self.doc1, diagnosis='Flu', symptoms='fever', treatment_plan='rest'
        )
        self.record2 = MedicalRecord.objects.create(
            patient=self.patient2, doctor=self.doc2, diagnosis='Cold', symptoms='cough', treatment_plan='rest'
        )

        self.url = reverse('medical-record-list')

    def test_patient_can_only_see_own_records(self):
        client = APIClient()
        client.force_authenticate(user=self.patient1)
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['diagnosis'], 'Flu')

    def test_doctor_can_only_see_assigned_patient_records(self):
        client = APIClient()
        client.force_authenticate(user=self.doc1)
        response = client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Doc1 should only see record1 (assigned patient p1)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['diagnosis'], 'Flu')

    def test_doctor_cannot_create_record_for_unassigned_patient(self):
        client = APIClient()
        client.force_authenticate(user=self.doc1)
        # Doc 1 tries to create record for Patient 2 (no appointment)
        data = {
            'patient_id': self.patient2.id,
            'diagnosis': 'Fake',
            'symptoms': 'None',
            'treatment_plan': 'None'
        }
        response = client.post(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('patient_id', response.data)
