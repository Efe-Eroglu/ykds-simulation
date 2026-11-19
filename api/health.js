/* GET /api/health → yalnızca sunucunun hazır olup olmadığını döndürür.
 * Hangi ayarın eksik olduğu gibi iç ayrıntılar dışarıya açıklanmaz; sorun varsa Vercel günlüklerine yazılır. */
import { send, HttpError } from './_lib/http.js';

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return send(res, 405, { error: new HttpError(405, 'Yöntem desteklenmiyor.').message });
  }
  const ready = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT) && Boolean(process.env.EXAM_TOKEN_SECRET && process.env.EXAM_TOKEN_SECRET.length >= 32);
  if (!ready) console.error('[api/health] sunucu yapılandırması eksik');
  send(res, 200, { ok: ready });
}
