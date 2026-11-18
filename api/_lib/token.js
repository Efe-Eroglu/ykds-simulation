/* Sınav oturum belirteci: HMAC-SHA256 ile imzalı {t: testId, s: başlangıç, n: tek kullanımlık kimlik}. */
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { HttpError } from './http.js';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function secret() {
  const s = process.env.EXAM_TOKEN_SECRET;
  if (!s || s.length < 32) throw new HttpError(503, 'Sunucu yapılandırması eksik (EXAM_TOKEN_SECRET, en az 32 karakter).');
  return s;
}
const b64 = buf => Buffer.from(buf).toString('base64url');
const sig = data => createHmac('sha256', secret()).update(data).digest('base64url');

export function issueToken(testId) {
  const payload = { t: testId, s: Date.now(), n: randomUUID() };
  const data = b64(JSON.stringify(payload));
  return { token: `${data}.${sig(data)}`, payload };
}

export function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 512) throw new HttpError(400, 'Geçersiz oturum.');
  const [data, mac] = token.split('.');
  if (!data || !mac) throw new HttpError(400, 'Geçersiz oturum.');
  const a = Buffer.from(mac), b = Buffer.from(sig(data));
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Oturum doğrulanamadı.');
  let p;
  try { p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')); } catch { throw new HttpError(400, 'Geçersiz oturum.'); }
  if (!p || typeof p.t !== 'string' || typeof p.s !== 'number' || typeof p.n !== 'string') throw new HttpError(400, 'Geçersiz oturum.');
  if (Date.now() - p.s > MAX_AGE_MS) throw new HttpError(410, 'Sınav oturumunun süresi doldu.');
  return p;
}
