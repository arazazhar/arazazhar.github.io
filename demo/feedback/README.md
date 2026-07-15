# ArazLab — Dinleme Laboratuvarı

Yayınlanmamış demoları dinleyicilere dinletip yapılandırılmış geri bildirim
toplayan, tamamen ücretsiz araçlarla çalışan bir web sitesi.

## Nasıl çalışıyor?

- Site tamamen statik (HTML/CSS/JS) — **GitHub Pages**'te ücretsiz barındırılır.
- Veriler (demo listesi + geri bildirimler) **Firebase Firestore**'da tutulur
  (ücretsiz "Spark" plan, kredi kartı istemez).
- Admin girişi **Firebase Authentication** (e-posta/şifre) ile korunur.
- Şarkılar dosya olarak yüklenmez; **SoundCloud private link** ile gömülür —
  bu yüzden GitHub Pages'in dosya boyutu sınırları sorun olmaz.
- Grafikler için **Chart.js** (ücretsiz, CDN üzerinden) kullanılır.

Toplam maliyet: **0 TL**. Firestore ve Auth'un ücretsiz kotası bu ölçekte bir
demo/geri bildirim akışı için fazlasıyla yeterli.

---

## 1) Firebase projesi oluştur (5 dakika)

1. https://console.firebase.google.com adresine git, Google hesabınla gir.
2. **"Add project" / "Proje ekle"** → bir isim ver (ör. `arazlab`) → Google
   Analytics'i istersen kapat → projeyi oluştur.
3. Sol menüden **Build → Firestore Database** → **Create database** →
   "Start in production mode" seç → sana yakın bir region seç → oluştur.
4. Sol menüden **Build → Authentication** → **Get started** →
   **Sign-in method** sekmesinde **Email/Password**'ü etkinleştir.
5. Aynı yerde **Users** sekmesine geç → **Add user** → kendi admin
   e-posta ve şifreni manuel olarak ekle. (Bu, admin panelinde giriş
   yapacağın hesap — kayıt formu yok, bilerek: panel sadece sana özel.)
6. Sol üstteki dişli ikonu → **Project settings** → aşağıda **"Your apps"**
   → **</>** (Web) simgesine tıkla → bir takma isim ver → **Register app**.
   Karşına çıkan `firebaseConfig` nesnesini kopyala.
7. Bu projedeki `js/firebase-config.js` dosyasını aç, kopyaladığın
   değerleri ilgili alanlara yapıştır.

## 2) Firestore güvenlik kuralları

Firestore → **Rules** sekmesine git, aşağıdaki kuralları yapıştır ve
**Publish** et:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /demos/{demoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /feedback/{feedbackId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

Bu kurallar şunu sağlar: herkes demo listesini görebilir ve geri bildirim
gönderebilir; ama demoları düzenlemek ve gönderilen geri bildirimleri
okumak sadece giriş yapmış admin (sen) için mümkün.

## 3) SoundCloud embed kodu nasıl alınır?

Private track'lerde düz paylaşım linki (`.../s-xxxxx`) SoundCloud'un
player'ında çalışmıyor — SoundCloud private track'ler için farklı,
özel bir bağlantı formatı (`api.soundcloud.com/tracks/...?secret_token=...`)
kullanıyor. Bunu elle yazmana gerek yok; SoundCloud'un kendi ürettiği
kodu olduğu gibi kopyalaman yeterli:

1. Şarkıyı SoundCloud'a **Private** olarak yükle.
2. Track'in düzenleme sayfasında **Permissions** sekmesine girip
   **"Display embed code"** kutusunun **işaretli olmadığından** emin ol
   (işaretliyse embed kodu sadece sana gösterilir, kapalı kalmalı ki
   embed çalışsın) ve **Save** de.
3. Şarkı sayfasında **Share** butonuna bas → **Embed** sekmesine geç.
4. **"Code & preview"** kutusundaki tüm `<iframe ...>...</iframe>`
   kodunu kopyala (kutunun tamamını, sadece linki değil).
5. Admin panelinde demo eklerken/düzenlerken bu kodu **"SoundCloud
   Embed Kodu"** alanına olduğu gibi yapıştır. Dosya yüklemene gerek
   yok — sistem bu koddaki gerçek player adresini otomatik ayıklayıp
   kullanır.

Not: Panel hem tam embed kodunu hem de düz bir paylaşım linkini kabul
eder; ama private track'lerde her zaman **tam embed kodunu** kullanman
gerekir, düz link private track'lerde çalışmaz.

## 4) Yerelde test etme

Tarayıcılar `file://` üzerinden ES module importlarını engeller, bu yüzden
basit bir yerel sunucuyla açman gerekir:

```
cd arazlab
python3 -m http.server 8000
```

Sonra `http://localhost:8000` adresini aç.

## 5) GitHub Pages'e yayınlama (kendi domainin ile)

1. GitHub'da yeni bir repo oluştur, bu klasördeki tüm dosyaları içine
   yükle (push et).
2. Repo → **Settings → Pages** → **Source: Deploy from a branch** →
   `main` / `root` seç → Save.
3. Kendi domainini bağlamak için aynı ekranda **Custom domain** alanına
   domainini yaz (ör. `arazlab.com`). GitHub otomatik olarak bir `CNAME`
   dosyası oluşturur — bunu repo'dan silme.
4. Domain sağlayıcında (ör. GoDaddy, Namecheap) DNS ayarlarına GitHub'ın
   istediği A kayıtlarını / CNAME kaydını ekle (GitHub Pages
   dokümantasyonunda güncel IP'ler var: docs.github.com/pages).
5. Firebase Console → Authentication → **Settings → Authorized domains**
   kısmına yayındaki domainini (ve `<kullanici>.github.io` adresini)
   ekle — yoksa admin girişi domainden çalışmaz.

## 6) Site içeriği ve akış

- `index.html` — ana sayfa, aktif demoları listeler.
- `demo.html?id=demo1` — karşılama metni + tek şarkı player'ı + form.
- `admin.html` — admin girişi + panel:
  - **Genel Bakış**: tüm demolar için özet istatistik.
  - **Demo Yönetimi**: demo ekle/düzenle/sil, SoundCloud linki
    yapıştırarak "online içe aktarım" yap, şarkı adı ve sırasını belirle,
    yayında/kapalı durumunu değiştir.
  - **Geri Bildirim Paneli**: demo seç → tablo + grafikler (renk
    dağılımı, dinleme ortamı, karakter, tekrar dinleme puanı dağılımı).

## 7) Dosya yapısı

```
arazlab/
├── index.html
├── demo.html
├── admin.html
├── css/style.css
├── js/
│   ├── firebase.js          (Firebase başlatma — dokunmana gerek yok)
│   ├── firebase-config.js   (KENDİ anahtarlarını buraya yapıştır)
│   ├── index.js
│   ├── demo.js
│   └── admin.js
└── README.md
```

## Notlar

- Demo ID'leri (`demo1`, `demo2` ...) linkte kullanılır; şarkının gerçek
  adını ayrıca "Şarkı Adı" alanına yazabilirsin, ikisi bağımsızdır.
- Bir demoyu silmek, ona ait geri bildirimleri silmez — panelde
  `demoId` üzerinden görünmeye devam ederler.
- Ücretsiz Firestore kotası: günde 50.000 okuma / 20.000 yazma — bu
  ölçekte bir kampanya için fazlasıyla yeterli. Kotayı aşarsan Firebase
  seni e-posta ile uyarır, otomatik ücretlendirme yapmaz (Spark plan
  kredi kartı istemez).
