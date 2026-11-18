/* Sınav yapısı — 2026 Başvuru Kılavuzu */
export const EXAM_MINUTES = 120;
export const TOTAL_Q = 80;
export const MODULES = [
  { id: 'matematik', name: 'Matematiksel Temeller', n: 8, group: 'temel' },
  { id: 'olasilik', name: 'Olasılık, İstatistik ve Veri Okuryazarlığı', n: 8, group: 'temel' },
  { id: 'algoritma', name: 'Algoritmik Düşünme ve Problem Çözme', n: 12, group: 'temel' },
  { id: 'bilimsel', name: 'Bilimsel Akıl Yürütme ve Araştırma Okuryazarlığı', n: 12, group: 'temel' },
  { id: 'bilisim', name: 'Bilişim Teknolojileri', n: 10, group: 'alan' },
  { id: 'siber', name: 'Siber Güvenlik', n: 10, group: 'alan' },
  { id: 'yapayzeka', name: 'Yapay Zekâ ve Akıllı Sistemler', n: 10, group: 'alan' },
  { id: 'donanim', name: 'Donanım ve Bilgisayar Sistemleri', n: 10, group: 'alan' },
];
export const TOPICS = {
  matematik: ['Mantık ve matematiksel akıl yürütme', 'Matematiksel ispat teknikleri', 'Fonksiyonlar ve bağıntılar', 'Çizgeler (graphs)', 'Vektörler, matrisler ve doğrusal dönüşümler', 'Limit ve süreklilik', 'Türev ve integral'],
  olasilik: ['Olasılık', 'Temel istatistik', 'Dağılımlar', 'Korelasyon', 'Veri yorumlama', 'Belirsizlik altında karar verme'],
  algoritma: ['Algoritma tasarımı', 'Sözde kod (pseudocode)', 'Akış diyagramları', 'Temel veri yapıları (dizi, bağlı liste, yığın, kuyruk)', 'Zaman ve bellek karmaşıklığı', 'Temel problem çözme stratejileri', 'Rekürsif düşünme', 'Sıralama algoritmaları'],
  bilimsel: ['Bilimsel yöntem', 'Hipotez oluşturma', 'Deney tasarımı', 'Araştırma etiği', 'Tekrarlanabilirlik', 'Sonuç yorumlama', 'Makale okuryazarlığı', 'Grafik/tablo yorumlama'],
  bilisim: ['Programlamanın temel kavramları', 'Süreç (process) ve iş parçacığı (thread)', 'Bellek ve dosya yönetimi', 'TCP/IP ve temel ağ protokolleri', 'İlişkisel veritabanları, SQL ve veri sorgulama', 'Dağıtık sistemler ve bulut bilişim', 'Yazılım yaşam döngüsü ve sürüm yönetimi', 'Kod analizi, test ve hata ayıklama'],
  siber: ['Bilgi güvenliği temelleri', 'Kriptografinin temel kavramları', 'Kimlik doğrulama ve yetkilendirme', 'Tehdit modelleme ve risk analizi', 'Ağ güvenliği ve güvenlik duvarı (firewall)', 'Yazılım güvenliği', 'Yaygın saldırı türleri'],
  yapayzeka: ['Denetimli / denetimsiz / pekiştirmeli öğrenme', 'Veri hazırlama ve özellik çıkarımı', 'Regresyon, sınıflandırma ve kümeleme', 'Aşırı öğrenme (overfitting) ve eksik öğrenme (underfitting)', 'Model eğitimi ve performans değerlendirme', 'Yapay sinir ağlarının temel prensipleri', 'Büyük dil modelleri ve Transformer mimarisi', 'Güvenilir ve açıklanabilir yapay zekâ'],
  donanim: ['Temel donanım bileşenleri', 'Sayısal tasarım ve Boolean cebiri', 'Bilgisayar mimarisi', 'Mikroişlemciler ve mikrodenetleyiciler', 'Bellek hiyerarşisi ve önbellek yapıları', 'Donanım haberleşme arabirimleri', 'Yüksek başarımlı hesaplama', 'Gömülü ve gerçek zamanlı sistemler', 'Nesnelerin interneti (IoT) ve uç (edge) cihazlar'],
};
export const FIELDS = MODULES.filter(m => m.group === 'alan');
export const OWN_COEF = 2.25;
export const OTHER_COEF = 1.25;
export const LETTERS = ['A', 'B', 'C', 'D', 'E'];
/** Firestore belge sınırı 1 MiB; güvenli pay bırakıyoruz. */
export const MAX_CHARS = 450000;
export const modById = Object.fromEntries(MODULES.map(m => [m.id, m]));
