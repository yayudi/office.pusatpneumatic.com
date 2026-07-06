import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCljY9m4FPQVjVfF4Y5lgIsXmWaeaWrViU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "wmhrisdps.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://wmhrisdps-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "wmhrisdps",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "wmhrisdps.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "33323909433",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:33323909433:web:dcc43fb11cd9e8386f28e8",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseDb = getDatabase(firebaseApp);
