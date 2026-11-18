/* GET /api/health → sunucu yapılandırmasının durumu (gizli bilgi döndürmez). */
import { send } from './_lib/http.js';

export default function handler(req, res) {
  send(res, 200, {
    ok: true,
    serviceAccount: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT),
    tokenSecret: Boolean(process.env.EXAM_TOKEN_SECRET && process.env.EXAM_TOKEN_SECRET.length >= 32),
    time: Date.now(),
  });
}
