/* Vercel Node fonksiyonları için küçük HTTP yardımcıları (Vite dev ortamında da çalışır). */

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** İstemciye gösterilen genel mesajlar: iç ayrıntı (ortam değişkeni, yığın izi, kütüphane hatası) asla dışarı sızmaz. */
export const UNAVAILABLE = 'Hizmet geçici olarak kullanılamıyor. Lütfen biraz sonra tekrar dene.';
export const SERVER_ERROR = 'Beklenmeyen bir sunucu hatası oluştu. Lütfen tekrar dene.';

/** Hata nesnesini istemciye güvenle gönderilebilecek {status, message} çiftine çevirir. */
export function publicError(e) {
  if (e instanceof HttpError && e.status >= 400 && e.status < 500) return { status: e.status, message: e.message };
  if (e instanceof HttpError && e.status === 503) return { status: 503, message: e.message || UNAVAILABLE };
  return { status: 500, message: SERVER_ERROR };
}

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(body));
}

const MAX_BODY = 16 * 1024;

export async function readJson(req) {
  // Vercel req.body'yi tembel çözümler ve geçersiz JSON'da hata fırlatır; bunu 400'e çeviririz.
  let pre;
  try { pre = req.body; } catch { throw new HttpError(400, 'Geçersiz JSON.'); }
  if (pre && typeof pre === 'object') return pre;
  if (typeof pre === 'string') return parse(pre);
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new HttpError(413, 'İstek çok büyük.');
  }
  return parse(raw);
}
function parse(s) {
  if (s.length > MAX_BODY) throw new HttpError(413, 'İstek çok büyük.');
  try { return s ? JSON.parse(s) : {}; } catch { throw new HttpError(400, 'Geçersiz JSON.'); }
}

/** Farklı siteden gelen tarayıcı isteklerini reddeder (CSRF / başka sitenin API'yi kullanması). */
function assertSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return; // sunucu-sunucu veya aynı-kaynak GET
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try { if (new URL(origin).host === host) return; } catch { /* */ }
  throw new HttpError(403, 'İzin verilmeyen kaynak.');
}

/* Örnek başına basit hız sınırı (en iyi çaba; sunucusuz örnekler arasında paylaşılmaz). */
const buckets = new Map();
function rateLimit(req, key, limit, windowMs) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
  const id = key + ':' + ip, now = Date.now();
  const b = buckets.get(id);
  if (!b || b.reset < now) { buckets.set(id, { n: 1, reset: now + windowMs }); return; }
  if (++b.n > limit) throw new HttpError(429, 'Çok fazla istek. Lütfen biraz bekle.');
  if (buckets.size > 5000) buckets.clear();
}

/** POST uç noktası sarmalayıcısı: yöntem, kaynak ve hız kontrolü + hata yönetimi. */
export function postHandler(name, { limit = 30, windowMs = 60000 } = {}, fn) {
  return async (req, res) => {
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw new HttpError(405, 'Yalnızca POST.'); }
      assertSameOrigin(req);
      rateLimit(req, name, limit, windowMs);
      const body = await readJson(req);
      send(res, 200, await fn(body, req));
    } catch (e) {
      const { status, message } = publicError(e);
      if (status >= 500) console.error(`[api/${name}]`, e);
      send(res, status, { error: message });
    }
  };
}
