/* Firebase Admin SDK — yalnızca sunucuda çalışır, güvenlik kurallarını aşar. Anahtar asla istemciye gitmez. */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpError } from './http.js';

let db = null;

function credentials() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (!raw) throw new HttpError(503, 'Sunucu yapılandırması eksik (FIREBASE_SERVICE_ACCOUNT).');
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(json);
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

export function adminDb() {
  if (db) return db;
  const app = getApps()[0] || initializeApp({ credential: cert(credentials()) });
  db = getFirestore(app);
  return db;
}

export { FieldValue };

export const DEFAULT_SETTINGS = Object.freeze({ maintenance: { enabled: false, message: '' }, showExplanations: true });

export async function readSettings(d) {
  const s = await d.collection('settings').doc('site').get();
  return { ...DEFAULT_SETTINGS, ...(s.exists ? s.data() : {}) };
}
