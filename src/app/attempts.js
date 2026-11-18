/* Öğrenci sonuçları — hesap olmadığı için yalnızca bu tarayıcıda saklanır. */
import { store, KEYS } from '../lib/store.js';

export const getAttempts = () => store.get(KEYS.attempts, []) || [];

/** @returns {boolean} sonuç kaydedildi mi */
export function saveAttempt(att, test) {
  const arr = getAttempts();
  arr.push(att);
  const ok = store.set(KEYS.attempts, arr);
  // İnceleme için denemenin bir kopyası tutulur (deneme sonradan silinse/değişse de sonuç incelenebilsin).
  if (store.get(KEYS.testCopy(att.testId)) == null) store.set(KEYS.testCopy(att.testId), test);
  return ok;
}

export function deleteAttempt(id) {
  const att = getAttempts().find(x => x.id === id);
  const rest = getAttempts().filter(x => x.id !== id);
  store.set(KEYS.attempts, rest);
  if (att && !rest.some(x => x.testId === att.testId)) store.del(KEYS.testCopy(att.testId));
}

export const getLocalTestCopy = testId => store.get(KEYS.testCopy(testId));

/** İnceleme için yerel kopya (cevap anahtarı yalnızca teslimden sonra alınıp burada saklanır). */
export async function getTestCopy(testId) {
  return getLocalTestCopy(testId);
}
