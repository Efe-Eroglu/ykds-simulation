import { $, h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';

/** Sayfa başlığı: başlık, açıklama, sağda eylemler. */
export function pageHead(title, desc, ...actions) {
  return h('div', { class: 'page-head' },
    h('div', {}, h('h1', {}, title), desc ? h('p', {}, desc) : null),
    actions.length ? h('div', { class: 'row' }, ...actions) : null);
}

export function iconBtn(name, label, onclick, extra = '') {
  return h('button', { type: 'button', class: `btn ghost icon-only small ${extra}`, 'aria-label': label, title: label, onclick }, icon(name, 16));
}

export function btn(label, { kind = '', iconName = null, onclick, href, small = false } = {}) {
  const cls = `btn ${kind}${small ? ' small' : ''}`;
  const kids = [iconName ? icon(iconName, 16) : null, label];
  return href ? h('a', { class: cls, href }, ...kids) : h('button', { type: 'button', class: cls, onclick }, ...kids);
}

export function kpi(label, value, sub, iconName, color) {
  return h('div', { class: 'card kpi' },
    h('div', { class: 'kpi-top' }, h('span', {}, label), h('span', { class: `kpi-ic ${color}` }, icon(iconName, 18))),
    h('b', {}, value),
    sub ? h('small', {}, sub) : null);
}

export function statusPill(published) {
  return h('span', { class: 'pill ' + (published ? 'on' : 'off') }, published ? 'Yayında' : 'Taslak');
}

export function switchEl(id, checked) {
  return h('label', { class: 'switch' }, h('input', { type: 'checkbox', id, checked: !!checked }), h('span', {}));
}

/* ---------- Yan panel ---------- */
export function openDrawer(title, ...content) {
  $('#drawer-title').textContent = title;
  $('#drawer-body').replaceChildren(...content);
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
  $('#drawer-backdrop').classList.add('open');
}
export function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
  $('#drawer-backdrop').classList.remove('open');
}

export const relTime = ms => {
  if (!ms) return '—';
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return 'az önce';
  if (d < 3600) return `${Math.floor(d / 60)} dk önce`;
  if (d < 86400) return `${Math.floor(d / 3600)} sa önce`;
  if (d < 86400 * 30) return `${Math.floor(d / 86400)} gün önce`;
  return new Date(ms).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
};
