from django.contrib import admin

# Register your models here.

from .models import Volunteer, OTP, User

admin.site.register(User)
admin.site.register(Volunteer)
admin.site.register(OTP)

