import { h } from './dom.js';
import { LETTERS } from '../core/exam-config.js';

let programmatic = false;
/** execCommand yedeği çalışırken true; kopya koruması bu kopyalamaya izin verir. */
export const isProgrammaticCopy = () => programmatic;

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = h('textarea', { style: 'position:fixed;opacity:0;top:0;left:0', readonly: true });
    ta.value = text; document.body.append(ta); ta.select();
    programmatic = true;
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    programmatic = false; ta.remove();
    return ok;
  }
}

/** Soru metnini şıklarıyla birlikte kopyalanacak düz metne çevirir. */
export function questionText(q) {
  const opts = q.options.map((o, k) => `${LETTERS[k]}) ${o}`).join('\n');
  return `${String(q.question).trim()}\n\n${opts}`;
}
