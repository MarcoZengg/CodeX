import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration from environment variables
// Create a .env file in the project root with these variables
// See README.md for detailed setup instructions

// Helper function to get required environment variable
function getEnvVar(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
      `Please create a .env file in the project root and add:\n` +
      `${name}=your_value_here\n` +
      `See README.md for detailed setup instructions.`
    );
  }
  return value;
}

const firebaseConfig = {
  apiKey: getEnvVar("VITE_FIREBASE_API_KEY"),
  authDomain: getEnvVar("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvVar("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnvVar("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnvVar("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnvVar("VITE_FIREBASE_APP_ID")
};

// Initialize Firebase (avoid re-initialization if already initialized - handles hot reload)
let app;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully");
  } else {
    app = getApp();
    console.log("✅ Firebase app already initialized, reusing existing app");
  }
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
  throw error;
}

// Initialize Firebase Auth
export const auth = getAuth(app);
