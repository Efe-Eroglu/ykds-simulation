import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTest } from '../src/core/validate.js';
import { splitTest, mergeTest, keyToQuestions, isValidContent } from '../src/core/split.js';
import { buildQuestions, computeScore } from '../src/core/scoring.js';

const seed = JSON.parse(readFileSync(new URL('../seed/deneme-1.json', import.meta.url), 'utf8'));

test('örnek deneme doğrulamadan geçer', () => {
  const r = validateTest(seed);
  assert.deepEqual(r.errors, []);
  assert.equal(buildQuestions(r.clean).length, 80);
});

test('hatalı deneme reddedilir', () => {
  const bad = structuredClone(seed);
  bad.modules[0].questions.pop();
  bad.modules[1].questions[0].answer = 'F';
  const r = validateTest(bad);
  assert.ok(r.errors.some(e => e.includes('matematik: 8 soru olmalı')));
  assert.ok(r.errors.some(e => e.includes('"answer" A, B, C, D veya E')));
});

test('herkese açık içerik cevap ve çözüm içermez', () => {
  const { content, key } = splitTest(validateTest(seed).clean);
  const json = JSON.stringify(content);
  assert.ok(!json.includes('"answer"'));
  assert.ok(!json.includes('"explanation"'));
  assert.equal(key.answers.length, 80);
  assert.ok(isValidContent(content));
});

test('ayır + birleştir kayıpsızdır', () => {
  const full = validateTest(seed).clean;
  const { content, key } = splitTest(full);
  assert.deepEqual(mergeTest(content, key), full);
});

test('sunucu puanı (yalnız anahtar) ile istemci puanı aynıdır', () => {
  const full = validateTest(seed).clean;
  const { key } = splitTest(full);
  const answers = Array.from({ length: 80 }, (_, i) => (i % 3 === 0 ? null : i % 5));
  const a = computeScore(buildQuestions(full), answers, 'siber');
  const b = computeScore(keyToQuestions(key.answers), answers, 'siber');
  assert.deepEqual(a, b);
});

test('ağırlıklı puan: tam doğru = 100', () => {
  const full = validateTest(seed).clean;
  const qs = buildQuestions(full);
  const answers = qs.map(q => 'ABCDE'.indexOf(q.answer));
  for (const f of ['bilisim', 'siber', 'yapayzeka', 'donanim']) {
    assert.equal(computeScore(qs, answers, f).total, 100);
  }
});
