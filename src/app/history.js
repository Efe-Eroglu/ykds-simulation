import { MODULES, modById } from '../core/exam-config.js';
import { buildQuestions, statusOf, totals } from '../core/scoring.js';
import { $, h, toast, confirmDlg, f2, fmtDateTime } from '../ui/dom.js';
import { getAttempts, deleteAttempt, getTestCopy, getLocalTestCopy } from './attempts.js';
import { openAttempt, reviewItem } from './result.js';

export function renderHistory() {
  const atts = getAttempts().slice().sort((a, b) => b.finishedAt - a.finishedAt);
  const sum = $('#hist-summary'), list = $('#hist-list'), trend = $('#hist-trend');
  sum.textContent = ''; list.textContent = ''; trend.textContent = '';

  if (!atts.length) {
    list.append(h('div', { class: 'empty' },
      h('b', {}, 'Henüz çözülmüş sınav yok'),
      h('span', { class: 'muted' }, 'Bir sınavı bitirdiğinde puanın, alt test dağılımın ve yanlışların burada saklanır.')));
    $('#wrong-box').classList.add('hidden');
    trend.classList.add('hidden');
    return;
  }
  $('#wrong-box').classList.remove('hidden');
  trend.classList.toggle('hidden', atts.length < 2);

  const scores = atts.map(a => a.total);
  [[atts.length, 'Çözülen sınav'], [f2(scores.reduce((s, x) => s + x, 0) / scores.length), 'Ortalama'], [f2(Math.max(...scores)), 'En yüksek'], [f2(atts[0].total), 'Son sınav']]
    .forEach(([v, l]) => sum.append(h('div', { class: 'stat' }, h('b', {}, v), h('span', {}, l))));

  atts.slice(0, 15).reverse().forEach(a => trend.append(
    h('div', { class: 'bar', title: `${a.testName}: ${f2(a.total)}` }, h('i', { style: `height:${Math.max(3, a.total)}%` }), h('span', {}, Math.round(a.total)))));

  atts.forEach(a => {
    const t = totals(a.per);
    list.append(h('div', { class: 'hist-item' },
      h('div', { class: 'hi-main' },
        h('b', {}, a.testName),
        h('small', {}, `${fmtDateTime(a.finishedAt)} · Alan: ${modById[a.field]?.name || a.field}`),
        h('small', {}, `Doğru ${t.r} · Yanlış ${t.w} · Boş ${t.b}`)),
      h('div', { class: 'hi-score' }, f2(a.total)),
      h('div', { class: 'row' },
        h('button', {
          class: 'btn small primary', onclick: async () => {
            const test = await getTestCopy(a.testId);
            if (!test) { toast('Bu denemenin soruları artık mevcut değil.', 'error'); return; }
            openAttempt(a, test);
          },
        }, 'İncele'),
        h('button', {
          class: 'btn small ghost', onclick: async () => {
            if (!(await confirmDlg('Sonucu sil', `"${a.testName}" sonucu silinecek.`, 'Sil'))) return;
            deleteAttempt(a.id); renderHistory();
          },
        }, 'Sil'))));
  });
  renderWrong();
}

/** Her sorunun EN SON çözümündeki durumuna göre tekrar listesi. */
function renderWrong() {
  const filter = $('#wrong-filter').value, mod = $('#wrong-mod').value;
  const latest = new Map();
  getAttempts().slice().sort((a, b) => a.finishedAt - b.finishedAt).forEach(att => {
    const test = getLocalTestCopy(att.testId);
    if (!test) return;
    buildQuestions(test).forEach((q, i) => latest.set(att.testId + ':' + i, { q, a: att.answers[i], att, i }));
  });
  const items = [...latest.values()].filter(x => {
    const st = statusOf(x.q, x.a);
    return (filter === 'both' ? st !== 'right' : st === filter) && (!mod || x.q.mod === mod);
  });
  const box = $('#wrong-list'); box.textContent = '';
  $('#wrong-count').textContent = `${items.length} soru`;
  if (!items.length) { box.append(h('p', { class: 'muted' }, 'Bu filtrede soru yok.')); return; }
  items.slice(0, 100).forEach(x => box.append(reviewItem(x.q, x.a, statusOf(x.q, x.a), `${x.att.testName} · Soru ${x.i + 1}`, false)));
  if (items.length > 100) box.append(h('p', { class: 'muted' }, `İlk 100 soru gösteriliyor (${items.length} soru var). Modül filtresiyle daraltabilirsin.`));
}

export function bindHistoryEvents() {
  $('#wrong-mod').append(h('option', { value: '' }, 'Tüm modüller'), ...MODULES.map(m => h('option', { value: m.id }, m.name)));
  $('#wrong-filter').addEventListener('change', renderWrong);
  $('#wrong-mod').addEventListener('change', renderWrong);
}
