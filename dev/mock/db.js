/* Mock veritabanı — yalnızca `npm run dev:mock` ile kullanılır, üretim paketine girmez.
 * localStorage'da tutulur; öğrenci sitesi ve admin paneli aynı veriyi görür. */
import d1 from '../../seed/deneme-1.json';
import d2 from '../../seed/deneme-2.json';
import { validateTest } from '../../src/core/validate.js';

const KEY = 'ykds_mock_db';
const day = 86400000;

function seed() {
  const now = Date.now();
  const mk = (id, src, name, author, published, ageDays, attempts, avg) => {
    const full = validateTest(src).clean;
    // deterministik sahte soru istatistikleri
    const right = {};
    for (let i = 0; i < 80; i++) right[i] = Math.round(attempts * (0.25 + ((i * 37) % 61) / 100));
    return {
      meta: { id, name, author, published, questionCount: 80, createdAt: now - ageDays * day, updatedAt: now - Math.max(0, ageDays - 2) * day },
      full,
      stats: attempts ? { attempts, avg, lastAt: now - 3 * 3600000, fields: { bilisim: Math.round(attempts * .38), siber: Math.round(attempts * .24), yapayzeka: Math.round(attempts * .27), donanim: Math.round(attempts * .11) }, right } : null,
    };
  };
  return {
    tests: [
      mk('m1', d1, 'Deneme 1 · Genel Tekrar', 'Akademik Ekip', true, 21, 184, 58.4),
      mk('m2', d2, 'Deneme 2 · Orta Seviye', 'Akademik Ekip', true, 12, 126, 54.9),
      mk('m3', d1, 'Deneme 3 · Zor Seviye', 'Dr. Hazırlayıcı', true, 5, 61, 47.2),
      mk('m4', d2, 'Deneme 4 · Yapay Zekâ Ağırlıklı', '', false, 1, 0, 0),
    ],
    settings: {
      announcement: { enabled: true, text: 'Yeni deneme yayında: Deneme 3 · Zor Seviye. Başarılar!' },
      maintenance: { enabled: false, message: '' },
      copyProtection: true,
      showExplanations: true,
    },
  };
}

export function load() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && v.tests) return v; } catch { /* */ }
  const v = seed(); save(v); return v;
}
export function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* */ } }
export const wait = (ms = 250) => new Promise(r => setTimeout(r, ms));
