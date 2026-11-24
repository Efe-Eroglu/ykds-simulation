/* Kaydedilen sorular — yalnızca bu tarayıcıda saklanır.
 * Sorunun bir kopyası da tutulur; sonuç/deneme silinse bile kayıt incelenebilir. */
import { store, KEYS } from '../lib/store.js';

export const bookmarkKey = (testId, i) => `${testId}:${i}`;

export const getBookmarks = () => store.get(KEYS.bookmarks, []) || [];

export const isBookmarked = key => getBookmarks().some(b => b.key === key);

/**
 * @param {{ key: string, testName: string, i: number, q: object, a: number|null }} item
 * @returns {boolean|null} yeni durum (kaydedildi mi); yazılamadıysa null
 */
export function toggleBookmark(item) {
  const arr = getBookmarks();
  const idx = arr.findIndex(b => b.key === item.key);
  if (idx >= 0) arr.splice(idx, 1);
  else {
    const { mod, question, options, answer, explanation } = item.q;
    arr.push({ key: item.key, testName: item.testName, i: item.i, a: item.a ?? null, q: { mod, question, options, answer, explanation }, savedAt: Date.now() });
  }
  return store.set(KEYS.bookmarks, arr) ? idx < 0 : null;
}
