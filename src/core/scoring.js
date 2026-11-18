import { MODULES, FIELDS, LETTERS, OWN_COEF, OTHER_COEF } from './exam-config.js';

/** Modül yapısını düz soru listesine çevirir. */
export function buildQuestions(test) {
  const qs = [];
  test.modules.forEach(m => m.questions.forEach(q => qs.push({ mod: m.id, ...q })));
  return qs;
}

/** 'right' | 'wrong' | 'blank' */
export const statusOf = (q, a) => (a == null ? 'blank' : LETTERS[a] === q.answer ? 'right' : 'wrong');

/** Ağırlıklı puan = Ortak Temel doğruları + kendi alan × 2,25 + diğer alanlar × 1,25 */
export function computeScore(qs, answers, field) {
  const per = Object.fromEntries(MODULES.map(m => [m.id, { right: 0, wrong: 0, blank: 0 }]));
  qs.forEach((q, i) => { per[q.mod][statusOf(q, answers[i])]++; });
  const temel = MODULES.filter(m => m.group === 'temel').reduce((s, m) => s + per[m.id].right, 0);
  const alan = FIELDS.reduce((s, m) => s + per[m.id].right * (m.id === field ? OWN_COEF : OTHER_COEF), 0);
  return { per, temel, alan, total: temel + alan };
}

export const coefOf = (mod, field) => (mod.group === 'temel' ? 1 : mod.id === field ? OWN_COEF : OTHER_COEF);

export function totals(per) {
  return Object.values(per).reduce((s, p) => ({ r: s.r + p.right, w: s.w + p.wrong, b: s.b + p.blank }), { r: 0, w: 0, b: 0 });
}
