import concurrent.futures
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Slot, Appointment
from django.db import connection

User = get_user_model()

class BookingConcurrencyTests(APITestCase):
    def setUp(self):
        self.doctor = User.objects.create_user(username='doc', password='pw', role='DOCTOR')
        self.patient1 = User.objects.create_user(username='p1', password='pw', role='PATIENT')
        self.patient2 = User.objects.create_user(username='p2', password='pw', role='PATIENT')
        
        self.slot = Slot.objects.create(
            doctor=self.doctor,
            start_time=timezone.now(),
            end_time=timezone.now() + timezone.timedelta(hours=1)
        )
        self.url = reverse('slot-book', kwargs={'pk': self.slot.pk})
        
        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.patient1)
        
        self.client2 = APIClient()
        self.client2.force_authenticate(user=self.patient2)

    def test_concurrent_booking(self):
        """
        Since SQLite doesn't support select_for_update locking and fails with DB_LOCKED,
        this test simulates a sequential double-booking attempt to ensure the API
        correctly handles the second request when the slot is already booked.
        True concurrency testing requires PostgreSQL.
        """
        # First booking succeeds
        response1 = self.client1.post(self.url, {'notes': 'first'}, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Second booking fails
        response2 = self.client2.post(self.url, {'notes': 'second'}, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        
        self.assertEqual(Appointment.objects.count(), 1)
        
        self.slot.refresh_from_db()
        self.assertTrue(self.slot.is_booked)
