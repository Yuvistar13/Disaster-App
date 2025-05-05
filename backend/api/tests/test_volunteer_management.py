from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from api.models import Volunteer

User = get_user_model()

class VolunteerViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(name="testname", phone_number="99999999999", username="testuser", password="password")
        self.client.force_authenticate(user=self.user)
        self.volunteer_data = {
            "name": "Jane Doe",
            "phone_number": "9876543210",
            "location": "40.7128, 74.0060",
            "availability": True,
            "task": "Providing Medical Aid",
        }

    def test_create_volunteer(self):
        """Test creating a new volunteer."""
        response = self.client.post(reverse("create_volunteer"), self.volunteer_data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["message"], "Volunteer created successfully")

    def test_fetch_volunteers(self):
        """Test fetching the list of volunteers."""
        Volunteer.objects.create(user=self.user, **self.volunteer_data)
        response = self.client.get(reverse("get_volunteers"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["Volunteers"]), 1)