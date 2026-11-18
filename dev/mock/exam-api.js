/* Mock: sınav API'si tarayıcıda simüle edilir (gerçek sistemde bu işlem sunucuda yapılır). */
import { splitTest, keyToQuestions } from '../../src/core/split.js';
import { computeScore } from '../../src/core/scoring.js';
import { load, save, wait } from './db.js';

export async function startSession(testId) {
  await wait(200);
  const db = load();
  if (db.settings.maintenance.enabled) throw Object.assign(new Error('Site bakımda.'), { status: 503 });
  if (!db.tests.some(t => t.meta.id === testId && t.meta.published)) throw Object.assign(new Error('Deneme bulunamadı.'), { status: 404 });
  return { token: 'mock.' + btoa(JSON.stringify({ t: testId, s: Date.now() })), startedAt: Date.now() };
}

export async function submitExam(token, answers, field) {
  await wait(700);
  const { t: testId } = JSON.parse(atob(token.split('.')[1]));
  const db = load(), test = db.tests.find(x => x.meta.id === testId);
  if (!test) throw Object.assign(new Error('Deneme artık mevcut değil.'), { status: 404 });
  const { key } = splitTest(test.full);
  const sc = computeScore(keyToQuestions(key.answers), answers, field);
  const s = test.stats || { attempts: 0, avg: 0, lastAt: null, fields: {}, right: {} };
  s.avg = (s.avg * s.attempts + sc.total) / (s.attempts + 1); s.attempts++; s.lastAt = Date.now();
  s.fields[field] = (s.fields[field] || 0) + 1;
  test.stats = s; save(db);
  return { answers: key.answers.split(''), explanations: db.settings.showExplanations ? key.explanations : null, score: sc };
}

export async function checkHealth() { return { ok: true, serviceAccount: true, tokenSecret: true, mock: true }; }
