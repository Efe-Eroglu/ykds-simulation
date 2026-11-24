/* Tema: görünüm modu (açık / koyu / sistem) + vurgu rengi. Tercihler localStorage'da. */
import { icon } from './icons.js';

const KEY = 'ykds_theme';
const ACCENT_KEY = 'ykds_accent';
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

/** Vurgu renkleri. `color` tarayıcı çubuğu (meta theme-color) ve önizleme içindir; asıl tokenlar base.css'te. */
export const ACCENTS = [
  { id: 'indigo', name: 'Çivit', color: '#4f46e5', swatch: 'linear-gradient(135deg,#6366f1,#8b5cf6 55%,#d946ef)' },
  { id: 'ocean', name: 'Okyanus', color: '#0284c7', swatch: 'linear-gradient(135deg,#0ea5e9,#06b6d4 55%,#6366f1)' },
  { id: 'emerald', name: 'Zümrüt', color: '#059669', swatch: 'linear-gradient(135deg,#10b981,#14b8a6 55%,#0ea5e9)' },
  { id: 'sunset', name: 'Gün batımı', color: '#ea580c', swatch: 'linear-gradient(135deg,#f97316,#f43f5e 55%,#ec4899)' },
  { id: 'rose', name: 'Gül', color: '#db2777', swatch: 'linear-gradient(135deg,#ec4899,#d946ef 55%,#8b5cf6)' },
];
const ACCENT_IDS = new Set(ACCENTS.map(a => a.id));

export function getThemePref() {
  try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; }
}
export const effectiveTheme = () => { const p = getThemePref(); return p === 'system' ? (mq.matches ? 'dark' : 'light') : p; };

export function getAccent() {
  try { const a = localStorage.getItem(ACCENT_KEY); return ACCENT_IDS.has(a) ? a : 'indigo'; } catch { return 'indigo'; }
}

function paintMeta() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = ACCENTS.find(a => a.id === getAccent()).color;
}

/** Tema değişirken her şeyin aynı anda yumuşakça geçmesi için kısa süreli sınıf. */
function withTransition(fn) {
  const root = document.documentElement;
  root.classList.add('theme-anim');
  fn();
  clearTimeout(withTransition.t);
  withTransition.t = setTimeout(() => root.classList.remove('theme-anim'), 450);
}

export function setThemePref(pref) {
  withTransition(() => {
    try { pref === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, pref); } catch { /* */ }
    if (pref === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', pref);
  });
  listeners.forEach(fn => fn());
}

export function setAccent(id) {
  if (!ACCENT_IDS.has(id)) return;
  withTransition(() => {
    try { id === 'indigo' ? localStorage.removeItem(ACCENT_KEY) : localStorage.setItem(ACCENT_KEY, id); } catch { /* */ }
    if (id === 'indigo') document.documentElement.removeAttribute('data-accent');
    else document.documentElement.setAttribute('data-accent', id);
  });
  paintMeta();
  listeners.forEach(fn => fn());
}

export const toggleTheme = () => setThemePref(effectiveTheme() === 'dark' ? 'light' : 'dark');
export const onThemeChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
mq.addEventListener('change', () => { if (getThemePref() === 'system') listeners.forEach(fn => fn()); });
paintMeta();

/* ---------- Tema seçici açılır paneli ---------- */
let panel = null;
let openFor = null;

function buildPanel() {
  const p = document.createElement('div');
  p.className = 'theme-pop';
  p.setAttribute('role', 'dialog');
  p.setAttribute('aria-label', 'Tema seçenekleri');
  p.hidden = true;

  const modes = document.createElement('div');
  modes.className = 'tp-modes';
  [['light', 'Açık', 'sun'], ['dark', 'Koyu', 'moon'], ['system', 'Sistem', 'monitor']].forEach(([k, l, ic]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.mode = k;
    b.append(icon(ic, 15), document.createTextNode(l));
    b.addEventListener('click', () => setThemePref(k));
    modes.append(b);
  });

  const sw = document.createElement('div');
  sw.className = 'tp-swatches';
  ACCENTS.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.accent = a.id;
    b.title = a.name; b.setAttribute('aria-label', a.name + ' rengi');
    const dot = document.createElement('i');
    dot.style.background = a.swatch;
    const name = document.createElement('span');
    name.textContent = a.name;
    b.append(dot, name);
    b.addEventListener('click', () => setAccent(a.id));
    sw.append(b);
  });

  const t1 = document.createElement('div'); t1.className = 'tp-title'; t1.textContent = 'Görünüm';
  const t2 = document.createElement('div'); t2.className = 'tp-title'; t2.textContent = 'Renk teması';
  p.append(t1, modes, t2, sw);

  const paint = () => {
    const pref = getThemePref(), acc = getAccent();
    modes.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === pref)));
    sw.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.accent === acc)));
  };
  onThemeChange(paint); paint();

  document.addEventListener('pointerdown', e => {
    if (!p.hidden && !p.contains(e.target) && !openFor?.contains(e.target)) closePanel();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !p.hidden) { closePanel(); openFor?.focus(); } });
  window.addEventListener('resize', () => { if (!p.hidden) place(); });
  window.addEventListener('scroll', () => { if (!p.hidden) place(); }, { passive: true });
  document.body.append(p);
  return p;
}

function place() {
  const r = openFor.getBoundingClientRect();
  const w = panel.offsetWidth;
  const left = Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w));
  panel.style.left = left + 'px';
  panel.style.top = (r.bottom + 8) + 'px';
}

function closePanel() {
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  openFor?.setAttribute('aria-expanded', 'false');
}

function openPanel(btn) {
  panel ??= buildPanel();
  if (!panel.hidden && openFor === btn) { closePanel(); return; }
  openFor?.setAttribute('aria-expanded', 'false');
  openFor = btn;
  panel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  place();
  panel.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
}

/** Bir butonu tema seçici yapar: tıklayınca mod + renk paneli açılır. */
export function mountThemeToggle(btn) {
  btn.replaceChildren(icon('palette'));
  btn.setAttribute('aria-label', 'Tema ve renk seçenekleri');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Tema';
  btn.addEventListener('click', () => openPanel(btn));
}
