export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** Küçük DOM yardımcısı: h('div', {class:'x', onclick}, ...çocuklar). Metinler her zaman textContent olarak eklenir. */
export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}

export function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (kind ? ' ' + kind : '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.add('hidden'), 3000);
}

export function confirmDlg(title, body, okLabel = 'Evet') {
  return new Promise(res => {
    const d = $('#dlg');
    $('#dlg-title').textContent = title; $('#dlg-body').textContent = body; $('#dlg-ok').textContent = okLabel;
    const ok = $('#dlg-ok'), no = $('#dlg-cancel');
    const done = v => { ok.onclick = no.onclick = d.onclose = null; if (d.open) d.close(); res(v); };
    ok.onclick = e => { e.preventDefault(); done(true); };
    no.onclick = e => { e.preventDefault(); done(false); };
    d.onclose = () => done(false);
    d.showModal();
  });
}

/** ``` ile çevrili bölümleri <pre> olarak gösterir (güvenli: sadece textContent). */
export function renderRich(el, text) {
  el.textContent = '';
  String(text).split('```').forEach((part, i) => {
    if (i % 2) el.append(h('pre', {}, part.replace(/^\w*\n/, '').replace(/\n$/, '')));
    else if (part) el.append(document.createTextNode(part));
  });
}

export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fmtDate = ms => new Date(ms).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtDateTime = ms => new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const f2 = n => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function slugify(s) {
  return String(s).toLowerCase()
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'deneme';
}
