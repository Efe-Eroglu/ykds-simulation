import { h, toast, confirmDlg, download, f2, slugify, fmtDateTime } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { MODULES, FIELDS, modById } from '../../core/exam-config.js';
import { buildQuestions } from '../../core/scoring.js';
import { getFullTest, setPublished, deleteTest, errorMessage } from '../../services/tests.js';
import { state, refreshTests } from '../state.js';
import { pageHead, btn, iconBtn, statusPill, relTime, openDrawer } from '../ui.js';

const view = { q: '', filter: 'all' };

function filtered() {
  const q = view.q.trim().toLocaleLowerCase('tr');
  return state.tests.filter(t =>
    (view.filter === 'all' || (view.filter === 'pub' ? t.published : !t.published))
    && (!q || t.name.toLocaleLowerCase('tr').includes(q) || t.author.toLocaleLowerCase('tr').includes(q)));
}

async function togglePublish(t) {
  try {
    await setPublished(t.id, !t.published);
    toast(t.published ? 'Yayından kaldırıldı' : 'Yayınlandı', 'success');
    await refreshTests();
  } catch (e) { toast(errorMessage(e), 'error'); }
}

async function exportTest(t) {
  try {
    const full = await getFullTest(t.id);
    download(slugify(t.name) + '.json', JSON.stringify({ name: t.name, author: t.author, ...full }, null, 2));
  } catch (e) { toast(errorMessage(e), 'error'); }
}

async function removeTest(t) {
  if (!(await confirmDlg('Denemeyi sil', `"${t.name}" ve cevap anahtarı kalıcı olarak silinecek. Bu işlem geri alınamaz.`, 'Kalıcı olarak sil'))) return;
  try { await deleteTest(t.id); toast('Deneme silindi', 'success'); await refreshTests(); } catch (e) { toast(errorMessage(e), 'error'); }
}

/** İstatistik yan paneli: genel sayılar, alan dağılımı, en zor sorular. */
async function showStats(t) {
  const s = state.stats[t.id] || { attempts: 0, avg: 0, fields: {}, right: {}, lastAt: null };
  const head = h('div', { class: 'stat-grid' },
    h('div', { class: 'stat' }, h('b', {}, s.attempts), h('span', {}, 'Çözüm')),
    h('div', { class: 'stat' }, h('b', {}, s.attempts ? f2(s.avg) : '—'), h('span', {}, 'Ortalama')),
    h('div', { class: 'stat' }, h('b', {}, relTime(s.lastAt)), h('span', {}, 'Son çözüm')));
  if (!s.attempts) {
    openDrawer(t.name, head, h('div', { class: 'empty' }, icon('chart', 22), h('b', {}, 'Henüz çözüm yok'), h('span', {}, 'Bu deneme çözüldükçe soru bazlı istatistikler burada görünür.')));
    return;
  }
  const fieldBox = h('div', {}, h('h3', {}, 'Alan dağılımı'), h('div', { class: 'hbars' }, FIELDS.map(f => {
    const n = s.fields[f.id] || 0;
    return h('div', { class: 'hbar' }, h('span', { class: 'hbar-name' }, f.name), h('span', { class: 'hbar-track' }, h('i', { style: `width:${(n / s.attempts) * 100}%` })), h('span', { class: 'hbar-val' }, n));
  })));
  const diffBox = h('div', {}, h('h3', {}, 'En zor 10 soru'), h('p', { class: 'muted small', style: 'margin:0 0 10px' }, 'Doğru cevaplanma oranı en düşük sorular'), h('div', { class: 'skeleton' }));
  openDrawer(t.name, head, fieldBox, diffBox);

  let qs = null;
  try { qs = buildQuestions(await getFullTest(t.id)); } catch { /* metinsiz göster */ }
  const rows = Array.from({ length: 80 }, (_, i) => ({ i, rate: (s.right[i] || 0) / s.attempts }))
    .sort((a, b) => a.rate - b.rate).slice(0, 10);
  diffBox.lastChild.replaceWith(h('div', { class: 'q-diff' }, rows.map(r => h('div', { class: 'q-diff-row', title: qs ? qs[r.i].question.slice(0, 200) : '' },
    h('b', {}, `S${r.i + 1}`),
    h('div', {}, h('div', { class: 'hbar-track' }, h('i', { style: `width:${Math.max(2, r.rate * 100)}%` })),
      h('small', { class: 'muted' }, qs ? modById[qs[r.i].mod].name : '')),
    h('span', { class: 'num' }, `%${Math.round(r.rate * 100)}`)))));
}

function renderTable(box, foot) {
  const list = filtered();
  if (!state.tests.length) {
    box.replaceChildren(h('div', { class: 'empty' }, icon('file', 24), h('b', {}, 'Henüz deneme yok'), h('span', {}, 'JSON dosyası yükleyerek ilk denemeni ekle.'),
      btn('Yeni deneme', { href: '#/tests/new', kind: 'primary', small: true, iconName: 'plus' })));
    foot.textContent = '';
    return;
  }
  if (!list.length) {
    box.replaceChildren(h('div', { class: 'empty' }, icon('search', 22), h('b', {}, 'Sonuç bulunamadı'), h('span', {}, 'Aramayı veya filtreyi değiştir.')));
    foot.textContent = '';
    return;
  }
  box.replaceChildren(h('table', { class: 'dtable' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Deneme'), h('th', {}, 'Durum'), h('th', { class: 'num' }, 'Çözüm'), h('th', { class: 'num hide-sm' }, 'Ort. puan'),
      h('th', { class: 'hide-sm' }, 'Güncellendi'), h('th', { class: 'num' }, ''))),
    h('tbody', {}, list.map(t => {
      const st = state.stats[t.id];
      return h('tr', {},
        h('td', { class: 't-name' }, h('b', {}, t.name), h('small', {}, `${t.author || 'Hazırlayan yok'} · ${t.questionCount} soru`)),
        h('td', {}, statusPill(t.published)),
        h('td', { class: 'num' }, st ? st.attempts : 0),
        h('td', { class: 'num hide-sm' }, st && st.attempts ? f2(st.avg) : '—'),
        h('td', { class: 'hide-sm muted', title: fmtDateTime(t.updatedAt) }, relTime(t.updatedAt)),
        h('td', {}, h('div', { class: 'actions' },
          iconBtn('chart', 'İstatistikler', () => showStats(t)),
          iconBtn(t.published ? 'eyeOff' : 'eye', t.published ? 'Yayından kaldır' : 'Yayınla', () => togglePublish(t)),
          iconBtn('edit', 'Düzenle', () => { location.hash = `#/tests/${t.id}`; }),
          iconBtn('download', 'JSON indir', () => exportTest(t)),
          iconBtn('trash', 'Sil', () => removeTest(t), 'danger-text'))));
    }))));
  foot.textContent = `${list.length} / ${state.tests.length} deneme gösteriliyor`;
}

export function renderTests(el) {
  const box = h('div', { class: 'table-scroll' });
  const foot = h('div', { class: 'table-foot' });
  const search = h('input', { type: 'search', placeholder: 'Deneme veya hazırlayan ara…', value: view.q, 'aria-label': 'Ara' });
  search.addEventListener('input', () => { view.q = search.value; renderTable(box, foot); });
  const seg = h('div', { class: 'seg' }, [['all', 'Tümü'], ['pub', 'Yayında'], ['draft', 'Taslak']].map(([k, l]) => h('button', {
    type: 'button', class: view.filter === k ? 'active' : '',
    onclick: e => { view.filter = k; [...seg.children].forEach(b => b.classList.toggle('active', b === e.currentTarget)); renderTable(box, foot); },
  }, l)));

  el.replaceChildren(
    pageHead('Denemeler', `${state.tests.length} deneme · ${MODULES.length} modül · 80 soru`,
      btn('Yenile', { iconName: 'refresh', onclick: async () => { await refreshTests(); toast('Liste güncellendi'); } }),
      btn('Yeni deneme', { href: '#/tests/new', kind: 'primary', iconName: 'plus' })),
    h('div', { class: 'card table-card' },
      h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search', 16), search), seg),
      box, foot));
  renderTable(box, foot);
}
