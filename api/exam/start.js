/* POST /api/exam/start  { testId } → { token, startedAt } */
import { postHandler, HttpError } from '../_lib/http.js';
import { adminDb, readSettings } from '../_lib/admin.js';
import { issueToken } from '../_lib/token.js';

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export default postHandler('start', { limit: 20, windowMs: 60000 }, async body => {
  const { testId } = body;
  if (typeof testId !== 'string' || !ID_RE.test(testId)) throw new HttpError(400, 'Geçersiz deneme.');
  const db = adminDb();
  const [settings, snap] = await Promise.all([readSettings(db), db.collection('tests').doc(testId).get()]);
  if (settings.maintenance?.enabled) throw new HttpError(503, settings.maintenance.message || 'Site bakımda.');
  if (!snap.exists || snap.data().published !== true) throw new HttpError(404, 'Deneme bulunamadı.');
  const { token, payload } = issueToken(testId);
  return { token, startedAt: payload.s };
});
