/* Admin paneli ortak durumu ve veri önbelleği. */
import { listAllTests, listStats, getSettings } from '../services/tests.js';
import { checkHealth } from '../services/exam-api.js';

export const state = {
  user: null,
  tests: [],
  stats: {},
  settings: null,
  health: undefined, // undefined = kontrol edilmedi, null = ulaşılamadı
  loaded: false,
};

const listeners = new Set();
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach(fn => fn());

export async function refreshTests() {
  const [tests, stats] = await Promise.all([listAllTests(), listStats().catch(() => ({}))]);
  state.tests = tests;
  state.stats = stats;
  state.loaded = true;
  emit();
}

export async function refreshAll() {
  const [, settings, health] = await Promise.all([refreshTests(), getSettings(), checkHealth()]);
  state.settings = settings;
  state.health = health;
  emit();
}

export function totals() {
  const pub = state.tests.filter(t => t.published).length;
  let attempts = 0, sum = 0;
  Object.values(state.stats).forEach(s => { attempts += s.attempts; sum += s.avg * s.attempts; });
  const questions = state.tests.reduce((n, x) => n + (x.questionCount || 0), 0);
  return { questions, total: state.tests.length, published: pub, drafts: state.tests.length - pub, attempts, avg: attempts ? sum / attempts : 0 };
}
