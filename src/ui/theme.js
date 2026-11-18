/* Açık / koyu / sistem teması. Tercih localStorage'da, varsayılan sistem ayarı. */
import { icon } from './icons.js';

const KEY = 'ykds_theme';
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set();

export function getThemePref() {
  try { const t = localStorage.getItem(KEY); return t === 'light' || t === 'dark' ? t : 'system'; } catch { return 'system'; }
}
export const effectiveTheme = () => { const p = getThemePref(); return p === 'system' ? (mq.matches ? 'dark' : 'light') : p; };

export function setThemePref(pref) {
  try { pref === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, pref); } catch { /* */ }
  if (pref === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', pref);
  listeners.forEach(fn => fn());
}
export const toggleTheme = () => setThemePref(effectiveTheme() === 'dark' ? 'light' : 'dark');
export const onThemeChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
mq.addEventListener('change', () => { if (getThemePref() === 'system') listeners.forEach(fn => fn()); });

/** Bir butonu tema değiştirici yapar (güneş/ay ikonu). */
export function mountThemeToggle(btn) {
  const paint = () => {
    const dark = effectiveTheme() === 'dark';
    btn.replaceChildren(icon(dark ? 'sun' : 'moon'));
    btn.setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
    btn.title = btn.getAttribute('aria-label');
  };
  btn.addEventListener('click', toggleTheme);
  onThemeChange(paint);
  paint();
}
