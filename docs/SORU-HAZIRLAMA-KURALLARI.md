# Deneme Hazırlama Kuralları

Bu belge, YKDS Deneme platformuna yüklenecek denemelerin **ortak JSON formatını** ve **soru yazım kurallarını** tanımlar.
Buradaki kurallara uyan bir dosya, yönetim panelinde hatasız yüklenir.

> **Kısa özet:** Tek bir JSON dosyası · 8 modül · toplam 80 soru · her soruda tam 5 şık · tek doğru cevap (A–E) · her soruda çözüm açıklaması.

---

## 1. Dosya yapısı

```json
{
  "name": "Deneme 3 · Orta Seviye",
  "author": "Hazırlayan adı",
  "modules": [
    {
      "id": "matematik",
      "questions": [
        {
          "question": "Soru metni",
          "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı", "E şıkkı"],
          "answer": "C",
          "explanation": "Kısa çözüm açıklaması"
        }
      ]
    }
  ]
}
```

### Alanlar

| Alan | Zorunlu | Tür | Kural |
|---|:---:|---|---|
| `name` | Önerilir | metin | Denemenin adı, 3–100 karakter. Yoksa panelde elle girilir. |
| `author` | Hayır | metin | Hazırlayan, en fazla 50 karakter. |
| `modules` | **Evet** | dizi | Tam **8** modül, her biri aşağıdaki listeden **bir kez**. |
| `modules[].id` | **Evet** | metin | Modül kimliği (bkz. Bölüm 2). |
| `modules[].questions` | **Evet** | dizi | O modülün soruları; sayı **tam** tutmalı. |
| `question` | **Evet** | metin | Boş olamaz. |
| `options` | **Evet** | dizi | **Tam 5** dolu metin. |
| `answer` | **Evet** | metin | Yalnızca `"A"`, `"B"`, `"C"`, `"D"` veya `"E"`. |
| `explanation` | Önerilir | metin | Sonuç ekranında öğrenciye gösterilen çözüm. |

- Dosya **UTF-8** kodlamalı olmalı; Türkçe karakterler (ç, ğ, ı, ö, ş, ü, İ) doğrudan yazılır.
- Dosyanın toplam boyutu **450.000 karakteri** geçmemeli (normal bir deneme yaklaşık 50.000 karakterdir).
- Bunlar dışındaki alanlar (`createdAt`, `difficulty` vb.) yok sayılır.

---

## 2. Modüller ve soru sayıları

Modüller **bu sırayla** yazılmalıdır. Soru numaraları da bu sıraya göre verilir (matematik 1–8, olasılık 9–16, …).

| Sıra | `id` | Alt test | Soru | Soru no |
|:---:|---|---|:---:|:---:|
| 1 | `matematik` | Matematiksel Temeller | **8** | 1–8 |
| 2 | `olasilik` | Olasılık, İstatistik ve Veri Okuryazarlığı | **8** | 9–16 |
| 3 | `algoritma` | Algoritmik Düşünme ve Problem Çözme | **12** | 17–28 |
| 4 | `bilimsel` | Bilimsel Akıl Yürütme ve Araştırma Okuryazarlığı | **12** | 29–40 |
| 5 | `bilisim` | Bilişim Teknolojileri | **10** | 41–50 |
| 6 | `siber` | Siber Güvenlik | **10** | 51–60 |
| 7 | `yapayzeka` | Yapay Zekâ ve Akıllı Sistemler | **10** | 61–70 |
| 8 | `donanim` | Donanım ve Bilgisayar Sistemleri | **10** | 71–80 |
| | | **Toplam** | **80** | |

> İlk dört modül **Ortak Temel Test** (40 soru), son dördü **Alan Testi**dir (40 soru).
> `id` değerleri küçük harf ve Türkçe karakter olmadan yazılmalıdır.

---

## 3. Konu başlıkları

Her modülün soruları aşağıdaki başlıklara **dengeli** dağıtılmalı; soru sayısının izin verdiği ölçüde her başlıktan en az bir soru olmalıdır.

**`matematik` · Matematiksel Temeller (8)**
Mantık ve matematiksel akıl yürütme · Matematiksel ispat teknikleri · Fonksiyonlar ve bağıntılar · Çizgeler (graphs) · Vektörler, matrisler ve doğrusal dönüşümler · Limit ve süreklilik · Türev ve integral

**`olasilik` · Olasılık, İstatistik ve Veri Okuryazarlığı (8)**
Olasılık · Temel istatistik · Dağılımlar · Korelasyon · Veri yorumlama · Belirsizlik altında karar verme

**`algoritma` · Algoritmik Düşünme ve Problem Çözme (12)**
Algoritma tasarımı · Sözde kod (pseudocode) · Akış diyagramları · Temel veri yapıları (dizi, bağlı liste, yığın, kuyruk) · Zaman ve bellek karmaşıklığı · Temel problem çözme stratejileri · Rekürsif düşünme · Sıralama algoritmaları

**`bilimsel` · Bilimsel Akıl Yürütme ve Araştırma Okuryazarlığı (12)**
Bilimsel yöntem · Hipotez oluşturma · Deney tasarımı · Araştırma etiği · Tekrarlanabilirlik · Sonuç yorumlama · Makale okuryazarlığı · Grafik/tablo yorumlama

**`bilisim` · Bilişim Teknolojileri (10)**
Programlamanın temel kavramları · Süreç (process) ve iş parçacığı (thread) · Bellek ve dosya yönetimi · TCP/IP ve temel ağ protokolleri · İlişkisel veritabanları, SQL ve veri sorgulama · Dağıtık sistemler ve bulut bilişim · Yazılım yaşam döngüsü ve sürüm yönetimi · Kod analizi, test ve hata ayıklama

**`siber` · Siber Güvenlik (10)**
Bilgi güvenliği temelleri · Kriptografinin temel kavramları · Kimlik doğrulama ve yetkilendirme · Tehdit modelleme ve risk analizi · Ağ güvenliği ve güvenlik duvarı (firewall) · Yazılım güvenliği · Yaygın saldırı türleri

**`yapayzeka` · Yapay Zekâ ve Akıllı Sistemler (10)**
Denetimli / denetimsiz / pekiştirmeli öğrenme · Veri hazırlama ve özellik çıkarımı · Regresyon, sınıflandırma ve kümeleme · Aşırı öğrenme (overfitting) ve eksik öğrenme (underfitting) · Model eğitimi ve performans değerlendirme · Yapay sinir ağlarının temel prensipleri · Büyük dil modelleri ve Transformer mimarisi · Güvenilir ve açıklanabilir yapay zekâ

**`donanim` · Donanım ve Bilgisayar Sistemleri (10)**
Temel donanım bileşenleri · Sayısal tasarım ve Boolean cebiri · Bilgisayar mimarisi · Mikroişlemciler ve mikrodenetleyiciler · Bellek hiyerarşisi ve önbellek yapıları · Donanım haberleşme arabirimleri · Yüksek başarımlı hesaplama · Gömülü ve gerçek zamanlı sistemler · Nesnelerin interneti (IoT) ve uç (edge) cihazlar

---

## 4. Soru yazım kuralları

### 4.1 Soru metni (`question`)
- Açık, tek anlamlı ve **ÖSYM üslubunda** yazılır: "…aşağıdakilerden hangisidir?", "…kaçtır?"
- Olumsuz soru köklerinde olumsuzluk vurgulanır: "aşağıdakilerden hangisi **yanlıştır**?"
- Soru, şıklara bakmadan anlaşılabilir olmalı.
- Zorluk **orta–zor** düzeyde olmalı; sadece ezber değil, yorum ve hesap da ölçülmeli.

### 4.2 Şıklar (`options`)
- **Tam 5 şık** olmalı, hiçbiri boş olmamalı.
- Şıkların başına **harf yazılmaz.** `"A) 42"` değil, `"42"` yazılır. Platform harfleri kendisi ekler.
- Şıklar benzer uzunlukta ve aynı dil yapısında olmalı; doğru cevap uzunluğuyla belli olmamalı.
- Çeldiriciler **makul** olmalı: sık yapılan hesap hatalarından veya kavram yanılgılarından türetilmeli.
- Aynı soruda iki şık aynı anlama gelmemeli.
- "Hepsi", "Hiçbiri" gibi şıklardan mümkün olduğunca kaçınılmalı.
- Sayısal şıklar küçükten büyüğe sıralanabilir, ama doğru cevabın yeri her soruda değişmeli.

### 4.3 Doğru cevap (`answer`)
- Her sorunun **tek ve tartışmasız** bir doğru cevabı olmalı.
- Hesap gerektiren sorularda sonuç **mutlaka iki kez kontrol edilmeli**.
- Doğru cevaplar A–E arasında **dengeli dağılmalı**: 80 soruda her harf yaklaşık 16 kez.
  - Bir harf toplam soruların **%35'inden fazlasında** (28'den fazla) doğru cevap olursa panel uyarı verir.
  - Arka arkaya 4'ten fazla aynı harften kaçınılmalı.

### 4.4 Çözüm (`explanation`)
- 1–3 cümlelik, **neden doğru olduğunu** gösteren kısa bir çözüm.
- Hesap sorularında ara adımlar yazılmalı: `det(A)=8; det(2A)=2³·det(A)=64.`
- Gerekirse yaygın yanlışın neden yanlış olduğu da belirtilebilir.

### 4.5 Özgünlük
- **ÖSYM'ye ait gerçek sınav soruları kullanılmaz** (telif ve etik nedenlerle).
- Başka kaynaklardan birebir kopya yapılmaz; sorular özgün olmalıdır.

---

## 5. Biçimlendirme

Platform soru metnini **düz metin** olarak gösterir. HTML, Markdown (kalın, liste vb.) ve LaTeX **işlenmez**.

| İstediğin | Nasıl yazılır | Örnek |
|---|---|---|
| Satır sonu | `\n` | `"Birinci satır\nİkinci satır"` |
| Çift tırnak | `\"` | `"\"Her x için\" önermesi"` |
| Ters bölü | `\\` | `"C:\\dosya"` |
| Kod bloğu | Üç ters tırnak: ` ``` ` | aşağıya bakın |
| Üs, kök, simgeler | Unicode karakter | `x²`, `√2`, `≤`, `≥`, `≠`, `π`, `∑`, `∫`, `∀`, `∃`, `¬`, `→`, `∧`, `∨`, `θ`, `λ` |
| Matris | Satır satır düz metin | `"A = [[2, 1], [1, 3]]"` |
| Tablo | Kod bloğu içinde hizalı metin | aşağıya bakın |

### Kod içeren sorular
Kod, soru metninin içinde ` ``` ` ile çevrilir. Kod bloğu eşit genişlikli yazı tipinde ve satır yapısı korunarak gösterilir:

```json
{
  "question": "Aşağıdaki sözde kodun çıktısı nedir?\n```\nx ← 0\nfor i ← 1 to 4\n    x ← x + i\nprint x\n```",
  "options": ["4", "6", "10", "11", "15"],
  "answer": "C",
  "explanation": "1+2+3+4 = 10."
}
```

### Tablo içeren sorular
```json
{
  "question": "Tabloya göre medyan kaçtır?\n```\nÖğrenci | Puan\nA       | 62\nB       | 75\nC       | 81\nD       | 90\nE       | 70\n```",
  "options": ["70", "72", "75", "76", "81"],
  "answer": "C",
  "explanation": "Sıralı: 62, 70, 75, 81, 90 → ortanca değer 75."
}
```

> **Not:** Görsel (resim, grafik dosyası) şu an desteklenmiyor. Grafik yorumlama sorularında veriyi tablo veya metin olarak verin.

---

## 6. Yaygın hatalar

| Hata mesajı | Sebep | Çözüm |
|---|---|---|
| `"modules" dizisi bulunamadı` | Üst düzeyde `modules` yok veya yanlış yazılmış | `"modules": [ … ]` ekleyin |
| `"xyz" tanınmıyor` | Modül `id` değeri hatalı | Bölüm 2'deki `id` değerlerini kullanın |
| `matematik: 8 soru olmalı, 7 var` | Soru sayısı eksik veya fazla | Sayıyı tamamlayın |
| `"options" tam 5 dolu metin olmalı` | 4 veya 6 şık var ya da bir şık boş | Tam 5 dolu şık yazın |
| `"answer" A, B, C, D veya E olmalı` | Cevap `"1"`, `"a)"` veya şık metni yazılmış | Yalnızca harf yazın: `"B"` |
| `"question" metni eksik` | Soru metni boş | Metni doldurun |
| `Geçersiz JSON` | Virgül, tırnak veya parantez hatası | Son elemandan sonra virgül koymayın; çift tırnak kullanın |
| `Cevap dağılımı dengesiz` (uyarı) | Bir harf çok fazla doğru cevap | Bazı soruların şık sırasını değiştirin |

**JSON'da en sık yapılan yazım hataları:**
- Tek tırnak (`'metin'`) yerine **çift tırnak** (`"metin"`) kullanılmalı.
- Dizinin veya nesnenin son elemanından sonra **virgül konmaz**.
- Metin içindeki çift tırnak `\"` olarak yazılır.
- Gerçek satır sonu yerine `\n` kullanılır.

---

## 7. Teslim öncesi kontrol listesi

- [ ] Dosya geçerli JSON (panelde "Biçimlendir" butonu hatasız çalışıyor)
- [ ] `name` alanı dolu
- [ ] 8 modül, Bölüm 2'deki sırayla
- [ ] Soru sayıları: 8 · 8 · 12 · 12 · 10 · 10 · 10 · 10 = **80**
- [ ] Her soruda tam 5 şık, şıkların başında harf yok
- [ ] Her soruda tek doğru cevap, hesaplar kontrol edildi
- [ ] Doğru cevaplar A–E arasında dengeli (her harf yaklaşık 16)
- [ ] Her soruda çözüm açıklaması var
- [ ] Konu başlıkları dengeli kapsandı
- [ ] ÖSYM'ye ait gerçek soru yok

---

## 8. Yükleme

1. Yönetim paneli → **Yeni deneme**
2. JSON dosyasını **sürükleyip bırakın** veya "JSON dosyası yükle" ile seçin
3. Sağdaki **Doğrulama** kutusunda 8 modülün de yeşil ✓ olduğunu ve "JSON geçerli: 8 modül, 80 soru" yazısını kontrol edin
4. Önce **taslak** olarak kaydedip kontrol edin, sonra **Yayınla**

> Cevaplar ve çözümler ayrı, gizli bir koleksiyonda saklanır. Öğrenciler cevapları ancak sınavı teslim ettikten sonra görür.

---

## 9. Yapay zekâ ile deneme üretme

Aşağıdaki prompt bir yapay zekâ asistanına verilerek bu formata uygun taslak deneme üretilebilir. Aynı prompt panelde **"Yapay zekâ promptu"** butonuyla da kopyalanabilir.

> ⚠️ Yapay zekâ çıktısı **mutlaka bir uzman tarafından kontrol edilmelidir**: doğru cevaplar, hesaplar ve çözümler tek tek doğrulanmalıdır.

````text
Bana YÖK-YKDS doktora öncelikli alanlar sınavı (2026) için 80 soruluk, özgün bir deneme sınavı hazırla. Çıktı SADECE geçerli JSON olsun (açıklama, giriş cümlesi, markdown kod bloğu yok). Biçim:
{"name":"Deneme adı","author":"Hazırlayan","modules":[{"id":"matematik","questions":[{"question":"...","options":["...","...","...","...","..."],"answer":"B","explanation":"kısa çözüm"}]}]}

Kurallar:
- Toplam 80 soru; modül idleri ve soru sayıları aşağıdaki gibi olmalı, hepsi tek JSON içinde ve bu sırayla.
- Her soruda tam 5 şık (şıkların başına A) B) yazma), "answer" yalnızca A, B, C, D veya E harfi olsun. Doğru cevaplar A-E arasında dengeli dağılsın (her harf yaklaşık 16 kez).
- Orta-zor seviye, ÖSYM tarzı; soruları aşağıdaki alt başlıklara dengeli dağıt ve her alt başlıktan en az bir soru olsun (modüldeki soru sayısı izin verdiği ölçüde).
- Kod içeren sorularda soru metnine ``` ile çevrili kod bloğu koy (JSON içinde satır sonu için \n kullan).
- Matematiksel ifadelerde LaTeX kullanma; ², √, ≤, π gibi Unicode karakterler kullan.
- Hesap gerektiren sorularda cevabı mutlaka doğrula; tartışmalı cevaplı soru yazma. "explanation" alanını doldur.
- ÖSYM'ye ait gerçek sınav sorularını kullanma.

Modüller ve alt başlıkları:
- id: "matematik" — Matematiksel Temeller (8 soru): Mantık ve matematiksel akıl yürütme; Matematiksel ispat teknikleri; Fonksiyonlar ve bağıntılar; Çizgeler (graphs); Vektörler, matrisler ve doğrusal dönüşümler; Limit ve süreklilik; Türev ve integral
- id: "olasilik" — Olasılık, İstatistik ve Veri Okuryazarlığı (8 soru): Olasılık; Temel istatistik; Dağılımlar; Korelasyon; Veri yorumlama; Belirsizlik altında karar verme
- id: "algoritma" — Algoritmik Düşünme ve Problem Çözme (12 soru): Algoritma tasarımı; Sözde kod; Akış diyagramları; Temel veri yapıları (dizi, bağlı liste, yığın, kuyruk); Zaman ve bellek karmaşıklığı; Temel problem çözme stratejileri; Rekürsif düşünme; Sıralama algoritmaları
- id: "bilimsel" — Bilimsel Akıl Yürütme ve Araştırma Okuryazarlığı (12 soru): Bilimsel yöntem; Hipotez oluşturma; Deney tasarımı; Araştırma etiği; Tekrarlanabilirlik; Sonuç yorumlama; Makale okuryazarlığı; Grafik/tablo yorumlama
- id: "bilisim" — Bilişim Teknolojileri (10 soru): Programlamanın temel kavramları; Süreç ve iş parçacığı; Bellek ve dosya yönetimi; TCP/IP ve temel ağ protokolleri; İlişkisel veritabanları, SQL ve veri sorgulama; Dağıtık sistemler ve bulut bilişim; Yazılım yaşam döngüsü ve sürüm yönetimi; Kod analizi, test ve hata ayıklama
- id: "siber" — Siber Güvenlik (10 soru): Bilgi güvenliği temelleri; Kriptografinin temel kavramları; Kimlik doğrulama ve yetkilendirme; Tehdit modelleme ve risk analizi; Ağ güvenliği ve güvenlik duvarı; Yazılım güvenliği; Yaygın saldırı türleri
- id: "yapayzeka" — Yapay Zekâ ve Akıllı Sistemler (10 soru): Denetimli/denetimsiz/pekiştirmeli öğrenme; Veri hazırlama ve özellik çıkarımı; Regresyon, sınıflandırma ve kümeleme; Aşırı öğrenme ve eksik öğrenme; Model eğitimi ve performans değerlendirme; Yapay sinir ağlarının temel prensipleri; Büyük dil modelleri ve Transformer mimarisi; Güvenilir ve açıklanabilir yapay zekâ
- id: "donanim" — Donanım ve Bilgisayar Sistemleri (10 soru): Temel donanım bileşenleri; Sayısal tasarım ve Boolean cebiri; Bilgisayar mimarisi; Mikroişlemciler ve mikrodenetleyiciler; Bellek hiyerarşisi ve önbellek yapıları; Donanım haberleşme arabirimleri; Yüksek başarımlı hesaplama; Gömülü ve gerçek zamanlı sistemler; Nesnelerin interneti (IoT) ve uç (edge) cihazlar
````

---

## 10. Örnek dosya

Tam ve geçerli bir örnek için depodaki [`seed/deneme-1.json`](../seed/deneme-1.json) dosyasına bakın.
Panelden **"Örnek JSON"** butonuyla boş bir şablon da indirilebilir.
