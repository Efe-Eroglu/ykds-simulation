import { EXAM_MINUTES, FIELDS, modById } from '../core/exam-config.js';
import { isValidContent } from '../core/split.js';
import { $, $$, h, toast, confirmDlg, fmtDate } from '../ui/dom.js';
import { hydrateIcons, icon } from '../ui/icons.js';
import { mountThemeToggle } from '../ui/theme.js';
import { store, KEYS } from '../lib/store.js';
import { firebaseConfigured } from '../lib/firebase.js';
import { listPublishedTests, getTestContent, getSettings, errorMessage } from '../services/tests.js';
import { startSession } from '../services/exam-api.js';
import { startExam, resumeExam, getSavedSession, discardSession, bindExamEvents, setCopyProtection } from './exam.js';
import { bindResultEvents } from './result.js';
import { renderHistory, bindHistoryEvents } from './history.js';
import { show } from './view.js';

let tests = [];
let selTest = null;
let selField = store.get(KEYS.field);
let maintenance = false;

/* ---------- Sekmeler ---------- */
function setTab(name) {
  $$('.tab').forEach(t => {
    const on = t.dataset.tab === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
  });
  $$('.tabpane').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + name));
  if (name === 'results') renderHistory();
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

function renderTests() {
  const box = $('#test-list'); box.textContent = '';
  if (!tests.length) {
    box.append(h('div', { class: 'empty' }, h('b', {}, 'Henüz yayınlanmış deneme yok'), h('span', {}, 'Yeni denemeler eklendiğinde burada görünecek.')));
    return;
  }
  tests.forEach(t => box.append(h('button', {
    type: 'button', class: 'choice test-item' + (selTest && selTest.id === t.id ? ' sel' : ''), 'aria-pressed': String(!!selTest && selTest.id === t.id),
    onclick: () => { selTest = t; renderTests(); updateStart(); },
  }, h('b', {}, t.name), h('small', {}, `${t.author ? t.author + ' · ' : ''}${fmtDate(t.createdAt)} · ${t.questionCount} soru`))));
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
    : selTest && selField ? `${selTest.name} · Alanın: ${modById[selField].name}` : 'Devam etmek için alan ve deneme seç.';
}

async function loadTests() {
  if (!firebaseConfigured) { renderTestsError('Site yapılandırması eksik (Firebase).'); return; }
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
  const left = ses.startedAt + EXAM_MINUTES * 60000 - Date.now();
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
  $$('.tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
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
