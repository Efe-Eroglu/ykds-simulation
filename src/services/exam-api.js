/* Sınav API'si (Vercel /api). Cevap anahtarı yalnızca submit sonrasında döner. */

async function call(path, { method = 'POST', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw Object.assign(new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'), { code: 'network' });
  }
  let data = {};
  try { data = await res.json(); } catch { /* boş yanıt */ }
  if (!res.ok) throw Object.assign(new Error(data.error || `Sunucu hatası (${res.status})`), { status: res.status });
  return data;
}

/** → { token, startedAt } */
export const startSession = testId => call('/api/exam/start', { body: { testId } });

/** → { answers: string[], explanations: string[]|null, score } */
export const submitExam = (token, answers, field) => call('/api/exam/submit', { body: { token, answers, field } });

/** → { ok, serviceAccount, tokenSecret } | null */
export async function checkHealth() {
  try { return await call('/api/health', { method: 'GET' }); } catch { return null; }
}
