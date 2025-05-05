from django.test import TestCase
from datetime import timedelta
from django.utils.timezone import now
from api.models import OTP
from django.urls import reverse
from rest_framework.test import APIClient

class OTPValidationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.otp_url = reverse("verify_otp")

        self.otp = OTP.objects.create(
            phone_number="1234567890",
            otp_code="123456",
            created_at=now(),
            expiry_time=now() + timedelta(minutes=5),
        )

        self.otp.save()

    def test_valid_otp(self):
        """Test that a valid OTP is accepted."""
        response = self.client.post(self.otp_url, {"phone_number": "1234567890", "otp_code": "123456"})
        self.assertEqual(response.status_code, 200)

    def test_invalid_otp(self):
        """Test that an invalid OTP is rejected."""
        response = self.client.post(self.otp_url, {"phone_number": "1111111111", "otp_code": "000000"})
        self.assertEqual(response.status_code, 404)

    def test_expired_otp(self):
        """Test that an expired OTP is rejected."""
        self.expiry_time = now() - timedelta(minutes=5) 
        self.otp.save()
        self.assertTrue(self.otp.is_valid())

    def test_reused_otp(self):
        """Test that a used OTP is rejected."""
        self.otp.attempts = 4
        self.otp.save()
        response = self.client.post(self.otp_url, {"phone_number": "1234567890", "otp_code": "123456"})
        self.assertEqual(response.status_code, 400)