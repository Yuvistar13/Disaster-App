import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import logout

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken, TokenError



from .models import Volunteer, OTP, User
from django.utils import timezone
from django.conf import settings


@csrf_exempt
@api_view(['GET'])
def volunteer_handler(request, id=None):
    volunteers = Volunteer.objects.values()
    return Response({'Volunteers': list(volunteers)})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_volunteer(request):
    user = request.user
    data = request.data

    location = data.get('location')
    availability = data.get('availability', False)
    task = data.get('task', None)

    if Volunteer.objects.filter(user=user).exists():
        return Response({'error': 'You are already registered as a volunteer.'}, status=status.HTTP_400_BAD_REQUEST)

    volunteer = Volunteer.objects.create(
        user=user,
        name=user.name,
        phone_number=user.phone_number,
        location=location,
        availability=availability,
        task=task,
    )

    return Response({'message': 'Volunteer created successfully'}, status=status.HTTP_201_CREATED)

@csrf_exempt
@api_view(['DELETE'])
def remove_volunteer(request, id):
    try:
        volunteer = Volunteer.objects.get(id=id)
        volunteer.delete()
        return JsonResponse({'message': 'Volunteer removed successfully'}, status=200)
    except Volunteer.DoesNotExist:
        return JsonResponse({'error': 'Volunteer not found'}, status=404)

@csrf_exempt
@api_view(['POST'])
def create_user(request):

    name = request.data.get('name')
    username = request.data.get('username')
    password = request.data.get('password')
    phone_number = request.data.get('phone_number')
   
    existing_user = User.objects.filter(phone_number=phone_number).first()
    
    if existing_user:
        if existing_user.is_verified:
            return Response(
                {"message": "User already registered. Please try again or login."},
                status=status.HTTP_200_OK
            )
        else:
            return Response({'error': 'User not verified'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        user = User.objects.create(
            name=name,
            username=username,
            password=password,
            phone_number=phone_number,
            is_verified=True
        )

        return Response({
            "id": user.id, 
            "name": user.name, 
            "phone_number": user.phone_number, 
            "username": user.username, 
            "password": user.password,
            "is_verified": user.is_verified, 
        })

@csrf_exempt
@api_view(['POST'])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:

        user = User.objects.get(username=username, password=password)

        refresh = RefreshToken.for_user(user)

        return Response({
            "id": user.id, 
            "name": user.name, 
            "phone_number": user.phone_number, 
            "username": user.username, 
            "is_verified": user.is_verified,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        })
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@csrf_exempt
@api_view(['POST'])
def check_user(request):
    phone_number = request.data.get('phone_number')

    if not phone_number:
        return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    exists = Volunteer.objects.filter(phone_number=phone_number).exists()
    return Response({'exists': exists}, status=status.HTTP_200_OK)

@csrf_exempt
@api_view(['POST'])
def send_otp(request):
    phone_number = request.data.get('phone_number')

    if not phone_number:
        return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Generate new OTP
    otp_code = OTP.generate_otp_code(phone_number)

    message = f"Your OTP is {otp_code}. It is valid for 5 minutes."
    sent = send_sms(phone_number, message)

    if sent:
        return Response({'message': 'OTP sent successfully'}, status=status.HTTP_200_OK)
    else:   
        return Response({'error': 'Failed to send OTP'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
def verify_otp(request):
    phone_number = request.data.get('phone_number')
    otp_code = request.data.get('otp_code')

    if not phone_number or not otp_code:
        return Response({'error': 'Phone number and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        otp = OTP.objects.get(phone_number=phone_number)

        # Check if OTP has expired
        if not otp.is_valid():
            return Response({'error': 'OTP has expired'}, status=status.HTTP_400_BAD_REQUEST)

        otp.attempts += 1
        otp.save()

        if otp.attempts > 3:
            return Response({'error': 'Maximum OTP attempts exceeded'}, status=status.HTTP_400_BAD_REQUEST)
        
        if otp.otp_code == otp_code:
            # Mark phone as verified and return success
            User.objects.filter(phone_number=phone_number).update(is_verified=True)
            return Response({'message': 'OTP verified successfully'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
        
    except OTP.DoesNotExist:
        return Response({'error': 'OTP not found'}, status=status.HTTP_404_NOT_FOUND)
    
def send_sms(phone_number, message):

    print(f"SMS to {phone_number}: {message}")
    return True


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):

    try:
        refresh_token = request.data.get('refresh_token')
        
        if not refresh_token:
            return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        token = RefreshToken(refresh_token)

        token.blacklist()

        logout(request)
        
        return Response({'message': 'User logged out successfully'}, status=status.HTTP_200_OK)
    except TokenError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f'Unexpected error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)