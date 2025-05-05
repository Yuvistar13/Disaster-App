from django.test import TestCase
from api.models import OTP

class OTPGenerationTest(TestCase):
    def test_otp_generation(self):
        """Test that the generated OTP is a numeric string of the correct length."""
        otp = OTP.generate_otp_code(phone_number="1234567890")
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

    def test_otp_uniqueness(self):
        """Test that consecutive OTPs are unique."""
        otp1 = OTP.generate_otp_code(phone_number="1234567890")
        otp2 = OTP.generate_otp_code(phone_number="0987654321")
        self.assertNotEqual(otp1, otp2)