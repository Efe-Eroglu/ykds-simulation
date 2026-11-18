/* Mock: giriş yapılmış bir admin kullanıcı. Çıkış yapılınca giriş ekranı gösterilir. */
import { wait } from './db.js';

const KEY = 'ykds_mock_logged_out';
const USER = {
  uid: 'mock-admin-uid-7f3a9c', email: 'admin@ornek.com',
  metadata: { lastSignInTime: new Date(Date.now() - 3600000).toUTCString(), creationTime: new Date(Date.now() - 40 * 86400000).toUTCString() },
};
let cb = null;
const current = () => { try { return sessionStorage.getItem(KEY) ? null : USER; } catch { return USER; } };

export function watchAuth(fn) { cb = fn; setTimeout(() => cb(current()), 200); return () => { cb = null; }; }
export async function login(email, pass) {
  await wait(400);
  if (!email || pass.length < 4) throw Object.assign(new Error('E-posta veya şifre hatalı.'), { code: 'auth/invalid-credential' });
  try { sessionStorage.removeItem(KEY); } catch { /* */ }
  cb?.(USER);
}
export async function logout() { try { sessionStorage.setItem(KEY, '1'); } catch { /* */ } cb?.(null); }
export async function resetPassword() { await wait(300); }
export async function changePassword() { await wait(400); }
