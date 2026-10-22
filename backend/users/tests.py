from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class AuthTests(APITestCase):
    def test_user_registration(self):
        url = reverse('register')
        data = {
            'username': 'testuser',
            'password': 'testpassword123',
            'email': 'testuser@example.com',
            'role': 'PATIENT'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().username, 'testuser')
        self.assertEqual(User.objects.get().role, 'PATIENT')

    def test_user_login(self):
        User.objects.create_user(username='testuser2', password='testpassword123', role='DOCTOR')
        url = reverse('token_obtain_pair')
        data = {
            'username': 'testuser2',
            'password': 'testpassword123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)


class AdminGovernanceTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin_boss', password='pw', role='ADMIN', is_staff=True)
        self.doctor = User.objects.create_user(username='dr_smith', password='pw', role='DOCTOR', specialization='Pediatrics')
        self.patient = User.objects.create_user(username='patient_john', password='pw', role='PATIENT')

        self.client = APIClient()

    def test_admin_stats_access_permitted_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_doctors', response.data)
        self.assertIn('total_patients', response.data)
        self.assertIn('total_appointments', response.data)

    def test_admin_stats_forbidden_for_patient(self):
        self.client.force_authenticate(user=self.patient)
        url = reverse('admin-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_stats_forbidden_for_doctor(self):
        self.client.force_authenticate(user=self.doctor)
        url = reverse('admin-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_doctor(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-doctor-create')
        data = {
            'username': 'dr_new',
            'password': 'strongpassword123',
            'email': 'dr_new@hospital.ng',
            'first_name': 'New',
            'last_name': 'Physician',
            'specialization': 'Neurology'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_doc = User.objects.get(username='dr_new')
        self.assertEqual(new_doc.role, 'DOCTOR')
        self.assertEqual(new_doc.specialization, 'Neurology')

    def test_admin_toggle_doctor_status(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('admin-doctor-toggle', kwargs={'pk': self.doctor.pk})
        
        # Initial is_active is True
        self.assertTrue(self.doctor.is_active)
        
        # Toggle to inactive
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.doctor.refresh_from_db()
        self.assertFalse(self.doctor.is_active)

        # Toggle back to active
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.doctor.refresh_from_db()
        self.assertTrue(self.doctor.is_active)
