import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import API_URL from './API_URL';

const OTPVerificationScreen = ({ phoneNumber, onVerificationComplete, onCancel }) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const sendOTP = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/send_otp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (response.ok) {
        setOtpSent(true);
        Alert.alert('Success', 'OTP sent successfully. Please check your phone.');
      } else {
        Alert.alert('Error', data.error || 'Failed to send OTP');
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Network error. Please try again.');
      console.error('Error sending OTP:', error);
    }
  };

  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/verify_otp/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          otp_code: otp,
        }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (response.ok) {
        Alert.alert('Success', 'Phone verified successfully!');
        onVerificationComplete();
      } else {
        Alert.alert('Error', data.error || 'Invalid OTP');
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Network error. Please try again.');
      console.error('Error verifying OTP:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone Verification</Text>
      <Text style={styles.subtitle}>
        {otpSent
          ? `We've sent a verification code to ${phoneNumber}`
          : `Verify your phone number ${phoneNumber}`}
      </Text>

      {otpSent ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            keyboardType="numeric"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setOtpSent(false)}
              disabled={isLoading}
            >
              <Text style={styles.buttonSecondaryText}>Resend OTP</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonPrimary]}
              onPress={verifyOTP}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.buttonSecondary]}
            onPress={onCancel}
            disabled={isLoading}
          >
            <Text style={styles.buttonSecondaryText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={sendOTP}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Sending...' : 'Send OTP'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 20,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 20,
    padding: 15,
    elevation: 2,
    minWidth: '45%',
  },
  buttonPrimary: {
    backgroundColor: 'tomato',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'tomato',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  buttonSecondaryText: {
    color: 'tomato',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default OTPVerificationScreen;