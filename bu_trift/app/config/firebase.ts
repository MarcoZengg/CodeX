import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAXWpqBCRsYHtaIBHWM-PtITUGA_WUMlx8",
  authDomain: "butrift-cs411.firebaseapp.com",
  projectId: "butrift-cs411",
  storageBucket: "butrift-cs411.appspot.com",
  messagingSenderId: "631133629106",
  appId: "1:631133629106:web:0153c60388b87e271837ab"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
