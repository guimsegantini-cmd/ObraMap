// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// The environment variables are expected to be available in the execution context,
// provided by the platform under `process.env`.
const env = process.env;

// Your web app's Firebase configuration is now read from Environment Variables.
const firebaseConfig = {
  apiKey: env.API_KEY,
  authDomain: env.AUTH_DOMAIN,
  projectId: env.PROJECT_ID,
  storageBucket: env.STORAGE_BUCKET,
  messagingSenderId: env.MESSAGING_SENDER_ID,
  appId: env.APP_ID
};

let app = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// Initialize Firebase only if the essential configuration is present.
if (firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch(e) {
    console.error("Error initializing Firebase:", e);
    // Services will remain null if initialization fails.
  }
} else {
    console.error("Firebase API Key is missing. Check your environment variables (e.g., API_KEY).");
}

// Export Firebase services
export { auth, db, storage };
