from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from appointments.models import Slot
from .views import detect_clinical_red_flags, get_triage_routing_metadata

User = get_user_model()

class AITriageUnitTests(APITestCase):
    def test_red_flag_severe_bleeding_with_typos(self):
        # Patient types "serve bleading" (both words misspelled)
        is_emergency, reason = detect_clinical_red_flags("i have serve bleading")
        self.assertTrue(is_emergency)
        self.assertIn("Severe Bleeding", reason)

    def test_red_flag_hemoptysis(self):
        is_emergency, reason = detect_clinical_red_flags("coughing blood and chest pain")
        self.assertTrue(is_emergency)

    def test_red_flag_respiratory_distress(self):
        is_emergency, reason = detect_clinical_red_flags("i cant breathe and feeling dizzy")
        self.assertTrue(is_emergency)
        self.assertIn("Respiratory", reason)

    def test_red_flag_cardiac_emergency(self):
        is_emergency, reason = detect_clinical_red_flags("crushing chest pain radiating to left arm")
        self.assertTrue(is_emergency)
        self.assertIn("Cardiovascular", reason)

    def test_routine_symptom_not_emergency(self):
        is_emergency, reason = detect_clinical_red_flags("mild itchy rash on my hand for two days")
        self.assertFalse(is_emergency)
        self.assertEqual(reason, "Routine / Scheduled")


class AITriageRoutingAndAPITests(APITestCase):
    def setUp(self):
        self.pulmo_doc = User.objects.create_user(
            username='dr_amina',
            password='pw',
            first_name='Amina',
            last_name='Bello',
            role='DOCTOR',
            specialization='Consultant Pulmonologist'
        )
        self.er_doc = User.objects.create_user(
            username='dr_babatunde',
            password='pw',
            first_name='Babatunde',
            last_name='Adeleke',
            role='DOCTOR',
            specialization='Emergency Medicine & Trauma'
        )
        self.cardio_doc = User.objects.create_user(
            username='dr_connor',
            password='pw',
            first_name='Sarah',
            last_name='Connor',
            role='DOCTOR',
            specialization='Consultant Cardiologist'
        )

        now = timezone.now()
        self.er_slot = Slot.objects.create(
            doctor=self.er_doc,
            start_time=now + timedelta(hours=2),
            end_time=now + timedelta(hours=3),
            is_booked=False
        )
        self.pulmo_slot = Slot.objects.create(
            doctor=self.pulmo_doc,
            start_time=now + timedelta(hours=4),
            end_time=now + timedelta(hours=5),
            is_booked=False
        )

        self.patient = User.objects.create_user(
            username='patient_alex',
            password='pw',
            role='PATIENT'
        )
        self.client = APIClient()
        self.url = reverse('symptom_analyze')

    def test_routing_bleeding_to_emergency_doctor(self):
        routing = get_triage_routing_metadata("i have serve bleading from deep cut")
        self.assertTrue(routing["is_emergency"])
        self.assertEqual(routing["specialty"], "Emergency Medicine & Trauma")
        self.assertEqual(routing["recommended_doctor"]["id"], self.er_doc.id)
        self.assertEqual(routing["recommended_doctor"]["available_slot_id"], self.er_slot.id)

    def test_routing_coughing_blood_to_pulmonologist(self):
        routing = get_triage_routing_metadata("coughing blood and thick phlegm")
        self.assertTrue(routing["is_emergency"])
        self.assertIn("Pulmonolog", routing["specialty"])
        self.assertEqual(routing["recommended_doctor"]["id"], self.pulmo_doc.id)
        self.assertEqual(routing["recommended_doctor"]["available_slot_id"], self.pulmo_slot.id)

    def test_api_unauthenticated_returns_401(self):
        response = self.client.post(self.url, {"symptoms": "headache"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_api_empty_symptoms_returns_400(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.post(self.url, {"symptoms": "  "}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_api_authenticated_patient_success(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.post(self.url, {"symptoms": "i have serve bleading"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("analysis", response.data)
        self.assertIn("routing", response.data)
        self.assertTrue(response.data["routing"]["is_emergency"])
        self.assertEqual(response.data["routing"]["recommended_doctor"]["name"], "Babatunde Adeleke")
