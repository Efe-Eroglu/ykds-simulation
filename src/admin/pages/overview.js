import { h, f2 } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { state, totals } from '../state.js';
import { pageHead, kpi, btn, statusPill, relTime } from '../ui.js';

function greeting() {
  const hr = new Date().getHours();
  return hr < 6 ? 'İyi geceler' : hr < 12 ? 'Günaydın' : hr < 18 ? 'İyi günler' : 'İyi akşamlar';
}

function statusItem(iconName, title, sub, pill) {
  return h('div', { class: 'status-item' }, h('span', { class: 'si-ic' }, icon(iconName, 16)), h('div', {}, h('b', {}, title), h('small', {}, sub)), pill);
}

export function renderOverview(el) {
  const t = totals();
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const top = state.tests
    .map(x => ({ ...x, s: state.stats[x.id] || { attempts: 0, avg: 0 } }))
    .sort((a, b) => b.s.attempts - a.s.attempts)
    .slice(0, 6);
  const maxAtt = Math.max(1, ...top.map(x => x.s.attempts));

  const perf = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Deneme performansı'), h('p', {}, 'Çözülme sayısına göre en popüler denemeler')),
      btn('Tümü', { href: '#/tests', small: true, kind: 'ghost' })),
    top.length && top.some(x => x.s.attempts)
      ? h('div', { class: 'hbars' }, top.map(x => h('div', { class: 'hbar' },
        h('span', { class: 'hbar-name', title: x.name }, x.name),
        h('span', { class: 'hbar-track' }, h('i', { style: `width:${(x.s.attempts / maxAtt) * 100}%` })),
        h('span', { class: 'hbar-val' }, x.s.attempts))))
      : h('div', { class: 'empty' }, icon('chart', 22), h('b', {}, 'Henüz çözüm yok'), h('span', {}, 'Öğrenciler sınav bitirdikçe istatistikler burada görünür.')));

  const hc = state.health;
  const apiOk = hc && hc.serviceAccount && hc.tokenSecret;
  const s = state.settings;
  const sys = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('div', {}, h('h3', {}, 'Sistem durumu'), h('p', {}, 'Altyapı ve güvenlik ayarları'))),
    h('div', { class: 'status-list' },
      statusItem('database', 'Veritabanı', 'Firestore bağlantısı', h('span', { class: 'pill on' }, 'Çalışıyor')),
      statusItem('server', 'Sınav API', hc === null ? 'Ulaşılamıyor' : apiOk ? 'Puanlama sunucusu hazır' : 'Ortam değişkenleri eksik',
        h('span', { class: 'pill ' + (apiOk ? 'on' : 'err') }, apiOk ? 'Hazır' : 'Sorun')),
      statusItem('shield', 'Kopya koruması', 'Cevap anahtarı sunucuda, kopyalama engeli ' + (s?.copyProtection ? 'açık' : 'kapalı'),
        h('span', { class: 'pill ' + (s?.copyProtection ? 'on' : 'off') }, s?.copyProtection ? 'Açık' : 'Kısmi')),
      statusItem('wrench', 'Bakım modu', s?.maintenance.enabled ? 'Yeni sınav başlatma kapalı' : 'Site herkese açık',
        h('span', { class: 'pill ' + (s?.maintenance.enabled ? 'off' : 'on') }, s?.maintenance.enabled ? 'Açık' : 'Kapalı'))));

  const recent = state.tests.slice(0, 5);
  const table = h('div', { class: 'card table-card' },
    h('div', { class: 'toolbar' }, h('h3', { style: 'margin:0;flex:1' }, 'Son eklenen denemeler'), btn('Yeni deneme', { href: '#/tests/new', small: true, kind: 'primary', iconName: 'plus' })),
    recent.length
      ? h('div', { class: 'table-scroll' }, h('table', { class: 'dtable' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Deneme'), h('th', {}, 'Durum'), h('th', { class: 'num' }, 'Çözüm'), h('th', { class: 'num hide-sm' }, 'Ort. puan'), h('th', { class: 'hide-sm' }, 'Eklendi'))),
        h('tbody', {}, recent.map(x => {
          const st = state.stats[x.id];
          return h('tr', {},
            h('td', { class: 't-name' }, h('a', { href: `#/tests/${x.id}`, style: 'color:inherit;text-decoration:none' }, h('b', {}, x.name)), h('small', {}, x.author || '—')),
            h('td', {}, statusPill(x.published)),
            h('td', { class: 'num' }, st ? st.attempts : 0),
            h('td', { class: 'num hide-sm' }, st && st.attempts ? f2(st.avg) : '—'),
            h('td', { class: 'hide-sm muted' }, relTime(x.createdAt)));
        }))))
      : h('div', { class: 'empty' }, h('b', {}, 'Henüz deneme yok'), h('span', {}, 'İlk denemeni ekleyerek başla.'), btn('Yeni deneme', { href: '#/tests/new', kind: 'primary', small: true, iconName: 'plus' })));

  el.replaceChildren(
    pageHead(`${greeting()} 👋`, `${today} · Platformun genel durumu`,
      btn('Siteyi aç', { href: '/', iconName: 'external' }),
      btn('Yeni deneme', { href: '#/tests/new', kind: 'primary', iconName: 'plus' })),
    h('div', { class: 'kpis' },
      kpi('Toplam deneme', t.total, `${t.questions.toLocaleString('tr-TR')} soru · ${t.published} yayında · ${t.drafts} taslak`, 'file', 'c1'),
      kpi('Yayındaki deneme', t.published, t.total ? `%${Math.round((t.published / t.total) * 100)} oranında` : 'Henüz yok', 'eye', 'c2'),
      kpi('Toplam çözüm', t.attempts.toLocaleString('tr-TR'), 'Tamamlanan sınav sayısı', 'users', 'c3'),
      kpi('Ortalama puan', t.attempts ? f2(t.avg) : '—', '100 üzerinden ağırlıklı puan', 'trophy', 'c4')),
    h('div', { class: 'grid-2' }, perf, sys),
    table);
}
