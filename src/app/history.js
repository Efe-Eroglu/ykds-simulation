import { MODULES, modById } from '../core/exam-config.js';
import { buildQuestions, statusOf, totals } from '../core/scoring.js';
import { $, h, toast, confirmDlg, f2, fmtDateTime } from '../ui/dom.js';
import { getAttempts, deleteAttempt, getTestCopy, getLocalTestCopy } from './attempts.js';
import { openAttempt, reviewItem } from './result.js';
import { getBookmarks } from './bookmarks.js';

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
        h('small', {}, `Doğru ${t.r} · Yanlış ${t.w} · Boş ${t.b} · Süre ${Math.round((a.finishedAt - a.startedAt) / 60000)} dk`)),
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
  items.slice(0, 100).forEach(x => box.append(reviewItem(x.q, x.a, statusOf(x.q, x.a), `${x.att.testName} · Soru ${x.i + 1}`, false, { testId: x.att.testId, testName: x.att.testName, i: x.i })));
  if (items.length > 100) box.append(h('p', { class: 'muted' }, `İlk 100 soru gösteriliyor (${items.length} soru var). Modül filtresiyle daraltabilirsin.`));
}

/** Kaydedilen sorular (en yeni kayıt üstte). */
export function renderSaved() {
  const mod = $('#saved-mod').value;
  const all = getBookmarks().slice().sort((a, b) => b.savedAt - a.savedAt);
  const items = all.filter(b => !mod || b.q.mod === mod);
  const box = $('#saved-list'); box.textContent = '';
  $('#saved-count').textContent = all.length ? `${all.length} soru` : '';
  if (!all.length) {
    box.append(h('div', { class: 'empty' },
      h('b', {}, 'Henüz kaydettiğin soru yok'),
      h('span', { class: 'muted' }, 'Sonuçlarını incelerken bir sorunun yanındaki "Kaydet" düğmesine bastığında burada listelenir.')));
    return;
  }
  if (!items.length) { box.append(h('p', { class: 'muted' }, 'Bu modülde kaydettiğin soru yok.')); return; }
  items.forEach(b => box.append(reviewItem(b.q, b.a, statusOf(b.q, b.a), `${b.testName} · Soru ${b.i + 1}`, false,
    { testId: b.key.slice(0, b.key.lastIndexOf(':')), testName: b.testName, i: b.i },
    on => { if (!on) renderSaved(); })));
}

const modOptions = () => [h('option', { value: '' }, 'Tüm modüller'), ...MODULES.map(m => h('option', { value: m.id }, m.name))];

export function bindHistoryEvents() {
  $('#wrong-mod').append(...modOptions());
  $('#saved-mod').append(...modOptions());
  $('#wrong-filter').addEventListener('change', renderWrong);
  $('#wrong-mod').addEventListener('change', renderWrong);
  $('#saved-mod').addEventListener('change', renderSaved);
}
