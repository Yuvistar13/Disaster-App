// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD831Mt72Lx-tuOrCHqnQcnewP_ENy6Nno",
  authDomain: "disaster-app-135b5.firebaseapp.com",
  projectId: "disaster-app-135b5",
  storageBucket: "disaster-app-135b5.firebasestorage.app",
  messagingSenderId: "262320013926",
  appId: "1:262320013926:web:c4b308e7b97889545f63a7",
  measurementId: "G-7B8NX4ZP22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Function to synchronize the Django user with Firebase
export const syncUserWithFirebase = async () => {
  try {
    // Get the user data from AsyncStorage
    const userDataString = await AsyncStorage.getItem('userData');
    const token = await AsyncStorage.getItem('accessToken');

    console.log('User data:', userDataString);
    
    if (!userDataString || !token) {
      console.log('No user data or token found');
      return null;
    }
    
    const userData = JSON.parse(userDataString);
    const userId = userData.id?.toString();
    
    if (!userId) {
      console.error('Invalid user ID in stored data');
      return null;
    }

    // First, check if the user exists in Firebase
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    
    if (userDoc.exists()) {
      console.log('User exists in Firebase:', userDoc.data());
    } else {
      console.log('User does NOT exist in Firebase');
    }
    
    // Update or create the user document
    await setDoc(userRef, {
      uid: userId,
      displayName: userData.name || userData.username,
      phoneNumber: userData.phone_number || '',
      username: userData.username,
      status: 'online',
      lastSeen: serverTimestamp(),
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || userData.username)}&background=random`, // Generate a placeholder avatar
    }, { merge: true }); // merge: true will update fields without overwriting the entire document
    
    return {
      uid: userId,
      displayName: userData.name || userData.username,
      phoneNumber: userData.phone_number || '',
      username: userData.username
    };
  } catch (error) {
    console.error('Error syncing user with Firebase:', error);
    return null;
  }
};

// Function to initialize the Firebase messaging system
export const initializeFirebaseMessaging = async () => {
  const currentUser = await syncUserWithFirebase();
  return currentUser;
};

export { db, auth };