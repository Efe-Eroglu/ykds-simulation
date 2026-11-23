import { EXAM_MINUTES, LETTERS, modById } from '../core/exam-config.js';
import { buildQuestions, computeScore } from '../core/scoring.js';
import { mergeTest } from '../core/split.js';
import { $, h, toast, confirmDlg, renderRich } from '../ui/dom.js';
import { store, KEYS } from '../lib/store.js';
import { submitExam } from '../services/exam-api.js';
import { saveAttempt } from './attempts.js';
import { openAttempt } from './result.js';
import { show } from './view.js';

let S = null;          // aktif sınav oturumu
let timerId = null;
let submitting = false;
let copyProtection = true;

const endsAt = ses => ses.startedAt + EXAM_MINUTES * 60000;

export const getSavedSession = () => {
  const ses = store.get(KEYS.session);
  return ses && !ses.finished && ses.test && ses.token ? ses : null;
};
export const discardSession = () => store.del(KEYS.session);
export const setCopyProtection = on => { copyProtection = !!on; };

function persist() {
  if (!S) return;
  const { qs, ...rest } = S;
  store.set(KEYS.session, rest);
}

/** content: cevapsız deneme içeriği, token: sunucunun verdiği oturum belirteci */
export function startExam(meta, content, field, token) {
  const qs = buildQuestions(content);
  S = {
    testId: meta.id, testName: meta.name, field, token, startedAt: Date.now(), test: content, qs,
    answers: Array(qs.length).fill(null), flags: Array(qs.length).fill(false), idx: 0, finished: false,
  };
  persist();
  enter();
}

export function resumeExam(ses) {
  S = { ...ses, qs: buildQuestions(ses.test) };
  if (Date.now() >= endsAt(S)) { show('exam'); render(); finish(); return; }
  enter();
}

/* ---------- Kopya koruması ---------- */
const blockEvt = e => { if (S && !$('#view-exam').classList.contains('hidden')) e.preventDefault(); };
function protect(on) {
  document.body.classList.toggle('no-copy', on);
  ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(t => {
    document[on ? 'addEventListener' : 'removeEventListener'](t, blockEvt);
  });
}

function enter() {
  $('#ex-title').textContent = S.testName;
  show('exam');
  if (copyProtection) protect(true);
  render(); tick();
  clearInterval(timerId);
  timerId = setInterval(tick, 1000);
}

function tick() {
  const ms = endsAt(S) - Date.now();
  if (ms <= 0) { clearInterval(timerId); toast('Süre doldu! Sınav otomatik olarak teslim ediliyor.'); finish(); return; }
  const s = Math.floor(ms / 1000), el = $('#timer');
  $('#timer-text').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  el.classList.toggle('low', ms < 10 * 60000);
}

function render() {
  const i = S.idx, q = S.qs[i];
  $('#q-num').textContent = `Soru ${i + 1} / ${S.qs.length}`;
  $('#q-mod').textContent = modById[q.mod].name;
  renderRich($('#q-text'), q.question);

  const box = $('#q-options'); box.textContent = '';
  q.options.forEach((o, k) => box.append(h('button', {
    type: 'button', class: 'opt' + (S.answers[i] === k ? ' sel' : ''), 'aria-pressed': String(S.answers[i] === k), onclick: () => choose(k),
  }, h('span', { class: 'l' }, LETTERS[k]), h('span', { class: 't' }, o))));

  const fl = $('#btn-flag');
  fl.classList.toggle('flagged', S.flags[i]);
  fl.textContent = S.flags[i] ? '⚑ İşaretli' : '⚑ İşaretle';
  $('#btn-prev').disabled = i === 0;
  $('#btn-next').disabled = i === S.qs.length - 1;

  const pal = $('#palette'); pal.textContent = '';
  S.qs.forEach((_, k) => pal.append(h('button', {
    type: 'button', 'aria-label': `Soru ${k + 1}`,
    class: 'pb' + (S.answers[k] != null ? ' ans' : '') + (S.flags[k] ? ' flag' : '') + (k === i ? ' cur' : ''),
    onclick: () => go(k),
  }, k + 1)));
  const done = S.answers.filter(a => a != null).length;
  $('#pal-stat').textContent = `${done} / ${S.qs.length} cevaplı`;
  $('#pal-progress').style.width = `${(done / S.qs.length) * 100}%`;
}

const busy = () => submitting || !S;
function go(k) { if (busy() || k < 0 || k >= S.qs.length) return; S.idx = k; persist(); render(); window.scrollTo(0, 0); }
function choose(k) { if (busy()) return; S.answers[S.idx] = S.answers[S.idx] === k ? null : k; persist(); render(); }
function clearAns() { if (busy()) return; S.answers[S.idx] = null; persist(); render(); }
function toggleFlag() { if (busy()) return; S.flags[S.idx] = !S.flags[S.idx]; persist(); render(); }

async function askFinish() {
  if (busy()) return;
  const blank = S.answers.filter(a => a == null).length, fl = S.flags.filter(Boolean).length;
  if (await confirmDlg('Sınavı bitir?', `${blank} soru boş, ${fl} soru işaretli. Bitirdikten sonra sorulara dönemezsin.`, 'Sınavı bitir')) finish();
}

/* ---------- Teslim ---------- */
function overlay(state, msg = '') {
  const o = $('#submitting');
  o.classList.toggle('hidden', state === 'off');
  $('#sub-spin').classList.toggle('hidden', state !== 'busy');
  $('#sub-retry').classList.toggle('hidden', state !== 'error');
  $('#sub-title').textContent = state === 'error' ? 'Sınav gönderilemedi' : 'Sınavın değerlendiriliyor…';
  $('#sub-msg').textContent = msg || 'Cevapların sunucuya gönderiliyor.';
}

async function finish() {
  if (submitting || !S) return;
  submitting = true;
  clearInterval(timerId);
  S.finishedAt = S.finishedAt || Math.min(Date.now(), endsAt(S));
  persist();
  overlay('busy');
  try {
    // Giriş yapılmışsa (ör. yönetim panelinden) sonuç hesaba da kaydedilir; auth yalnızca burada yüklenir.
    const idToken = await import('../services/auth.js').then(m => m.getIdToken()).catch(() => null);
    const res = await submitExam(S.token, S.answers, S.field, idToken);
    const full = mergeTest(S.test, { answers: res.answers, explanations: res.explanations || [] });
    const qs = buildQuestions(full);
    const sc = computeScore(qs, S.answers, S.field);
    const att = {
      id: 'a' + Date.now().toString(36), testId: S.testId, testName: S.testName, field: S.field,
      startedAt: S.startedAt, finishedAt: S.finishedAt, answers: S.answers, flags: S.flags,
      total: sc.total, temel: sc.temel, alan: sc.alan, per: sc.per,
    };
    if (!saveAttempt(att, full)) toast('Tarayıcı depolama alanı dolu; sonuç geçmişe kaydedilemedi.', 'error');
    else if (res.savedToAccount) toast('Sonucun hesabına da kaydedildi (Yönetim › Sonuçlarım).');
    discardSession();
    S = null;
    protect(false);
    overlay('off');
    openAttempt(att, full);
  } catch (e) {
    console.error(e);
    const fatal = e.status === 401 || e.status === 404 || e.status === 410 || e.status === 400;
    overlay('error', fatal ? `${e.message} Bu sınav oturumu değerlendirilemiyor.` : `${e.message} Cevapların bu cihazda kayıtlı; tekrar deneyebilirsin.`);
    if (fatal) {
      const btn = $('#sub-retry');
      btn.textContent = 'Ana sayfaya dön';
      btn.onclick = () => { discardSession(); S = null; protect(false); overlay('off'); location.reload(); };
    }
  } finally {
    submitting = false;
  }
}

export function bindExamEvents() {
  $('#btn-prev').addEventListener('click', () => go(S.idx - 1));
  $('#btn-next').addEventListener('click', () => go(S.idx + 1));
  $('#btn-flag').addEventListener('click', toggleFlag);
  $('#btn-clear').addEventListener('click', clearAns);
  $('#btn-finish').addEventListener('click', askFinish);
  $('#sub-retry').onclick = () => finish();
  document.addEventListener('keydown', e => {
    if (!S || submitting || $('#view-exam').classList.contains('hidden') || $('#dlg').open || /input|textarea|select/i.test(e.target.tagName)) return;
    if (copyProtection && (e.ctrlKey || e.metaKey) && ['c', 'x', 'p', 's', 'a'].includes(e.key.toLowerCase())) { e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowright') go(S.idx + 1);
    else if (k === 'arrowleft') go(S.idx - 1);
    else if (k === 'f') toggleFlag();
    else if (k === ' ') { e.preventDefault(); clearAns(); }
    else if (k.length === 1 && 'abcde'.includes(k)) choose('abcde'.indexOf(k));
    else if (k.length === 1 && '12345'.includes(k)) choose(Number(k) - 1);
  });
}
