import { h, toast, confirmDlg, download } from '../../ui/dom.js';
import { icon } from '../../ui/icons.js';
import { MODULES, TOTAL_Q } from '../../core/exam-config.js';
import { validateTest, resolveModuleId } from '../../core/validate.js';
import { exampleJson, aiPrompt } from '../../core/authoring.js';
import { getFullTest, createTest, updateTest, errorMessage } from '../../services/tests.js';
import { state, refreshTests } from '../state.js';
import { pageHead, btn, switchEl } from '../ui.js';

let dirty = false;
export const isEditorDirty = () => dirty;
export const clearEditorDirty = () => { dirty = false; };

/** JSON'daki modül soru sayıları (doğrulama hatalı olsa bile kontrol listesi için). */
function moduleCounts(obj) {
  const counts = {};
  let mods = obj && obj.modules;
  if (mods && !Array.isArray(mods) && typeof mods === 'object') mods = Object.entries(mods).map(([id, questions]) => ({ id, questions }));
  if (Array.isArray(mods)) mods.forEach(m => { const id = resolveModuleId(m?.id ?? ''); if (id) counts[id] = Array.isArray(m.questions) ? m.questions.length : 0; });
  return counts;
}

export async function renderEditor(el, id) {
  dirty = false;
  const meta = id ? state.tests.find(t => t.id === id) : null;
  if (id && !meta) {
    el.replaceChildren(pageHead('Deneme bulunamadı', 'Bu deneme silinmiş olabilir.', btn('Denemelere dön', { href: '#/tests', iconName: 'arrowLeft' })));
    return;
  }

  let validated = null, contentDirty = false;

  const inName = h('input', { type: 'text', maxlength: '100', placeholder: 'Örn. Deneme 3', value: meta?.name || '' });
  const inAuthor = h('input', { type: 'text', maxlength: '50', placeholder: 'İsteğe bağlı', value: meta?.author || '' });
  const inJson = h('textarea', { class: 'mono', spellcheck: 'false', placeholder: '{"modules":[{"id":"matematik","questions":[ … ]}, …]}', 'aria-label': 'Deneme JSON' });
  const jsonMeta = h('div', { class: 'json-meta' }, h('span', {}), h('span', {}));
  const pubSwitch = switchEl('ed-pub', meta ? meta.published : true);
  const inPub = pubSwitch.querySelector('input');
  const saveBtn = btn(meta ? 'Değişiklikleri kaydet' : 'Denemeyi kaydet', { kind: 'primary', iconName: 'check', onclick: save });
  saveBtn.style.width = '100%';
  const checklist = h('div', { class: 'mod-check' });
  const messages = h('div', {});

  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  const drop = h('label', { class: 'dropzone' }, fileInput,
    h('span', { class: 'dz-ic' }, icon('upload', 20)),
    h('div', {}, h('b', {}, 'JSON dosyası yükle'), h('small', {}, 'Tıkla veya dosyayı buraya sürükle · en fazla 450 KB')));

  async function loadFile(f) {
    if (!f) return;
    if (f.size > 600 * 1024) { toast('Dosya çok büyük.', 'error'); return; }
    const txt = await f.text();
    inJson.value = txt; contentDirty = true; dirty = true;
    try {
      const obj = JSON.parse(txt);
      if (!inName.value && typeof obj.name === 'string') inName.value = obj.name;
      if (!inAuthor.value && typeof obj.author === 'string') inAuthor.value = obj.author;
    } catch { /* doğrulama gösterir */ }
    if (!inName.value) inName.value = f.name.replace(/\.json$/i, '');
    validate();
  }
  fileInput.addEventListener('change', e => { loadFile(e.target.files[0]); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

  function validate() {
    const name = inName.value.trim(), txt = inJson.value.trim();
    validated = null;
    const lines = txt ? txt.split('\n').length : 0;
    jsonMeta.firstChild.textContent = `${lines} satır · ${(txt.length / 1024).toFixed(1)} KB`;
    let obj = null, parseErr = null;
    if (txt) { try { obj = JSON.parse(txt); } catch (e) { parseErr = e.message; } }
    const counts = obj ? moduleCounts(obj) : {};
    checklist.replaceChildren(...MODULES.map(m => {
      const n = counts[m.id];
      const cls = n == null ? 'none' : n === m.n ? 'ok' : 'bad';
      return h('div', { class: 'mod-row ' + cls },
        h('span', { class: 'mr-ic' }, icon(cls === 'ok' ? 'check' : cls === 'bad' ? 'x' : 'file', 12)),
        h('span', { title: m.name }, m.name), h('em', {}, `${n ?? 0}/${m.n}`));
    }));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    jsonMeta.lastChild.textContent = `${total} / ${TOTAL_Q} soru`;

    const items = [];
    if (parseErr) items.push(h('li', {}, 'Geçersiz JSON: ' + parseErr));
    else if (obj) {
      const r = validateTest(obj);
      if (r.errors.length) {
        r.errors.slice(0, 12).forEach(e => items.push(h('li', {}, e)));
        if (r.errors.length > 12) items.push(h('li', {}, `… ve ${r.errors.length - 12} hata daha`));
      } else {
        validated = r.clean;
        r.warnings.forEach(w => items.push(h('li', { class: 'warn' }, w)));
      }
    }
    if (validated && name.length < 3) items.push(h('li', { class: 'warn' }, 'Deneme adı en az 3 karakter olmalı.'));
    messages.replaceChildren(...[
      validated ? h('div', { class: 'v-ok' }, icon('check', 16), 'JSON geçerli: 8 modül, 80 soru') : null,
      !txt ? h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'Doğrulama için JSON ekle.') : null,
      items.length ? h('ul', { class: 'errors' }, items) : null,
    ].filter(Boolean));
    saveBtn.disabled = !(validated && name.length >= 3);
  }

  async function save() {
    const name = inName.value.trim(), author = inAuthor.value.trim(), published = inPub.checked;
    if (!validated || name.length < 3) return;
    const dup = state.tests.find(t => t.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr') && (!meta || t.id !== meta.id));
    if (dup && !(await confirmDlg('Aynı isim var', 'Bu isimde bir deneme zaten var. Yine de kaydedilsin mi?', 'Kaydet'))) return;
    saveBtn.disabled = true; saveBtn.lastChild.textContent = 'Kaydediliyor…';
    try {
      if (meta) await updateTest(meta.id, { name, author, published }, contentDirty ? validated : null);
      else await createTest({ name, author, published, full: validated });
      dirty = false;
      toast(meta ? 'Deneme güncellendi' : published ? 'Deneme yayınlandı' : 'Taslak kaydedildi', 'success');
      await refreshTests();
      location.hash = '#/tests';
    } catch (e) {
      console.error(e);
      toast('Kaydedilemedi: ' + errorMessage(e), 'error');
      saveBtn.lastChild.textContent = meta ? 'Değişiklikleri kaydet' : 'Denemeyi kaydet';
      validate();
    }
  }

  [inName, inAuthor].forEach(i => i.addEventListener('input', () => { dirty = true; validate(); }));
  inPub.addEventListener('change', () => { dirty = true; });
  inJson.addEventListener('input', () => { dirty = true; contentDirty = true; validate(); });
  inJson.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); inJson.setRangeText('  ', inJson.selectionStart, inJson.selectionEnd, 'end'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (!saveBtn.disabled) save(); }
  });

  const tools = h('div', { class: 'row wrap-row', style: 'margin-top:12px' },
    btn('Örnek JSON', { small: true, iconName: 'download', onclick: () => download('ornek-deneme.json', exampleJson()) }),
    btn('Yapay zekâ promptu', { small: true, iconName: 'sparkles', onclick: async () => { try { await navigator.clipboard.writeText(aiPrompt()); toast('Prompt panoya kopyalandı', 'success'); } catch { toast('Panoya kopyalanamadı', 'error'); } } }),
    btn('Biçimlendir', { small: true, iconName: 'braces', onclick: () => { try { inJson.value = JSON.stringify(JSON.parse(inJson.value), null, 2); validate(); } catch { toast('Önce JSON hatalarını düzelt', 'error'); } } }));

  el.replaceChildren(
    pageHead(meta ? 'Denemeyi düzenle' : 'Yeni deneme', meta ? meta.name : '8 modül ve 80 sorudan oluşan JSON dosyasını yükle.',
      btn('Vazgeç', { href: '#/tests', iconName: 'arrowLeft' })),
    h('div', { class: 'editor-grid' },
      h('div', { class: 'card' },
        h('h3', {}, 'Deneme bilgileri'),
        h('label', { class: 'lbl' }, 'Deneme adı *', inName),
        h('label', { class: 'lbl' }, 'Hazırlayan ', h('span', { class: 'hint' }, '(isteğe bağlı)'), inAuthor),
        drop,
        h('label', { class: 'lbl' }, 'Deneme JSON', h('div', { class: 'json-wrap' }, inJson)),
        jsonMeta, tools),
      h('div', { class: 'editor-side' },
        h('div', { class: 'card' },
          h('h3', {}, 'Yayın'),
          h('div', { class: 'setting-row' }, h('div', {}, h('b', {}, 'Öğrencilere açık'), h('small', {}, 'Kapalıysa taslak olarak saklanır')), pubSwitch),
          h('div', { style: 'margin-top:14px' }, saveBtn),
          h('p', { class: 'muted small', style: 'margin:10px 0 0;text-align:center' }, h('kbd', {}, 'Ctrl'), ' + ', h('kbd', {}, 'S'), ' ile kaydet')),
        h('div', { class: 'card' },
          h('h3', {}, 'Doğrulama'),
          h('p', { class: 'muted small', style: 'margin:0 0 10px' }, 'Cevaplar ve çözümler ayrı, gizli bir koleksiyonda saklanır.'),
          checklist, h('div', { style: 'margin-top:12px' }, messages)))));

  validate();
  if (meta) {
    inJson.value = 'Yükleniyor…'; inJson.disabled = true;
    try { inJson.value = JSON.stringify(await getFullTest(meta.id), null, 2); } catch (e) { inJson.value = ''; toast(errorMessage(e), 'error'); }
    inJson.disabled = false;
    validate();
  }
}
