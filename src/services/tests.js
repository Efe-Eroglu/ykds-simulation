/**
 * Firestore veri modeli
 *   tests/{id}         { name, author, published, questionCount, createdAt, updatedAt }  herkese açık (yayındaysa)
 *   testContents/{id}  { modules:[{id, questions:[{question, options}]}] }               herkese açık (yayındaysa) — CEVAP YOK
 *   testKeys/{id}      { answers:"ABCD…", explanations:[…] }                              yalnızca admin + sunucu
 *   testStats/{id}     { attempts, scoreSum, lastAt, fields:{}, right:{i:n} }             yalnızca admin okur, sunucu yazar
 *   settings/site      { announcement, maintenance, copyProtection, showExplanations }    herkes okur, admin yazar
 *   admins/{uid}       { email }                                                          konsoldan elle eklenir
 */
import {
  collection, doc, getDoc, getDocs, query, where, writeBatch, updateDoc, setDoc, serverTimestamp,
} from 'firebase/firestore/lite';
import { getDb } from '../lib/firebase.js';
import { TOTAL_Q } from '../core/exam-config.js';
import { splitTest, mergeTest } from '../core/split.js';

const C = { tests: 'tests', contents: 'testContents', keys: 'testKeys', stats: 'testStats', settings: 'settings' };

export const DEFAULT_SETTINGS = {
  announcement: { enabled: false, text: '' },
  maintenance: { enabled: false, message: '' },
  copyProtection: true,
  showExplanations: true,
};

const toMs = v => (v && typeof v.toMillis === 'function' ? v.toMillis() : Number(v) || Date.now());

function mapMeta(snap) {
  const x = snap.data();
  return {
    id: snap.id, name: x.name, author: x.author || '', published: !!x.published,
    questionCount: x.questionCount || TOTAL_Q, createdAt: toMs(x.createdAt), updatedAt: toMs(x.updatedAt),
  };
}
const byNewest = (a, b) => b.createdAt - a.createdAt;

/* ---------- Herkese açık ---------- */
export async function listPublishedTests() {
  const snap = await getDocs(query(collection(getDb(), C.tests), where('published', '==', true)));
  return snap.docs.map(mapMeta).sort(byNewest);
}

/** Cevapsız sınav içeriği. */
export async function getTestContent(id) {
  const snap = await getDoc(doc(getDb(), C.contents, id));
  if (!snap.exists()) throw Object.assign(new Error('Deneme içeriği bulunamadı.'), { code: 'not-found' });
  return { modules: snap.data().modules };
}

export async function getSettings() {
  try {
    const snap = await getDoc(doc(getDb(), C.settings, 'site'));
    const s = snap.exists() ? snap.data() : {};
    return {
      ...DEFAULT_SETTINGS, ...s,
      announcement: { ...DEFAULT_SETTINGS.announcement, ...(s.announcement || {}) },
      maintenance: { ...DEFAULT_SETTINGS.maintenance, ...(s.maintenance || {}) },
    };
  } catch { return structuredClone(DEFAULT_SETTINGS); }
}

/* ---------- Admin ---------- */
export async function isAdmin(uid) {
  try { return (await getDoc(doc(getDb(), 'admins', uid))).exists(); } catch { return false; }
}

export async function listAllTests() {
  const snap = await getDocs(collection(getDb(), C.tests));
  return snap.docs.map(mapMeta).sort(byNewest);
}

/** Admin: soru + cevap + çözüm birleşik. */
export async function getFullTest(id) {
  const db = getDb();
  const [c, k] = await Promise.all([getDoc(doc(db, C.contents, id)), getDoc(doc(db, C.keys, id))]);
  if (!c.exists() || !k.exists()) throw Object.assign(new Error('Deneme verisi eksik.'), { code: 'not-found' });
  return mergeTest(c.data(), k.data());
}

/** Admin: tüm deneme istatistikleri → { [testId]: {attempts, avg, lastAt, fields, right} } */
export async function listStats() {
  const snap = await getDocs(collection(getDb(), C.stats));
  const out = {};
  snap.docs.forEach(d => {
    const x = d.data();
    const attempts = x.attempts || 0;
    out[d.id] = { attempts, avg: attempts ? (x.scoreSum || 0) / attempts : 0, lastAt: x.lastAt ? toMs(x.lastAt) : null, fields: x.fields || {}, right: x.right || {} };
  });
  return out;
}

export async function createTest({ name, author, published, full }) {
  const db = getDb();
  const ref = doc(collection(db, C.tests));
  const { content, key } = splitTest(full);
  const b = writeBatch(db);
  b.set(ref, { name, author, published, questionCount: TOTAL_Q, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  b.set(doc(db, C.contents, ref.id), content);
  b.set(doc(db, C.keys, ref.id), key);
  await b.commit();
  return ref.id;
}

/** meta: {name, author, published}; full verilirse sorular ve cevaplar da değiştirilir. */
export async function updateTest(id, meta, full = null) {
  const db = getDb();
  const b = writeBatch(db);
  b.update(doc(db, C.tests, id), { ...meta, updatedAt: serverTimestamp() });
  if (full) {
    const { content, key } = splitTest(full);
    b.set(doc(db, C.contents, id), content);
    b.set(doc(db, C.keys, id), key);
  }
  await b.commit();
}

export async function setPublished(id, published) {
  await updateDoc(doc(getDb(), C.tests, id), { published, updatedAt: serverTimestamp() });
}

export async function deleteTest(id) {
  const db = getDb();
  const b = writeBatch(db);
  [C.contents, C.keys, C.tests].forEach(c => b.delete(doc(db, c, id)));
  await b.commit();
}

export async function saveSettings(s) {
  await setDoc(doc(getDb(), C.settings, 'site'), {
    announcement: { enabled: !!s.announcement.enabled, text: String(s.announcement.text || '').slice(0, 300) },
    maintenance: { enabled: !!s.maintenance.enabled, message: String(s.maintenance.message || '').slice(0, 300) },
    copyProtection: !!s.copyProtection,
    showExplanations: !!s.showExplanations,
    updatedAt: serverTimestamp(),
  });
}

/** Firebase / API hata kodlarını Türkçe mesaja çevirir. */
export function errorMessage(e) {
  const code = e && e.code;
  const map = {
    'permission-denied': 'Bu işlem için yetkin yok.',
    unavailable: 'Sunucuya ulaşılamıyor. İnternet bağlantını kontrol et.',
    'not-found': 'Kayıt bulunamadı.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/wrong-password': 'Mevcut şifre hatalı.',
    'auth/invalid-email': 'Geçersiz e-posta adresi.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.',
    'auth/network-request-failed': 'Ağ hatası. İnternet bağlantını kontrol et.',
    'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
    'auth/weak-password': 'Şifre çok zayıf (en az 8 karakter önerilir).',
    'auth/requires-recent-login': 'Güvenlik için tekrar giriş yapman gerekiyor.',
  };
  return map[code] || (e && e.message) || 'Bilinmeyen hata';
}
