// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgcwrL1JLbNSjXUgNlqxJAXD8X5i0-e4U",
  authDomain: "obramap-5d7a9.firebaseapp.com",
  projectId: "obramap-5d7a9",
  storageBucket: "obramap-5d7a9.appspot.com",
  messagingSenderId: "920668288295",
  appId: "1:920668288295:web:515e86d3cd124877326502",
  measurementId: "G-5N15LWC3H6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// This flag is now always true, as the configuration is hardcoded.
export const isFirebaseConfigured = true;

// Export the Firebase services
export { auth, db, storage };
