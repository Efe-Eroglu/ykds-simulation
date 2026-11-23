/* Sonuçlarım — yalnızca giriş yapan yöneticinin kendi çözdüğü sınavlar (başkalarının sonuçları görünmez). */
import { h, f2, toast, confirmDlg, fmtDateTime } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { modById } from '../../core/exam-config.js';
import { totals } from '../../core/scoring.js';
import { listMyAttempts, deleteMyAttempt, errorMessage } from '../../services/tests.js';
import { state } from '../state.js';
import { pageHead, kpi, btn, iconBtn } from '../ui.js';

const head = () => pageHead('Sonuçlarım', 'Sitede bu hesapla giriş yapmışken çözdüğün sınavlar. Yalnızca sen görebilirsin.',
  btn('Sınav çöz', { href: '/', iconName: 'external' }));

export async function renderResults(el) {
  el.replaceChildren(head(), h('div', { class: 'card' }, h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' })));
  let atts;
  try {
    atts = await listMyAttempts(state.user.uid);
  } catch (e) {
    el.replaceChildren(head(), h('div', { class: 'card' }, h('div', { class: 'empty error' },
      h('b', {}, 'Sonuçlar yüklenemedi'), h('span', {}, errorMessage(e)),
      btn('Tekrar dene', { small: true, onclick: () => renderResults(el) }))));
    return;
  }

  if (!atts.length) {
    el.replaceChildren(head(), h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('trophy', 22),
      h('b', {}, 'Henüz kayıtlı sonucun yok'),
      h('span', {}, 'Bu panelde giriş yapmışken aynı tarayıcıda siteden bir sınav bitirdiğinde sonucu burada görünür.'),
      btn('Siteyi aç', { href: '/', kind: 'primary', small: true, iconName: 'external' }))));
    return;
  }

  const scores = atts.map(a => a.total);
  const remove = async a => {
    if (!(await confirmDlg('Sonucu sil', `"${a.testName}" sonucu kalıcı olarak silinecek.`, 'Sil'))) return;
    try { await deleteMyAttempt(state.user.uid, a.id); toast('Sonuç silindi.'); renderResults(el); } catch (e) { toast('Silinemedi: ' + errorMessage(e), 'error'); }
  };

  el.replaceChildren(head(),
    h('div', { class: 'kpis' },
      kpi('Çözülen sınav', atts.length, `${new Set(atts.map(a => a.testId)).size} farklı deneme`, 'file', 'c1'),
      kpi('Ortalama puan', f2(scores.reduce((s, x) => s + x, 0) / scores.length), '100 üzerinden', 'chart', 'c2'),
      kpi('En yüksek', f2(Math.max(...scores)), 'Tüm sınavların içinde', 'trophy', 'c3'),
      kpi('Son sınav', f2(atts[0].total), fmtDateTime(atts[0].finishedAt), 'clock', 'c4')),
    h('div', { class: 'card table-card' },
      h('div', { class: 'toolbar' }, h('h3', { style: 'margin:0;flex:1' }, 'Çözdüğüm sınavlar')),
      h('div', { class: 'table-scroll' }, h('table', { class: 'dtable' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Deneme'), h('th', { class: 'hide-sm' }, 'Alan'), h('th', { class: 'num' }, 'D / Y / B'),
          h('th', { class: 'num hide-sm' }, 'Süre'), h('th', { class: 'num' }, 'Puan'), h('th', {}, ''))),
        h('tbody', {}, atts.map(a => {
          const t = totals(a.per);
          return h('tr', {},
            h('td', { class: 't-name' }, h('b', {}, a.testName), h('small', {}, fmtDateTime(a.finishedAt))),
            h('td', { class: 'hide-sm' }, modById[a.field]?.name || a.field),
            h('td', { class: 'num' }, `${t.r} / ${t.w} / ${t.b}`),
            h('td', { class: 'num hide-sm' }, `${Math.round((a.finishedAt - a.startedAt) / 60000)} dk`),
            h('td', { class: 'num' }, h('b', {}, f2(a.total))),
            h('td', { class: 'num' }, iconBtn('trash', 'Sonucu sil', () => remove(a), 'danger-text')));
        }))))));
}
