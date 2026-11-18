import { MODULES, TOPICS } from './exam-config.js';

export function exampleJson() {
  const sample = { question: 'Örnek soru metni?', options: ['Seçenek A', 'Seçenek B', 'Seçenek C', 'Seçenek D', 'Seçenek E'], answer: 'A', explanation: 'İsteğe bağlı açıklama' };
  return JSON.stringify({
    modules: MODULES.map(m => ({ id: m.id, questions: Array.from({ length: m.n }, (_, i) => ({ ...sample, question: `[${m.name}] Örnek soru ${i + 1}` })) })),
  }, null, 2);
}

export function aiPrompt() {
  return `Bana YÖK-YKDS doktora öncelikli alanlar sınavı (2026) için 80 soruluk, özgün bir deneme sınavı hazırla. Çıktı SADECE geçerli JSON olsun (açıklama, giriş cümlesi, markdown kod bloğu yok). Biçim:
{"name":"Deneme adı","author":"Hazırlayan","modules":[{"id":"matematik","questions":[{"question":"...","options":["...","...","...","...","..."],"answer":"B","explanation":"kısa çözüm"}]}]}

Kurallar:
- Toplam 80 soru; modül idleri ve soru sayıları aşağıdaki gibi olmalı, hepsi tek JSON içinde ve bu sırayla.
- Her soruda tam 5 şık (şıkların başına A) B) yazma), "answer" yalnızca A, B, C, D veya E harfi olsun. Doğru cevaplar A-E arasında dengeli dağılsın (her harf yaklaşık 16 kez).
- Orta-zor seviye, ÖSYM tarzı; soruları aşağıdaki alt başlıklara dengeli dağıt ve her alt başlıktan en az bir soru olsun (modüldeki soru sayısı izin verdiği ölçüde).
- Kod içeren sorularda soru metnine \`\`\` ile çevrili kod bloğu koy (JSON içinde satır sonu için \\n kullan).
- Matematiksel ifadelerde LaTeX kullanma; ², √, ≤, π gibi Unicode karakterler kullan.
- Hesap gerektiren sorularda cevabı mutlaka doğrula; tartışmalı cevaplı soru yazma. "explanation" alanını doldur.
- ÖSYM'ye ait gerçek sınav sorularını kullanma.

Modüller ve alt başlıkları:
${MODULES.map(m => `- id: "${m.id}" — ${m.name} (${m.n} soru)\n${TOPICS[m.id].map(t => `    • ${t}`).join('\n')}`).join('\n')}`;
}
