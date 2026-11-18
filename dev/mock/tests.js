/* Mock: src/services/tests.js ile aynı arayüz. */
import { splitTest } from '../../src/core/split.js';
import { load, save, wait } from './db.js';

export const DEFAULT_SETTINGS = {
  announcement: { enabled: false, text: '' },
  maintenance: { enabled: false, message: '' },
  copyProtection: true,
  showExplanations: true,
};

const find = (db, id) => db.tests.find(t => t.meta.id === id);
const byNewest = (a, b) => b.createdAt - a.createdAt;

export async function listPublishedTests() { await wait(); return load().tests.filter(t => t.meta.published).map(t => t.meta).sort(byNewest); }
export async function getTestContent(id) { await wait(150); const t = find(load(), id); if (!t) throw Object.assign(new Error('Bulunamadı'), { code: 'not-found' }); return splitTest(t.full).content; }
export async function getSettings() { return structuredClone(load().settings); }
export async function isAdmin() { await wait(150); return true; }
export async function listAllTests() { await wait(); return load().tests.map(t => t.meta).sort(byNewest); }
export async function getFullTest(id) { await wait(150); const t = find(load(), id); if (!t) throw Object.assign(new Error('Bulunamadı'), { code: 'not-found' }); return structuredClone(t.full); }
export async function listStats() {
  const out = {};
  load().tests.forEach(t => { if (t.stats) out[t.meta.id] = t.stats; });
  return out;
}
export async function createTest({ name, author, published, full }) {
  await wait(400);
  const db = load(), id = 'm' + Date.now().toString(36);
  db.tests.push({ meta: { id, name, author, published, questionCount: 80, createdAt: Date.now(), updatedAt: Date.now() }, full, stats: null });
  save(db); return id;
}
export async function updateTest(id, meta, full = null) {
  await wait(400);
  const db = load(), t = find(db, id);
  Object.assign(t.meta, meta, { updatedAt: Date.now() });
  if (full) t.full = full;
  save(db);
}
export async function setPublished(id, published) { await wait(200); const db = load(); Object.assign(find(db, id).meta, { published, updatedAt: Date.now() }); save(db); }
export async function deleteTest(id) { await wait(300); const db = load(); db.tests = db.tests.filter(t => t.meta.id !== id); save(db); }
export async function saveSettings(s) { await wait(300); const db = load(); db.settings = structuredClone(s); save(db); }
export function errorMessage(e) { return (e && e.message) || 'Bilinmeyen hata'; }
