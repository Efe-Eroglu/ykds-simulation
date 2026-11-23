import { $, $$, h, toast, confirmDlg } from '../ui/dom.js';
import { hydrateIcons, icon } from '../ui/icons.js';
import { mountThemeToggle } from '../ui/theme.js';
import { firebaseConfigured } from '../lib/firebase.js';
import { isAdmin, errorMessage } from '../services/tests.js';
import { watchAuth, login, logout, resetPassword } from '../services/auth.js';
import { state, refreshAll, onChange } from './state.js';
import { closeDrawer } from './ui.js';
import { startIdleWatch, stopIdleWatch } from './session.js';
import { renderOverview } from './pages/overview.js';
import { renderTests } from './pages/tests.js';
import { renderEditor, isEditorDirty, clearEditorDirty } from './pages/editor.js';
import { renderSettings } from './pages/settings.js';
import { renderResults } from './pages/results.js';

/* ---------- Ekran durumları ---------- */
function screen(name, card = null) {
  $('#boot').classList.toggle('hidden', name !== 'boot');
  $('#auth').classList.toggle('hidden', name !== 'auth');
  $('#shell').classList.toggle('hidden', name !== 'shell');
  if (name === 'auth') ['login-form', 'auth-denied', 'auth-config'].forEach(id => $('#' + id).classList.toggle('hidden', id !== card));
}

/* ---------- Giriş ---------- */
let loginAttempts = 0, lockUntil = 0;
async function onLogin(e) {
  e.preventDefault();
  const err = $('#login-err'); err.textContent = '';
  if (Date.now() < lockUntil) { err.textContent = `Çok fazla hatalı deneme. ${Math.ceil((lockUntil - Date.now()) / 1000)} sn sonra tekrar dene.`; return; }
  const email = $('#in-email').value.trim(), pass = $('#in-pass').value;
  if (!email || !pass) { err.textContent = 'E-posta ve şifre gerekli.'; return; }
  const b = $('#btn-login'); b.disabled = true; b.textContent = 'Giriş yapılıyor…';
  try {
    await login(email, pass);
    loginAttempts = 0;
    $('#in-pass').value = '';
  } catch (ex) {
    // İstemci tarafı yavaşlatma (Firebase de sunucuda hız sınırı uygular).
    if (++loginAttempts >= 5) { lockUntil = Date.now() + Math.min(300, 30 * 2 ** (loginAttempts - 5)) * 1000; }
    err.textContent = errorMessage(ex);
  }
  b.disabled = false; b.textContent = 'Giriş yap';
}
async function onReset() {
  const email = $('#in-email').value.trim();
  if (!email) { $('#login-err').textContent = 'Önce e-posta adresini yaz.'; return; }
  try { await resetPassword(email); } catch { /* hesap var/yok bilgisini sızdırmamak için hep aynı mesaj */ }
  toast('Bu adrese kayıtlı bir hesap varsa sıfırlama bağlantısı gönderildi.');
}

/* ---------- Yönlendirme ---------- */
const PAGES = {
  overview: { title: 'Genel bakış', render: el => renderOverview(el) },
  tests: { title: 'Denemeler', render: el => renderTests(el) },
  editor: { title: 'Düzenleyici', render: (el, id) => renderEditor(el, id) },
  results: { title: 'Sonuçlarım', render: el => renderResults(el) },
  settings: { title: 'Ayarlar', render: el => renderSettings(el) },
};

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'tests' && parts[1] === 'new') return { page: 'editor', id: null, nav: 'editor' };
  if (parts[0] === 'tests' && parts[1]) return { page: 'editor', id: decodeURIComponent(parts[1]), nav: 'tests' };
  if (PAGES[parts[0]]) return { page: parts[0], id: null, nav: parts[0] };
  return { page: 'overview', id: null, nav: 'overview' };
}

let current = null;
let lastHash = location.hash;
async function route() {
  if (isEditorDirty() && current?.page === 'editor' && location.hash !== lastHash) {
    const back = lastHash;
    if (!(await confirmDlg('Kaydedilmemiş değişiklikler', 'Düzenleyicide kaydedilmemiş değişiklikler var. Sayfadan çıkılsın mı?', 'Çık'))) {
      history.replaceState(null, '', back); return;
    }
    clearEditorDirty();
  }
  lastHash = location.hash;
  const r = parseHash();
  current = r;
  closeDrawer();
  $('#shell').classList.remove('nav-open');
  $$('.sb-nav a[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === r.nav));
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === r.page));
  const p = PAGES[r.page];
  $('#crumb').textContent = r.page === 'editor' ? (r.id ? 'Denemeyi düzenle' : 'Yeni deneme') : p.title;
  document.title = `${$('#crumb').textContent} · YKDS Yönetim`;
  await p.render($(`.page[data-page="${r.page}"]`), r.id);
  window.scrollTo(0, 0);
}

/* Veri değişince düzenleyici dışındaki sayfayı yeniden çiz (düzenleyicideki yazılanı kaybetmemek için). */
onChange(() => {
  $('#nav-count').textContent = state.tests.length || '';
  if (current && current.page !== 'editor' && current.page !== 'results' && !$('#shell').classList.contains('hidden')) {
    PAGES[current.page].render($(`.page[data-page="${current.page}"]`), current.id);
  }
});

/* ---------- Oturum ---------- */
async function enterShell(user) {
  state.user = user;
  $('#sb-email').textContent = user.email;
  $('#sb-avatar').textContent = (user.email || '?')[0];
  screen('boot');
  try { await refreshAll(); } catch (e) { toast('Veriler yüklenemedi: ' + errorMessage(e), 'error'); }
  screen('shell');
  await route();
  startIdleWatch(async () => {
    try { sessionStorage.setItem('ykds_idle_logout', '1'); } catch { /* */ }
    await logout();
  });
}

function bind() {
  hydrateIcons();
  $$('.theme-toggle').forEach(mountThemeToggle);
  $$('.year').forEach(e => { e.textContent = new Date().getFullYear(); });
  $('#login-form').addEventListener('submit', onLogin);
  $('#btn-reset').addEventListener('click', onReset);
  $('#btn-denied-logout').addEventListener('click', () => logout());
  $('#btn-logout').addEventListener('click', async () => {
    if (await confirmDlg('Çıkış yap', 'Yönetim panelinden çıkış yapılacak.', 'Çıkış yap')) logout();
  });
  $$('.pw-eye').forEach(b => b.addEventListener('click', () => {
    const inp = $('#' + b.dataset.target), show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    b.replaceChildren(icon(show ? 'eyeOff' : 'eye', 16));
    b.setAttribute('aria-label', show ? 'Şifreyi gizle' : 'Şifreyi göster');
  }));
  $('#btn-menu').addEventListener('click', () => $('#shell').classList.toggle('nav-open'));
  $('#sb-backdrop').addEventListener('click', () => $('#shell').classList.remove('nav-open'));
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', e => { if (isEditorDirty()) { e.preventDefault(); e.returnValue = ''; } });
  const conn = () => { const c = $('#conn'); c.classList.toggle('hidden', navigator.onLine); c.className = 'pill err' + (navigator.onLine ? ' hidden' : ''); c.textContent = 'Çevrimdışı'; };
  window.addEventListener('online', conn); window.addEventListener('offline', conn); conn();
}

function main() {
  bind();
  if (!firebaseConfigured) { screen('auth', 'auth-config'); return; }
  watchAuth(async user => {
    if (!user) {
      stopIdleWatch();
      state.user = null;
      screen('auth', 'login-form');
      try { if (sessionStorage.getItem('ykds_idle_logout')) { sessionStorage.removeItem('ykds_idle_logout'); $('#login-err').textContent = 'Uzun süre işlem yapılmadığı için oturum kapatıldı.'; } } catch { /* */ }
      $('#in-email').focus();
      return;
    }
    screen('boot');
    if (await isAdmin(user.uid)) enterShell(user);
    else { $('#denied-uid').textContent = user.uid; screen('auth', 'auth-denied'); }
  });
}

main();
