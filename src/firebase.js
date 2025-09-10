// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyCWIwBb3s7C7ZHaGItks1XgVWT8r9vtJ9s",
  authDomain: "payroll-system-aabb4.firebaseapp.com",
  projectId: "payroll-system-aabb4",
  storageBucket: "payroll-system-aabb4.firebasestorage.app",  // ✅ correct bucket name
  messagingSenderId: "489042394477",
  appId: "1:489042394477:web:f5874809bf49b3f8bb6e64",
};

// ✅ Initialize main app
export const app = initializeApp(firebaseConfig);

// ✅ Export main instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ Secondary app (for creating users without logging out admin)
export const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);