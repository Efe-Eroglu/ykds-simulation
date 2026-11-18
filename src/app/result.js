import { MODULES, LETTERS, modById } from '../core/exam-config.js';
import { buildQuestions, computeScore, statusOf, coefOf, totals } from '../core/scoring.js';
import { $, $$, h, renderRich, f2 } from '../ui/dom.js';
import { show } from './view.js';

let R = null; // görüntülenen sonuç

const STATUS_LABEL = { right: 'Doğru', wrong: 'Yanlış', blank: 'Boş' };

export function reviewItem(q, a, st, title, flagged) {
  const qt = h('div', { class: 'rich' });
  renderRich(qt, q.question);
  return h('article', { class: 'ritem review' },
    h('div', { class: 'rhead' },
      h('b', {}, title),
      h('span', { class: 'tag' }, modById[q.mod].name),
      h('span', { class: 'st ' + st }, STATUS_LABEL[st]),
      flagged ? h('span', { class: 'tag' }, '⚑ İşaretli') : null),
    qt,
    h('div', { class: 'options' }, q.options.map((o, k) => h('div', {
      class: 'opt' + (LETTERS[k] === q.answer ? ' right' : '') + (a === k && LETTERS[k] !== q.answer ? ' wrongsel' : ''),
    }, h('span', { class: 'l' }, LETTERS[k]), h('span', { class: 't' }, o)))),
    q.explanation ? h('div', { class: 'expl' }, h('b', {}, 'Çözüm: '), q.explanation) : null);
}

export function openAttempt(att, test) {
  R = { qs: buildQuestions(test), answers: att.answers, flags: att.flags || [], field: att.field, testName: att.testName, startedAt: att.startedAt, finishedAt: att.finishedAt };
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
    box.append(reviewItem(q, a, st, `Soru ${i + 1}`, R.flags[i]));
  });
  if (!box.children.length) box.append(h('p', { class: 'muted' }, 'Bu filtrede soru yok.'));
}

export function bindResultEvents(onHome) {
  $$('#res-filter button').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.f)));
  $('#btn-home').addEventListener('click', () => { R = null; onHome(); });
}
