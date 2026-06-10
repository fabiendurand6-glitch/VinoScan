import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = { 
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "", 
  authDomain: "vinoscan-prestige.firebaseapp.com", 
  projectId: "vinoscan-prestige",
  storageBucket: "vinoscan-prestige.firebasestorage.app", 
  messagingSenderId: "830980961095", 
  appId: "1:830980961095:web:6b396e8f1f23e834611262",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const appId = 'vinoscan-prestige';