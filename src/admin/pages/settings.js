import { h, toast } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { getThemePref, setThemePref, onThemeChange } from '../../ui/theme.js';
import { saveSettings, getSettings, errorMessage } from '../../services/tests.js';
import { changePassword } from '../../services/auth.js';
import { state } from '../state.js';
import { pageHead, btn, switchEl } from '../ui.js';
import { IDLE_OPTIONS, getIdleMinutes, setIdleMinutes } from '../session.js';

let unTheme = null;

function section(id, iconName, title, desc, ...body) {
  return h('div', { class: 'card', id: 'set-' + id },
    h('h3', {}, icon(iconName, 18), title),
    desc ? h('p', {}, desc) : null,
    ...body);
}
function row(title, desc, control, extra = null) {
  return h('div', { class: 'setting-row' }, h('div', {}, h('b', {}, title), h('small', {}, desc), extra), control);
}

function pwStrength(p) {
  let s = 0;
  if (p.length >= 8) s++; if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
}

export function renderSettings(el) {
  const s = structuredClone(state.settings);

  /* --- Site --- */
  const annSw = switchEl('s-ann', s.announcement.enabled);
  const annText = h('textarea', { rows: '2', maxlength: '300', placeholder: 'Örn. Yeni deneme eklendi: Deneme 5 yayında!' });
  annText.value = s.announcement.text;
  const mntSw = switchEl('s-mnt', s.maintenance.enabled);
  const mntText = h('input', { type: 'text', maxlength: '300', placeholder: 'Örn. Sistem güncelleniyor, 18:00\'de tekrar açılacak.', value: s.maintenance.message });

  /* --- Sınav güvenliği --- */
  const copySw = switchEl('s-copy', s.copyProtection);
  const explSw = switchEl('s-expl', s.showExplanations);

  const saveBtns = [];
  const doSave = async () => {
    const next = {
      announcement: { enabled: annSw.querySelector('input').checked, text: annText.value.trim() },
      maintenance: { enabled: mntSw.querySelector('input').checked, message: mntText.value.trim() },
      copyProtection: copySw.querySelector('input').checked,
      showExplanations: explSw.querySelector('input').checked,
    };
    if (next.announcement.enabled && !next.announcement.text) { toast('Duyuru metni boş olamaz.', 'error'); return; }
    saveBtns.forEach(b => { b.disabled = true; });
    try { await saveSettings(next); state.settings = await getSettings(); toast('Ayarlar kaydedildi', 'success'); } catch (e) { toast(errorMessage(e), 'error'); }
    saveBtns.forEach(b => { b.disabled = false; });
  };
  const saveBar = () => { const b = btn('Ayarları kaydet', { kind: 'primary', iconName: 'check', onclick: doSave }); saveBtns.push(b); return h('div', { class: 'form-actions' }, b); };

  /* --- Görünüm --- */
  const themeBox = h('div', { class: 'theme-cards' });
  const paintThemes = () => {
    const cur = getThemePref();
    themeBox.replaceChildren(...[['system', 'Sistem', 'monitor', 'pv-system'], ['light', 'Açık', 'sun', 'pv-light'], ['dark', 'Koyu', 'moon', 'pv-dark']].map(([k, l, ic, pv]) =>
      h('button', { type: 'button', class: 'theme-card' + (cur === k ? ' active' : ''), 'aria-pressed': String(cur === k), onclick: () => setThemePref(k) },
        h('div', { class: 'preview ' + pv }, h('i', {}), h('i', {})), h('span', {}, icon(ic, 15), l))));
  };
  unTheme?.(); unTheme = onThemeChange(paintThemes); paintThemes();

  /* --- Güvenlik --- */
  const idleSel = h('select', { 'aria-label': 'Otomatik çıkış süresi' }, IDLE_OPTIONS.map(([v, l]) => h('option', { value: String(v), selected: getIdleMinutes() === v }, l)));
  idleSel.addEventListener('change', () => { setIdleMinutes(Number(idleSel.value)); toast('Otomatik çıkış süresi güncellendi'); });

  const pwCur = h('input', { type: 'password', autocomplete: 'current-password' });
  const pwNew = h('input', { type: 'password', autocomplete: 'new-password' });
  const pwNew2 = h('input', { type: 'password', autocomplete: 'new-password' });
  const bar = h('i', {});
  const strengthLbl = h('small', { class: 'muted' }, 'En az 10 karakter; büyük/küçük harf, rakam ve sembol önerilir.');
  pwNew.addEventListener('input', () => {
    const sc = pwStrength(pwNew.value);
    bar.style.width = `${(sc / 4) * 100}%`;
    bar.style.background = ['var(--bad)', 'var(--bad)', 'var(--warn)', 'var(--info)', 'var(--ok)'][sc];
  });
  const pwBtn = btn('Şifreyi değiştir', { iconName: 'key', onclick: async () => {
    if (pwNew.value.length < 10) { toast('Yeni şifre en az 10 karakter olmalı.', 'error'); return; }
    if (pwStrength(pwNew.value) < 3) { toast('Daha güçlü bir şifre seç.', 'error'); return; }
    if (pwNew.value !== pwNew2.value) { toast('Yeni şifreler eşleşmiyor.', 'error'); return; }
    pwBtn.disabled = true;
    try {
      await changePassword(pwCur.value, pwNew.value);
      [pwCur, pwNew, pwNew2].forEach(i => { i.value = ''; }); bar.style.width = '0';
      toast('Şifre değiştirildi', 'success');
    } catch (e) { toast(errorMessage(e.code === 'auth/invalid-credential' ? { code: 'auth/wrong-password' } : e), 'error'); }
    pwBtn.disabled = false;
  } });

  /* --- Hesap --- */
  const u = state.user;
  const last = u?.metadata?.lastSignInTime ? new Date(u.metadata.lastSignInTime).toLocaleString('tr-TR') : '—';
  const created = u?.metadata?.creationTime ? new Date(u.metadata.creationTime).toLocaleDateString('tr-TR') : '—';

  const navItems = [['site', 'megaphone', 'Site'], ['exam', 'shield', 'Sınav güvenliği'], ['look', 'sun', 'Görünüm'], ['security', 'lock', 'Güvenlik'], ['account', 'user', 'Hesap']];
  const nav = h('nav', { class: 'settings-nav' }, navItems.map(([id, ic, l], i) => h('button', {
    type: 'button', class: i === 0 ? 'active' : '',
    onclick: e => { e.preventDefault(); [...nav.children].forEach(a => a.classList.toggle('active', a === e.currentTarget)); document.getElementById('set-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  }, icon(ic, 16), l)));

  el.replaceChildren(
    pageHead('Ayarlar', 'Site davranışı, sınav güvenliği, görünüm ve hesap ayarları'),
    h('div', { class: 'settings-grid' }, nav,
      h('div', { class: 'settings-sections' },
        section('site', 'megaphone', 'Site', 'Öğrencilerin gördüğü genel ayarlar. Değişiklikler anında yayına girer.',
          row('Duyuru bandı', 'Sitenin en üstünde bilgilendirme bandı gösterir.', annSw, annText),
          row('Bakım modu', 'Yeni sınav başlatmayı kapatır. Devam eden sınavlar teslim edilebilir.', mntSw, mntText),
          saveBar()),
        section('exam', 'shield', 'Sınav güvenliği', 'Cevap anahtarı her zaman sunucuda saklanır ve yalnızca teslimden sonra gönderilir.',
          row('Kopyalama koruması', 'Sınav sırasında metin seçme, kopyalama, sağ tık ve yazdırmayı engeller.', copySw),
          row('Çözümleri göster', 'Sınav sonunda soruların açıklamalarını öğrenciye gösterir.', explSw),
          saveBar()),
        section('look', 'sun', 'Görünüm', 'Panel teması bu cihaza kaydedilir. Öğrenci sitesinde de aynı tercih kullanılır.', themeBox),
        section('security', 'lock', 'Güvenlik', null,
          row('Otomatik çıkış', 'Belirtilen süre boyunca işlem yapılmazsa oturum kapatılır.', idleSel),
          h('div', { class: 'setting-row', style: 'display:block' },
            h('b', {}, 'Şifre değiştir'), h('small', {}, 'Güvenlik için mevcut şifren tekrar doğrulanır.'),
            h('div', { class: 'pw-form', style: 'margin-top:12px' },
              h('label', { class: 'lbl' }, 'Mevcut şifre', pwCur),
              h('label', { class: 'lbl' }, 'Yeni şifre', pwNew, h('div', { class: 'strength' }, bar)),
              h('label', { class: 'lbl' }, 'Yeni şifre (tekrar)', pwNew2)),
            h('div', { class: 'row between wrap-row', style: 'margin-top:12px' }, strengthLbl, pwBtn))),
        section('account', 'user', 'Hesap', null,
          h('dl', { class: 'kv' },
            h('dt', {}, 'E-posta'), h('dd', {}, u?.email || '—'),
            h('dt', {}, 'Rol'), h('dd', {}, h('span', { class: 'pill info' }, 'Yönetici')),
            h('dt', {}, 'Kullanıcı kimliği'), h('dd', {}, h('code', {}, u?.uid || '—')),
            h('dt', {}, 'Son giriş'), h('dd', {}, last),
            h('dt', {}, 'Hesap oluşturma'), h('dd', {}, created))))));
}
