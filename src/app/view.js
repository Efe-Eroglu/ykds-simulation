import { $$ } from '../ui/dom.js';

/** 'home' | 'exam' | 'result' */
export function show(view) {
  $$('.view').forEach(v => v.classList.toggle('hidden', v.id !== 'view-' + view));
  document.body.dataset.view = view;
  window.scrollTo(0, 0);
}
