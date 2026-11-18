import { MODULES, LETTERS, MAX_CHARS, modById } from './exam-config.js';

function normId(s) {
  return String(s).toLowerCase()
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}
const ID_ALIAS = {
  yz: 'yapayzeka', yapayzekaveakillisistemler: 'yapayzeka', ai: 'yapayzeka',
  siberguvenlik: 'siber', bilisimteknolojileri: 'bilisim', donanimvebilgisayarsistemleri: 'donanim',
  matematikseltemeller: 'matematik', olasilikistatistik: 'olasilik',
};
export function resolveModuleId(raw) {
  const n = normId(raw);
  const id = ID_ALIAS[n] || n;
  return modById[id] ? id : null;
}

/**
 * Deneme JSON'unu doğrular ve normalize eder.
 * @returns {{errors:string[], warnings:string[], clean?:{modules:{id:string,questions:object[]}[]}}}
 */
export function validateTest(obj) {
  const errors = [], warnings = [];
  if (!obj || typeof obj !== 'object') return { errors: ['JSON bir nesne olmalı.'], warnings };
  let mods = obj.modules;
  if (mods && !Array.isArray(mods) && typeof mods === 'object') mods = Object.entries(mods).map(([id, q]) => ({ id, questions: q }));
  if (!Array.isArray(mods)) return { errors: ['"modules" dizisi bulunamadı.'], warnings };

  const out = {};
  mods.forEach((m, mi) => {
    const rawId = m && m.id;
    const id = resolveModuleId(rawId ?? '');
    if (!id) { errors.push(`Modül #${mi + 1}: "${rawId}" tanınmıyor. Geçerli idler: ${MODULES.map(x => x.id).join(', ')}`); return; }
    if (out[id]) { errors.push(`"${id}" modülü birden fazla kez var.`); return; }
    const qs = m.questions;
    if (!Array.isArray(qs)) { errors.push(`${id}: "questions" dizisi yok.`); return; }
    const list = [];
    qs.forEach((q, qi) => {
      const w = `${id} soru ${qi + 1}`;
      if (!q || typeof q.question !== 'string' || !q.question.trim()) { errors.push(`${w}: "question" metni eksik.`); return; }
      if (!Array.isArray(q.options) || q.options.length !== 5 || q.options.some(o => typeof o !== 'string' || !o.trim())) { errors.push(`${w}: "options" tam 5 dolu metin olmalı.`); return; }
      const a = typeof q.answer === 'string' ? LETTERS.indexOf(q.answer.trim().toUpperCase()) : -1;
      if (a < 0) { errors.push(`${w}: "answer" A, B, C, D veya E olmalı.`); return; }
      list.push({
        question: q.question.trim(),
        options: q.options.map(o => o.trim().replace(/^[A-Ea-e][).]\s+/, '')),
        answer: LETTERS[a],
        explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
      });
    });
    out[id] = list;
  });

  for (const m of MODULES) {
    const got = out[m.id];
    if (!got) errors.push(`"${m.id}" (${m.name}) modülü eksik — ${m.n} soru gerekli.`);
    else if (got.length !== m.n) errors.push(`${m.id}: ${m.n} soru olmalı, ${got.length} var.`);
  }
  if (errors.length) return { errors, warnings };

  const clean = { modules: MODULES.map(m => ({ id: m.id, questions: out[m.id] })) };
  if (JSON.stringify(clean).length > MAX_CHARS) return { errors: [`Deneme çok büyük (en fazla ${MAX_CHARS} karakter).`], warnings };

  const dist = Object.fromEntries(LETTERS.map(l => [l, 0]));
  clean.modules.forEach(m => m.questions.forEach(q => dist[q.answer]++));
  const maxShare = Math.max(...Object.values(dist)) / 80;
  if (maxShare > 0.35) warnings.push(`Cevap dağılımı dengesiz: ${LETTERS.map(l => `${l}=${dist[l]}`).join(' ')}`);
  return { errors, warnings, clean };
}
