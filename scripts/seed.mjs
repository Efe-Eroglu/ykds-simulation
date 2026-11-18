#!/usr/bin/env node
/**
 * seed/ klasöründeki deneme JSON'larını Firestore'a yükler.
 *   npm run seed              → yayında olarak yükler
 *   npm run seed -- --draft   → taslak olarak yükler
 * Aynı isimde deneme varsa atlanır. Sorular ve cevap anahtarı ayrı koleksiyonlara yazılır.
 * Gereken: .env içinde FIREBASE_SERVICE_ACCOUNT.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { validateTest } from '../src/core/validate.js';
import { splitTest } from '../src/core/split.js';
import { TOTAL_Q } from '../src/core/exam-config.js';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const raw = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
if (!raw) { console.error('.env içinde FIREBASE_SERVICE_ACCOUNT tanımlı değil.'); process.exit(1); }
const sa = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const published = !process.argv.includes('--draft');

const existing = new Set((await db.collection('tests').get()).docs.map(d => d.data().name.toLocaleLowerCase('tr')));
const files = readdirSync('seed').filter(f => f.endsWith('.json')).sort();
let added = 0;

for (const f of files) {
  const obj = JSON.parse(readFileSync(`seed/${f}`, 'utf8'));
  const name = (obj.name || f.replace(/\.json$/, '')).trim();
  if (existing.has(name.toLocaleLowerCase('tr'))) { console.log(`• ${name}: zaten var, atlandı`); continue; }
  const r = validateTest(obj);
  if (r.errors.length) { console.error(`✗ ${f}: ${r.errors[0]}`); continue; }
  const { content, key } = splitTest(r.clean);
  const ref = db.collection('tests').doc();
  const batch = db.batch();
  batch.set(ref, { name, author: (obj.author || '').trim(), published, questionCount: TOTAL_Q, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  batch.set(db.collection('testContents').doc(ref.id), content);
  batch.set(db.collection('testKeys').doc(ref.id), key);
  await batch.commit();
  added++;
  console.log(`✓ ${name}: ${TOTAL_Q} soru yüklendi (${published ? 'yayında' : 'taslak'})`);
}
console.log(`\nToplam ${added} deneme eklendi.`);
process.exit(0);
