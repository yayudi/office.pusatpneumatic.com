/* eslint-disable no-console */
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, '../');

let serviceAccountPath = path.resolve(backendRoot, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  const files = fs.readdirSync(backendRoot);
  const adminSdkFile = files.find(file => file.includes('firebase-adminsdk') && file.endsWith('.json'));
  if (adminSdkFile) {
    serviceAccountPath = path.resolve(backendRoot, adminSdkFile);
  }
}

let isFirebaseInitialized = false;
let db = null;

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: "https://wmhrisdps-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
    
    db = getDatabase();
    isFirebaseInitialized = true;
    console.log('[FIREBASE] Admin SDK initialized successfully.');
  } catch (error) {
    console.error('[FIREBASE] Error initializing Admin SDK:', error.message);
  }
} else {
  console.warn('[FIREBASE] Warning: serviceAccountKey.json not found in backend directory. Real-time signals will not be sent.');
}

export const isInitialized = isFirebaseInitialized;
export const firebaseDb = db;
