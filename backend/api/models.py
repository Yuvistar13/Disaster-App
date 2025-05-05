import random
import string
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

class UserManager(BaseUserManager):
    
    def create_superuser(self, phone_number, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_verified', True)
        
        return self.create_user(phone_number, name, password, **extra_fields)
    
    def get_by_natural_key(self, phone_number):
        return self.get(phone_number=phone_number)

class User(AbstractBaseUser, PermissionsMixin):
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15, unique=True)
    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=100)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)  
    is_staff = models.BooleanField(default=False)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'phone_number'  
    REQUIRED_FIELDS = ['name']
    
    def __str__(self):
        return self.name
    
class Volunteer(models.Model):

    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15)
    location = models.CharField(max_length=100)
    availability = models.BooleanField(default=True)
    task = models.CharField(max_length=100, blank=True, null=True)
   
    # Remove the default lambda and make the field nullable
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    def save(self, *args, **kwargs):
        # If no user is provided, create one before saving
        if not self.user:
            # Create a unique username based on name and timestamp
            import time
            timestamp = int(time.time())
            username = f"{self.name.lower().replace(' ', '_')}_{timestamp}"
            
            # Create a default user with the volunteer's phone number
            self.user = User.objects.create(
                phone_number=self.phone_number,
                name=self.name,
                username=username,
                password=f"default_{timestamp}"  # Not secure, should be changed immediately
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
    
    
class OTP(models.Model):
    phone_number = models.CharField(max_length=15, unique=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expiry_time = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    
    def __str__(self):
        return f"OTP for {self.phone_number}"
    
    def is_valid(self):
        # Check if the OTP has expired
        return timezone.now() < self.expiry_time
    
    @classmethod
    def generate_otp_code(cls, phone_number, expiry_minutes=5):
        otp_code = ''.join(random.choices(string.digits, k=6))
        expiry_time = timezone.now() + timezone.timedelta(minutes=expiry_minutes)
        
        # Get or create OTP object
        otp, created = cls.objects.update_or_create(
            phone_number=phone_number,
            defaults={
                'otp_code': otp_code,
                'expiry_time': expiry_time,
                'attempts': 0,
            }
        )
        return otp_code
