
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// TODO: Replace with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// A simple check to see if the config has been filled out
// In a real app, you would use environment variables.
export const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

// FIX: Use compat library to initialize Firebase. This ensures the app works even
// if an older version of the Firebase SDK is installed, which would cause the
// "initializeApp is not an exported member" error with v9 modular imports.
const app = isFirebaseConfigured ? firebase.initializeApp(firebaseConfig) : null;

export const auth = app ? firebase.auth() : null;
export const db = app ? firebase.firestore() : null;
export const storage = app ? firebase.storage() : null;

if (!isFirebaseConfigured) {
    console.warn("Firebase is not configured. The app will run in demonstration mode. Please provide your Firebase config in firebase.ts");
}
