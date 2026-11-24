import { MODULES, LETTERS, modById } from '../core/exam-config.js';
import { buildQuestions, computeScore, statusOf, coefOf, totals } from '../core/scoring.js';
import { $, $$, h, renderRich, f2, toast } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { bookmarkKey, isBookmarked, toggleBookmark } from './bookmarks.js';
import { show } from './view.js';

let R = null; // görüntülenen sonuç

const STATUS_LABEL = { right: 'Doğru', wrong: 'Yanlış', blank: 'Boş' };

/** Kaydet düğmesi. bm: { testId, testName, i }; onChange(yeniDurum) isteğe bağlı. */
function bookmarkBtn(q, a, bm, onChange) {
  const key = bookmarkKey(bm.testId, bm.i);
  const btn = h('button', { type: 'button', class: 'btn small ghost bm-btn' });
  const paint = on => {
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.title = on ? 'Kaydedilenlerden çıkar' : 'Soruyu kaydet';
    btn.replaceChildren(icon('bookmark', 15), on ? 'Kaydedildi' : 'Kaydet');
  };
  paint(isBookmarked(key));
  btn.addEventListener('click', () => {
    const on = toggleBookmark({ key, testName: bm.testName, i: bm.i, q, a });
    if (on == null) { toast('Tarayıcı depolama alanı dolu; soru kaydedilemedi.', 'error'); return; }
    paint(on);
    toast(on ? 'Soru kaydedildi (Kaydettiklerim sekmesi).' : 'Soru kayıtlardan çıkarıldı.');
    onChange?.(on);
  });
  return btn;
}

export function reviewItem(q, a, st, title, flagged, bm = null, onBookmarkChange = null) {
  const qt = h('div', { class: 'rich' });
  renderRich(qt, q.question);
  return h('article', { class: 'ritem review' },
    h('div', { class: 'rhead' },
      h('b', {}, title),
      h('span', { class: 'tag' }, modById[q.mod]?.name || q.mod),
      h('span', { class: 'st ' + st }, STATUS_LABEL[st]),
      flagged ? h('span', { class: 'tag' }, '⚑ İşaretli') : null,
      bm ? bookmarkBtn(q, a, bm, onBookmarkChange) : null),
    qt,
    h('div', { class: 'options' }, q.options.map((o, k) => h('div', {
      class: 'opt' + (LETTERS[k] === q.answer ? ' right' : '') + (a === k && LETTERS[k] !== q.answer ? ' wrongsel' : ''),
    }, h('span', { class: 'l' }, LETTERS[k]), h('span', { class: 't' }, o)))),
    q.explanation ? h('div', { class: 'expl' }, h('b', {}, 'Çözüm: '), q.explanation) : null);
}

export function openAttempt(att, test) {
  R = { testId: att.testId, qs: buildQuestions(test), answers: att.answers, flags: att.flags || [], field: att.field, testName: att.testName, startedAt: att.startedAt, finishedAt: att.finishedAt };
  render();
}

function render() {
  const sc = computeScore(R.qs, R.answers, R.field);
  $('#res-title').textContent = R.testName;
  $('#res-total').textContent = f2(sc.total);
  const t = totals(sc.per);
  const used = Math.round((R.finishedAt - R.startedAt) / 60000);

  const grid = $('#res-grid'); grid.textContent = '';
  [[t.r, 'Doğru'], [t.w, 'Yanlış'], [t.b, 'Boş'], [f2(sc.temel), 'Ortak Temel'], [f2(sc.alan), 'Alan Testi'], [used + ' dk', 'Süre']]
    .forEach(([v, l]) => grid.append(h('div', { class: 'stat' }, h('b', {}, v), h('span', {}, l))));

  const tbl = $('#res-table'); tbl.textContent = '';
  tbl.append(
    h('thead', {}, h('tr', {}, h('th', {}, 'Alt test'), ...['D', 'Y', 'B', 'Katsayı', 'Puan'].map(x => h('th', { class: 'num' }, x)))),
    h('tbody', {}, MODULES.map(m => {
      const p = sc.per[m.id], coef = coefOf(m, R.field);
      return h('tr', { class: m.id === R.field ? 'own' : '' },
        h('td', {}, m.name, m.id === R.field ? h('span', { class: 'tag own-tag' }, 'Alanın') : null),
        h('td', { class: 'num' }, p.right), h('td', { class: 'num' }, p.wrong), h('td', { class: 'num' }, p.blank),
        h('td', { class: 'num' }, String(coef).replace('.', ',')), h('td', { class: 'num' }, f2(p.right * coef)));
    })));

  setFilter('all');
  show('result');
}

function setFilter(filter) {
  $$('#res-filter button').forEach(b => b.classList.toggle('active', b.dataset.f === filter));
  const box = $('#review'); box.textContent = '';
  R.qs.forEach((q, i) => {
    const a = R.answers[i], st = statusOf(q, a);
    if (filter !== 'all' && filter !== st) return;
    box.append(reviewItem(q, a, st, `Soru ${i + 1}`, R.flags[i], { testId: R.testId, testName: R.testName, i }));
  });
  if (!box.children.length) box.append(h('p', { class: 'muted' }, 'Bu filtrede soru yok.'));
}

export function bindResultEvents(onHome) {
  $$('#res-filter button').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.f)));
  $('#btn-home').addEventListener('click', () => { R = null; onHome(); });
}
