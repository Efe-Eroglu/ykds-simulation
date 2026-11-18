/**
 * Kopya güvenliği için deneme ikiye ayrılır:
 *   content (herkese açık) → yalnızca soru metni ve şıklar
 *   key     (yalnızca admin + sunucu) → cevaplar ve çözümler
 * Böylece cevap anahtarı sınav bitmeden tarayıcıya hiç inmez.
 */
import { MODULES, LETTERS } from './exam-config.js';

/** Doğrulanmış tam denemeyi ({modules:[{id,questions:[{question,options,answer,explanation}]}]}) ayırır. */
export function splitTest(full) {
  const answers = [], explanations = [];
  const content = {
    modules: full.modules.map(m => ({
      id: m.id,
      questions: m.questions.map(q => {
        answers.push(q.answer);
        explanations.push(q.explanation || '');
        return { question: q.question, options: q.options };
      }),
    })),
  };
  return { content, key: { answers: answers.join(''), explanations } };
}

/** content + key → tam deneme. key.answers string ("ABCD…") veya dizi olabilir. */
export function mergeTest(content, key) {
  const answers = Array.isArray(key.answers) ? key.answers : String(key.answers).split('');
  const expl = key.explanations || [];
  let i = 0;
  return {
    modules: content.modules.map(m => ({
      id: m.id,
      questions: m.questions.map(q => {
        const k = i++;
        return { question: q.question, options: q.options, answer: answers[k], explanation: expl[k] || '' };
      }),
    })),
  };
}

/** Sunucu tarafı: cevap anahtarından puanlamaya uygun soru listesi üretir (metin gerekmez). */
export function keyToQuestions(answerStr) {
  const qs = [];
  let i = 0;
  for (const m of MODULES) for (let j = 0; j < m.n; j++) qs.push({ mod: m.id, answer: answerStr[i++] });
  return qs;
}

/** Herkese açık içeriğin yapısal kontrolü (cevap olmadan). */
export function isValidContent(c) {
  if (!c || !Array.isArray(c.modules) || c.modules.length !== MODULES.length) return false;
  return c.modules.every((m, mi) => m.id === MODULES[mi].id && Array.isArray(m.questions) && m.questions.length === MODULES[mi].n
    && m.questions.every(q => typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === LETTERS.length));
}
