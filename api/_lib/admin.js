/* Firebase Admin SDK — yalnızca sunucuda çalışır, güvenlik kurallarını aşar. Anahtar asla istemciye gitmez. */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { HttpError, UNAVAILABLE } from './http.js';

let db = null;

function credentials() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) { console.error('[config] FIREBASE_SERVICE_ACCOUNT tanımlı değil'); throw new HttpError(503, UNAVAILABLE); }
  let sa;
  try { sa = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')); } catch {
    console.error('[config] FIREBASE_SERVICE_ACCOUNT çözümlenemedi'); throw new HttpError(503, UNAVAILABLE);
  }
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

const adminApp = () => getApps()[0] || initializeApp({ credential: cert(credentials()) });

export function adminDb() {
  if (db) return db;
  db = getFirestore(adminApp());
  return db;
}

export const adminAuth = () => getAuth(adminApp());

export { FieldValue };

export const DEFAULT_SETTINGS = Object.freeze({ maintenance: { enabled: false, message: '' }, showExplanations: true });

export async function readSettings(d) {
  const s = await d.collection('settings').doc('site').get();
  return { ...DEFAULT_SETTINGS, ...(s.exists ? s.data() : {}) };
}
