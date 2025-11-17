
// It's good practice to import services you use.
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Production Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgcwrL1JLbNSjXUgNlqxJAXD8X5i0-e4U",
  authDomain: "obramap-5d7a9.firebaseapp.com",
  projectId: "obramap-5d7a9",
  storageBucket: "obramap-5d7a9.firebasestorage.app",
  messagingSenderId: "920668288295",
  appId: "1:920668288295:web:515e86d3cd124877326502",
  measurementId: "G-5N15LWC3H6"
};

// The app is now configured for production, so this is always true.
export const isFirebaseConfigured = true;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
