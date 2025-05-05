from django.test import TestCase 
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

class LoginTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(username="testuser",name="testname", phone_number="99999999999", password="password")
        self.login_url = reverse("login_user") 

    def test_login_successful(self):
        """Test login with valid credentials."""
        response = self.client.post(self.login_url, {"username": "testuser", "password": "password"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)  

    def test_login_unsuccessful(self):
        """Test login with invalid credentials."""
        response = self.client.post(self.login_url, {"username": "testuser", "password": "wrongpassword"})
        self.assertEqual(response.status_code, 401)
        self.assertIn("error", response.data)