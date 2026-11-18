import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

process.env.EXAM_TOKEN_SECRET = 'test-secret-'.padEnd(48, 'x');
const { issueToken, verifyToken } = await import('../api/_lib/token.js');
const { postHandler } = await import('../api/_lib/http.js');

test('imzalı belirteç doğrulanır', () => {
  const { token, payload } = issueToken('abc123');
  assert.deepEqual(verifyToken(token), payload);
});

test('değiştirilmiş belirteç reddedilir', () => {
  const { token } = issueToken('abc123');
  const [data, mac] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ t: 'baska', s: Date.now(), n: 'x' })).toString('base64url');
  assert.throws(() => verifyToken(`${forged}.${mac}`), { status: 401 });
  assert.throws(() => verifyToken(`${data}.${mac.slice(0, -2)}AA`), { status: 401 });
  assert.throws(() => verifyToken('bozuk'), { status: 400 });
});

test('süresi geçmiş belirteç reddedilir', () => {
  const realNow = Date.now;
  const { token } = issueToken('abc');
  Date.now = () => realNow() + 25 * 3600 * 1000;
  try { assert.throws(() => verifyToken(token), { status: 410 }); } finally { Date.now = realNow; }
});

function fakeReq({ method = 'POST', origin, host = 'site.app', body = {} } = {}) {
  const req = Readable.from([JSON.stringify(body)]);
  Object.assign(req, { method, headers: { host, ...(origin ? { origin } : {}) }, socket: { remoteAddress: '1.2.3.' + Math.random() } });
  return req;
}
function fakeRes() {
  const res = { statusCode: 0, headers: {}, body: '' };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = b => { res.body = JSON.parse(b); };
  return res;
}

test('API: yalnızca POST, aynı kaynak ve no-store', async () => {
  const h = postHandler('t1', {}, async b => ({ echo: b.x }));
  let res = fakeRes(); await h(fakeReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
  res = fakeRes(); await h(fakeReq({ origin: 'https://kotu-site.com', body: { x: 1 } }), res);
  assert.equal(res.statusCode, 403);
  res = fakeRes(); await h(fakeReq({ origin: 'https://site.app', body: { x: 1 } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { echo: 1 });
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('API: hız sınırı', async () => {
  const h = postHandler('t2', { limit: 3, windowMs: 60000 }, async () => ({ ok: true }));
  const codes = [];
  for (let i = 0; i < 5; i++) {
    const req = fakeReq(); req.socket.remoteAddress = '9.9.9.9';
    const res = fakeRes(); await h(req, res); codes.push(res.statusCode);
  }
  assert.deepEqual(codes, [200, 200, 200, 429, 429]);
});

test('API: büyük gövde reddedilir', async () => {
  const h = postHandler('t3', {}, async () => ({ ok: true }));
  const res = fakeRes(); await h(fakeReq({ body: { pad: 'x'.repeat(20000) } }), res);
  assert.equal(res.statusCode, 413);
});
