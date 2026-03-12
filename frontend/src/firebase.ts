// src/firebase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firebase configuration for Google Sign-In.
//
// HOW TO SET UP:
//  1. Go to https://console.firebase.google.com/
//  2. Create a project (or use an existing one)
//  3. Go to Project Settings → General → "Your apps" → Add Web App
//  4. Copy the firebaseConfig values into .env.local (see below)
//  5. In Firebase Console → Authentication → Sign-in method → Enable Google
//  6. In Google Cloud Console (https://console.cloud.google.com/)
//     → APIs & Services → Credentials → OAuth 2.0 Client IDs
//     → Add http://localhost:5173 (and your prod URL) to Authorized JS origins
//
// .env.local (create in frontend/ folder):
//   VITE_FIREBASE_API_KEY=your-api-key
//   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
//   VITE_FIREBASE_PROJECT_ID=your-project-id
//   VITE_FIREBASE_APP_ID=your-app-id
//   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
//
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
