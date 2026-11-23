/* POST /api/exam/submit  { token, answers: (0-4|null)[80], field, idToken? }
 * → { answers: ['A',…], explanations: string[]|null, score: {total, temel, alan} }
 * Cevap anahtarı yalnızca burada, sınav teslim edildikten sonra döner.
 * idToken (giriş yapmış kullanıcı) gönderilirse sonuç users/{uid}/attempts altına da kaydedilir.
 */
import { postHandler, HttpError } from '../_lib/http.js';
import { adminDb, adminAuth, readSettings, FieldValue } from '../_lib/admin.js';
import { verifyToken } from '../_lib/token.js';
import { TOTAL_Q, FIELDS, EXAM_MINUTES } from '../../src/core/exam-config.js';
import { computeScore } from '../../src/core/scoring.js';
import { keyToQuestions } from '../../src/core/split.js';

const FIELD_IDS = new Set(FIELDS.map(f => f.id));
const TOKEN_TTL_MS = 2 * 24 * 60 * 60 * 1000;

/** Geçerli bir Firebase kimlik belirteci ise uid, değilse null (sınav yine değerlendirilir). */
async function uidOf(idToken) {
  if (typeof idToken !== 'string' || !idToken || idToken.length > 4096) return null;
  try { return (await adminAuth().verifyIdToken(idToken)).uid; } catch { return null; }
}

export default postHandler('submit', { limit: 20, windowMs: 60000 }, async body => {
  const p = verifyToken(body.token);
  const { answers, field } = body;
  if (!Array.isArray(answers) || answers.length !== TOTAL_Q || !answers.every(a => a === null || (Number.isInteger(a) && a >= 0 && a <= 4))) {
    throw new HttpError(400, 'Geçersiz cevap listesi.');
  }
  if (!FIELD_IDS.has(field)) throw new HttpError(400, 'Geçersiz alan.');

  const db = adminDb();
  const [settings, keySnap, uid] = await Promise.all([readSettings(db), db.collection('testKeys').doc(p.t).get(), uidOf(body.idToken)]);
  if (!keySnap.exists) throw new HttpError(404, 'Deneme artık mevcut değil.');
  const key = keySnap.data();
  if (typeof key.answers !== 'string' || key.answers.length !== TOTAL_Q) throw new HttpError(500, 'Cevap anahtarı bozuk.');

  const qs = keyToQuestions(key.answers);
  const sc = computeScore(qs, answers, field);

  // İstatistik: her oturum belirteci yalnızca bir kez sayılır (tekrar gönderimler sayıyı şişiremez).
  let first = false;
  try {
    await db.collection('examTokens').doc(p.n).create({ testId: p.t, at: FieldValue.serverTimestamp(), expireAt: new Date(Date.now() + TOKEN_TTL_MS) });
    first = true;
  } catch (e) {
    if (e.code !== 6 /* ALREADY_EXISTS */) throw e;
  }
  if (first) {
    const right = {};
    qs.forEach((q, i) => { if (answers[i] != null && 'ABCDE'[answers[i]] === q.answer) right[i] = FieldValue.increment(1); });
    await db.collection('testStats').doc(p.t).set({
      attempts: FieldValue.increment(1),
      scoreSum: FieldValue.increment(sc.total),
      lastAt: FieldValue.serverTimestamp(),
      fields: { [field]: FieldValue.increment(1) },
      right,
    }, { merge: true });
  }

  // Kişisel sonuç: oturum kimliğiyle kaydedilir, tekrar gönderim aynı kaydın üzerine yazar.
  let savedToAccount = false;
  if (uid) {
    try {
      const meta = await db.collection('tests').doc(p.t).get();
      await db.collection('users').doc(uid).collection('attempts').doc(p.n).set({
        testId: p.t,
        testName: (meta.exists && meta.data().name) || 'Silinmiş deneme',
        field,
        startedAt: p.s,
        finishedAt: Math.min(Date.now(), p.s + EXAM_MINUTES * 60000),
        answers,
        total: sc.total, temel: sc.temel, alan: sc.alan, per: sc.per,
        createdAt: FieldValue.serverTimestamp(),
      });
      savedToAccount = true;
    } catch (e) {
      console.error('[submit] kişisel sonuç kaydedilemedi:', e.message);
    }
  }

  return {
    savedToAccount,
    answers: key.answers.split(''),
    explanations: settings.showExplanations === false ? null : (key.explanations || []),
    score: { total: sc.total, temel: sc.temel, alan: sc.alan },
  };
});
