# Disaster App

## 1. Install Dependencies

### Frontend
Navigate to the `frontend` directory and install dependencies using npm:
```bash
cd frontend
npm install
```

### Backend
The backend dependencies are already installed. No need to run:
```bash
pip install -r requirements.txt
```

---

## 2. Running the Codebase

### Backend
Navigate to the `backend` directory and run the following commands:
```bash
cd backend
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend
Navigate to the `frontend` directory and start the application:
```bash
cd frontend
npm start
```

Once the Expo application has started, scan the QR code with the **Expo Go** app.

> **Note:** Ensure that **Expo Go** with **SDK 52** is installed. The codebase is incompatible with SDK 53 (released on 30/04/25), so you need to downgrade to the older APK.

---

## 3. Extra Information

### Superuser Credentials
A superuser has already been created with the following credentials:
- **Phone Number:** `99999999999`
- **Password:** `admin`

**Important:**
- You must log in to the Django admin panel before launching the application on Expo Go.

### API Configuration
In the file `frontend/pages/API_URL.js`, update the IP address in the URL to match the device's IP address. This IP address can be found before the application is loaded in Expo Go.#

**Note:** The Twilio OTP notification system has not been implemented. To complete the registration process, you will need to check the OTP codes for the entered phone numbers directly in the Django admin panel and submit them manually.
---

## 4. Additional Suggestions (Optional)

- **Testing:** All tests are located in the api/tests folder in the backend, and follow these commands.
```bash
cd backend
python manage.py test
```



