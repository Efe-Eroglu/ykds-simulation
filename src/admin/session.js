/* Hareketsizlikte otomatik çıkış (paylaşılan bilgisayarlarda oturumun açık kalmasını önler). */
import { store } from '../lib/store.js';

const KEY = 'ykds_admin_idle';
export const IDLE_OPTIONS = [[15, '15 dakika'], [30, '30 dakika'], [60, '1 saat'], [240, '4 saat'], [0, 'Kapalı']];
export const getIdleMinutes = () => { const v = store.get(KEY, 30); return Number.isFinite(v) ? v : 30; };
export const setIdleMinutes = m => store.set(KEY, m);

let last = Date.now(), timer = null;
const bump = () => { last = Date.now(); };
const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'visibilitychange'];

export function startIdleWatch(onTimeout) {
  stopIdleWatch();
  last = Date.now();
  EVENTS.forEach(e => window.addEventListener(e, bump, { passive: true }));
  timer = setInterval(() => {
    const m = getIdleMinutes();
    if (m > 0 && Date.now() - last > m * 60000) { stopIdleWatch(); onTimeout(); }
  }, 20000);
}

export function stopIdleWatch() {
  clearInterval(timer); timer = null;
  EVENTS.forEach(e => window.removeEventListener(e, bump));
}
