import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore/lite';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let app = null, db = null;

export function getFirebaseApp() {
  if (!firebaseConfigured) throw new Error('Firebase yapılandırılmamış. .env dosyasını doldurun (bkz. .env.example).');
  if (!app) app = initializeApp(config);
  return app;
}

export function getDb() {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}
