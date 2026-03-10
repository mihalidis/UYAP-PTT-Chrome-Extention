# UYAP Tebligat PTT Takip — Chrome Eklentisi

UYAP'ta açık olan tebligat belgesinden PTT barkod numarasını otomatik okuyup PTT gönderi takip sorgusunu yapan Chrome eklentisi.

---

## Kurulum

1. Bu klasörü bilgisayarına kaydet
2. Chrome'da `chrome://extensions/` adresine git
3. Sağ üstten **"Geliştirici modu"**nu aç
4. **"Paketlenmemiş öğe yükle"** butonuna tıkla
5. Bu klasörü seç → eklenti yüklenir

---

## Kullanım

1. UYAP'a giriş yap
2. Takip etmek istediğin **tebligatı aç** (PDF viewer açık olmalı)
3. Chrome araç çubuğundaki 📬 ikonuna tıkla
4. **"Tebligat Numarasını Oku ve Sorgula"** butonuna bas
5. Barkod otomatik okunur → PTT'den sorgu yapılır → Sonuç gösterilir

---

## Nasıl Çalışır?

```
[Butona tıkla]
  ↓
[content.js] → DOM'dan .rpv-core__text-layer-text span'larını okur
  ↓
Regex ile PTT barkod numarasını tespit eder (13 haneli sayı veya AA123456789TR formatı)
  ↓
[background.js] → gonderitakip.ptt.gov.tr'ye fetch atar
  ↓
[popup.html] → Sonucu gösterir (durum badge + hareket listesi + PTT linki)
```

---

## Önemli Notlar

- **Yalnızca `uyap.gov.tr` domaininde çalışır** — güvenlik için
- PTT'nin kamuya açık bir JSON API'si bulunmadığından `gonderitakip.ptt.gov.tr` scrape edilir
- PTT sayfasının HTML yapısı değişirse `background.js` içindeki `parseHTMLResponse()` fonksiyonunu güncellemeyi gerektirebilir
- CORS sorunlarını önlemek için sorgu `background.js` (service worker) üzerinden yapılır

---

## Barkod Formatları (Desteklenen)

| Format | Örnek | Açıklama |
|--------|-------|----------|
| 13+ haneli sayı | `2789396419841` | Standart kargo barkodu |
| UPU formatı | `RR123456789TR` | Uluslararası posta |

---

## Sorun Giderme

**"Sayfada tebligat metni bulunamadı"**
→ PDF viewer henüz yüklenmemiş olabilir. Birkaç saniye bekleyip tekrar dene.

**"PTT'ye bağlanılamadı"**
→ İnternet bağlantını kontrol et. PTT sitesi zaman zaman down olabiliyor.

**"UYAP domaininde değilsiniz"**
→ Yalnızca uyap.gov.tr'de çalışır. UYAP tabında iken popup'ı aç.

---

## License

© 2026 Pınar Suvacoğlu — Licensed under [CC BY-NC 4.0](./LICENSE)

- Personal and educational use is free
- Contributions via pull requests are welcome
- Commercial use is **not permitted** without written permission
