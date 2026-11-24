import { EXAM_MINUTES, FIELDS, modById } from '../core/exam-config.js';
import { isValidContent } from '../core/split.js';
import { $, $$, h, toast, confirmDlg, fmtDate, f2 } from '../ui/dom.js';
import { hydrateIcons, icon } from '../ui/icons.js';
import { mountThemeToggle } from '../ui/theme.js';
import { mountSettingsToggle } from '../ui/reading.js';
import { store, KEYS } from '../lib/store.js';
import { firebaseConfigured } from '../lib/firebase.js';
import { listPublishedTests, getTestContent, getSettings, listMyAttempts, errorMessage } from '../services/tests.js';
import { startSession } from '../services/exam-api.js';
import { startExam, resumeExam, getSavedSession, discardSession, bindExamEvents, setCopyProtection, remainingMs } from './exam.js';
import { bindResultEvents } from './result.js';
import { renderHistory, bindHistoryEvents } from './history.js';
import { show } from './view.js';
import { getAttempts } from './attempts.js';

let tests = [];
let selTest = null;
let selField = store.get(KEYS.field);
let maintenance = false;
let solved = new Map();   // testId → { count, best, last }
let solvedBy = null;      // giriş yapılmışsa hesabın e-postası

/* ---------- Sekmeler ---------- */
function setTab(name) {
  $$('.tab').forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  $$('.tabpane').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + name));
  moveTabIndicator();
  if (name === 'results') renderHistory();
  if (name === 'solve') refreshSolved(); // çözülen/silinen sonuçlar yansısın
}

/** Aktif sekmenin altındaki kayan arka planı konumlar (görünür değilse dokunmaz). */
function moveTabIndicator() {
  const tabs = $('.tabs'), ind = $('.tab-ind'), act = $('.tab.active');
  if (!tabs || !ind || !act || !act.offsetWidth) return;
  ind.style.width = act.offsetWidth + 'px';
  ind.style.transform = `translateX(${act.offsetLeft}px)`;
  tabs.classList.add('ind-ready');
}

/* ---------- Giriş bölümü ---------- */
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp() {
  if (reducedMotion()) return;
  $$('.hero-stats [data-count]').forEach((el, i) => {
    const target = Number(el.dataset.count), dur = 1100, t0 = performance.now() + 400 + i * 80;
    el.textContent = '0';
    const step = now => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function goToTab(name) {
  setTab(name);
  $('#home-main').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

function bindHero() {
  $('#cta-start').addEventListener('click', () => goToTab('solve'));
  $('#cta-rules').addEventListener('click', () => goToTab('info'));
  // Hafif fare paralaksı: maket kartı imlece doğru eğilir.
  const vis = $('.hero-visual'), mock = $('.mock');
  if (vis && mock && !reducedMotion() && matchMedia('(pointer: fine)').matches) {
    $('.hero').addEventListener('pointermove', e => {
      const r = vis.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / r.width, y = (e.clientY - (r.top + r.height / 2)) / r.height;
      mock.style.transform = `rotateY(${-10 + x * 10}deg) rotateX(${6 - y * 8}deg)`;
    });
    $('.hero').addEventListener('pointerleave', () => { mock.style.transform = ''; });
  }
  countUp();
}

/* ---------- Site ayarları ---------- */
async function applySettings() {
  const s = await getSettings();
  setCopyProtection(s.copyProtection);
  const banner = $('#banner');
  if (s.announcement.enabled && s.announcement.text) {
    banner.replaceChildren(icon('megaphone', 16), h('span', {}, s.announcement.text));
    banner.classList.remove('hidden');
  }
  maintenance = !!s.maintenance.enabled;
  const mb = $('#maint-box');
  mb.classList.toggle('hidden', !maintenance);
  if (maintenance) {
    mb.replaceChildren(h('div', { class: 'row' }, icon('wrench', 20), h('div', {},
      h('b', {}, 'Site kısa süreliğine bakımda'),
      h('div', { class: 'muted small' }, s.maintenance.message || 'Yeni sınav başlatma geçici olarak kapalı. Geçmiş sonuçlarını görüntüleyebilirsin.'))));
  }
  updateStart();
}

/* ---------- Alan ve deneme seçimi ---------- */
function renderFieldChoices() {
  const box = $('#field-list'); box.textContent = '';
  FIELDS.forEach(f => box.append(h('button', {
    type: 'button', class: 'choice' + (selField === f.id ? ' sel' : ''), 'aria-pressed': String(selField === f.id),
    onclick: () => { selField = f.id; store.set(KEYS.field, f.id); renderFieldChoices(); updateStart(); },
  }, f.name)));
}

function toSolvedMap(atts) {
  const m = new Map();
  atts.forEach(a => {
    const cur = m.get(a.testId) || { count: 0, best: -Infinity, last: 0 };
    m.set(a.testId, { count: cur.count + 1, best: Math.max(cur.best, a.total), last: Math.max(cur.last, a.finishedAt) });
  });
  return m;
}

/**
 * "Çözüldü" işaretlerinin kaynağı: giriş yapılmışsa YALNIZCA o hesabın sonuçları,
 * değilse bu tarayıcıda hesapsız çözülenler (başka bir hesapla çözülenler karışmasın).
 */
async function refreshSolved() {
  let user = null;
  try { user = await import('../services/auth.js').then(m => m.currentUser()); } catch { /* auth yok/yapılandırılmamış */ }
  if (user) {
    try { solved = toSolvedMap(await listMyAttempts(user.uid)); solvedBy = user.email; } catch (e) { console.error(e); solved = new Map(); solvedBy = user.email; }
  } else {
    solved = toSolvedMap(getAttempts().filter(a => !a.uid));
    solvedBy = null;
  }
  if (tests.length) { renderTests(); updateStart(); }
}

function renderTests() {
  const box = $('#test-list'); box.textContent = '';
  if (!tests.length) {
    box.append(h('div', { class: 'empty' }, h('b', {}, 'Henüz yayınlanmış deneme yok'), h('span', {}, 'Yeni denemeler eklendiğinde burada görünecek.')));
    return;
  }
  if (solvedBy) box.append(h('p', { class: 'muted small', style: 'margin:0' }, `${solvedBy} hesabıyla çözdüğün denemeler işaretleniyor.`));
  // Çözülmemiş denemeler üstte; kendi aralarında yayın sırası korunur.
  const ordered = [...tests.filter(t => !solved.has(t.id)), ...tests.filter(t => solved.has(t.id))];
  ordered.forEach(t => {
    const s = solved.get(t.id), on = !!selTest && selTest.id === t.id;
    box.append(h('button', {
      type: 'button', class: 'choice test-item' + (on ? ' sel' : '') + (s ? ' solved' : ''), 'aria-pressed': String(on),
      onclick: () => { selTest = t; renderTests(); updateStart(); },
    },
      h('div', { class: 'ti-head' }, h('b', {}, t.name), s ? h('span', { class: 'pill on' }, s.count > 1 ? `${s.count} kez çözüldü` : 'Çözüldü') : null),
      h('small', {}, `${t.author ? t.author + ' · ' : ''}${fmtDate(t.createdAt)} · ${t.questionCount} soru`),
      s ? h('small', {}, `En yüksek puan ${f2(s.best)} · Son çözüm ${fmtDate(s.last)}`) : null));
  });
}

function renderTestsError(msg) {
  const box = $('#test-list'); box.textContent = '';
  box.append(h('div', { class: 'empty error' },
    h('b', {}, 'Denemeler yüklenemedi'), h('span', {}, msg),
    h('button', { class: 'btn small', onclick: loadTests }, 'Tekrar dene')));
}

function updateStart() {
  const ok = selTest && selField && !maintenance;
  $('#btn-start').disabled = !ok;
  $('#start-summary').textContent = maintenance ? 'Bakım sırasında yeni sınav başlatılamaz.'
    : selTest && selField ? `${selTest.name} · Alanın: ${modById[selField].name}${solved.has(selTest.id) ? ' · Bu denemeyi daha önce çözdün' : ''}`
      : 'Devam etmek için alan ve deneme seç.';
}

async function loadTests() {
  if (!firebaseConfigured) { renderTestsError('Denemeler şu anda yüklenemiyor. Lütfen biraz sonra tekrar dene.'); return; }
  const box = $('#test-list'); box.replaceChildren(h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }));
  try {
    tests = await listPublishedTests();
  } catch (e) {
    console.error(e); tests = []; renderTestsError(errorMessage(e)); return;
  }
  if (selTest) selTest = tests.find(t => t.id === selTest.id) || null;
  renderTests(); updateStart();
}

async function onStart() {
  if (!selTest || !selField || maintenance) return;
  if (getSavedSession() && !(await confirmDlg('Devam eden sınav var', 'Yeni sınav başlatırsan devam eden sınavın silinir.', 'Yeni sınav başlat'))) return;
  const btn = $('#btn-start');
  btn.disabled = true; btn.textContent = 'Hazırlanıyor…';
  try {
    const [session, content] = await Promise.all([startSession(selTest.id), getTestContent(selTest.id)]);
    if (!isValidContent(content)) { toast('Bu deneme bozuk görünüyor. Lütfen yöneticiye bildir.', 'error'); return; }
    startExam(selTest, content, selField, session.token);
  } catch (e) {
    console.error(e);
    toast('Sınav başlatılamadı: ' + errorMessage(e), 'error');
  } finally {
    btn.textContent = `Sınavı Başlat (${EXAM_MINUTES} dk)`;
    updateStart();
  }
}

/* ---------- Devam eden sınav ---------- */
function renderResume() {
  const box = $('#resume-box'), ses = getSavedSession();
  if (!ses) { box.classList.add('hidden'); return; }
  const left = remainingMs(ses);
  box.classList.remove('hidden'); box.textContent = '';
  box.append(
    h('div', { class: 'row' }, icon('clock', 20), h('div', {}, h('b', {}, 'Devam eden sınavın var: '), ses.testName,
      h('div', { class: 'muted small' }, left > 0 ? `${Math.ceil(left / 60000)} dakika kaldı` : 'Süre doldu, teslim edilmeyi bekliyor'))),
    h('div', { class: 'row' },
      h('button', { class: 'btn primary small', onclick: () => resumeExam(ses) }, left > 0 ? 'Devam et' : 'Teslim et ve sonucu gör'),
      h('button', {
        class: 'btn small', onclick: async () => {
          if (await confirmDlg('Sınavı sil', 'Devam eden sınav ve cevapların silinecek.', 'Sil')) { discardSession(); renderResume(); }
        },
      }, 'Sil')));
}

function goHome(tab = 'solve') {
  show('home');
  renderResume();
  setTab(tab);
}

/* ---------- Başlangıç ---------- */
function main() {
  hydrateIcons();
  $$('.theme-toggle').forEach(mountThemeToggle);
  $$('.settings-toggle').forEach(mountSettingsToggle);
  $$('.tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
  window.addEventListener('resize', moveTabIndicator);
  document.fonts?.ready.then(moveTabIndicator);
  bindHero();
  $('#btn-refresh').addEventListener('click', loadTests);
  $('#btn-start').addEventListener('click', onStart);
  bindExamEvents();
  bindResultEvents(() => goHome('results'));
  bindHistoryEvents();
  $('#year').textContent = new Date().getFullYear();

  renderFieldChoices(); updateStart();
  goHome();
  if (firebaseConfigured) applySettings();
  loadTests();
}

main();
