import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAXWpqBCRsYHtaIBHWM-PtITUGA_WUMlx8",
  authDomain: "butrift-cs411.firebaseapp.com",
  projectId: "butrift-cs411",
  storageBucket: "butrift-cs411.appspot.com",
  messagingSenderId: "631133629106",
  appId: "1:631133629106:web:0153c60388b87e271837ab"
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
