/* Sınav ayarları: soru yazı boyutu. Tercih localStorage'da, --q-scale CSS değişkeniyle uygulanır. */
import { icon } from './icons.js';

const KEY = 'ykds_qscale';
export const SIZES = [
  { v: 0.9, label: 'Küçük' },
  { v: 1, label: 'Normal' },
  { v: 1.12, label: 'Orta' },
  { v: 1.25, label: 'Büyük' },
  { v: 1.4, label: 'Çok büyük' },
];

export function getScale() {
  try { const s = Number(localStorage.getItem(KEY)); return SIZES.some(x => x.v === s) ? s : 1; } catch { return 1; }
}

function apply(s) {
  if (s === 1) document.documentElement.style.removeProperty('--q-scale');
  else document.documentElement.style.setProperty('--q-scale', String(s));
}

export function setScale(s) {
  try { s === 1 ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, String(s)); } catch { /* */ }
  apply(s);
}

apply(getScale());

let panel = null;
let openFor = null;

function buildPanel() {
  const p = document.createElement('div');
  p.className = 'theme-pop settings-pop';
  p.setAttribute('role', 'dialog');
  p.setAttribute('aria-label', 'Sınav ayarları');
  p.hidden = true;

  const t = document.createElement('div');
  t.className = 'tp-title'; t.textContent = 'Soru yazı boyutu';

  const row = document.createElement('div');
  row.className = 'tp-modes tp-sizes';
  SIZES.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.v = String(s.v);
    b.title = s.label; b.setAttribute('aria-label', 'Yazı boyutu: ' + s.label);
    const a = document.createElement('span');
    a.className = 'tp-a'; a.textContent = 'A';
    a.style.fontSize = (0.8 + i * 0.16) + 'rem';
    b.append(a);
    b.addEventListener('click', () => { setScale(s.v); paint(); });
    row.append(b);
  });

  const note = document.createElement('div');
  note.className = 'tp-note';

  const paint = () => {
    const cur = getScale();
    row.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === cur)));
    note.textContent = SIZES.find(x => x.v === cur).label + ' · %' + Math.round(cur * 100);
  };
  paint();

  p.append(t, row, note);
  document.addEventListener('pointerdown', e => {
    if (!p.hidden && !p.contains(e.target) && !openFor?.contains(e.target)) close();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !p.hidden) { close(); openFor?.focus(); } });
  window.addEventListener('resize', () => { if (!p.hidden) place(); });
  document.body.append(p);
  return p;
}

function place() {
  const r = openFor.getBoundingClientRect();
  const w = panel.offsetWidth;
  panel.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w)) + 'px';
  panel.style.top = (r.bottom + 8) + 'px';
}

function close() {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  openFor?.setAttribute('aria-expanded', 'false');
}

/** Bir butonu sınav ayarları butonu yapar. */
export function mountSettingsToggle(btn) {
  btn.replaceChildren(icon('settings'));
  btn.setAttribute('aria-label', 'Sınav ayarları');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Ayarlar';
  btn.addEventListener('click', () => {
    panel ??= buildPanel();
    if (!panel.hidden && openFor === btn) { close(); return; }
    openFor = btn;
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    place();
    panel.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
  });
}
