from django.urls import path
from . import views

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('volunteers/', views.volunteer_handler, name='get_volunteers'),
    path('volunteers/create/', views.create_volunteer, name='create_volunteer'),
    path('volunteers/remove/<int:id>/', views.remove_volunteer, name='remove_volunteer'),

    path('check_user/', views.check_user, name='check_phone'),
    path('send_otp/', views.send_otp, name='send_otp'),
    path('verify_otp/', views.verify_otp, name='verify_otp'),

    path('create_user/', views.create_user, name='create_user'),
    path('login/', views.login_user, name='login_user'),
    path('logout/', views.logout_user, name='logout_user'),

    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]