// Background service worker
// PTT gönderi takip sorgusu — CORS engelini aşmak için service worker üzerinden yapılır.

const PTT_API_URL = "https://api.ptt.gov.tr/api/ShipmentTracking";
const PTT_WEB_URL = "https://gonderitakip.ptt.gov.tr/Track/Verify?q=";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "QUERY_PTT") {
    queryPTT(message.barkodNo).then(sendResponse).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // async
  }
});

async function queryPTT(barkodNo) {
  try {
    const response = await fetch(PTT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify([barkodNo]),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `PTT sunucusu hata döndürdü: ${response.status}`,
      };
    }

    const data = await response.json();
    return parseAPIResponse(data, barkodNo);
  } catch (err) {
    return {
      success: false,
      error: `PTT'ye bağlanılamadı: ${err.message}`,
    };
  }
}

function parseAPIResponse(data, barkodNo) {
  const shipment = Array.isArray(data) ? data[0] : data;

  if (!shipment) {
    return { success: false, error: "PTT'den gönderi bilgisi alınamadı." };
  }

  // PTT hata durumu
  if (shipment.errorState) {
    const msg = shipment.errorMessage || "Gönderi bulunamadı.";
    return { success: false, error: `PTT: ${msg}` };
  }

  // Hareket listesi — hareketDongu array'i
  const rawHareketler = Array.isArray(shipment.hareketDongu) ? shipment.hareketDongu : [];

  const hareketler = rawHareketler.map((h) => ({
    tarih: h.islem_tarihi || h.tarih || "",
    durum: h.durum_aciklama || h.durum || "",
    konum: h.isyeri_adi || h.konum || "",
  }));

  // Son durum — sondurum nesnesinden
  const sd = shipment.sondurum || {};
  const sonDurum =
    sd.teslim_durum_aciklama ||
    sd.son_durum_aciklama ||
    sd.mazb_durum_aciklama ||
    sd.sozl_durum_aciklama ||
    sd.ahk_durum_aciklama ||
    (hareketler.length > 0 ? hareketler[0].durum : null);

  // Kabul bilgisi
  const kabul = shipment.kabul || {};

  return {
    success: true,
    barkodNo: kabul.barkod_no || barkodNo,
    sonDurum,
    hareketler,
    kabul: {
      gonderici:    kabul.gonderici || "",
      alici:        kabul.alici || "",
      kabulIsyeri:  kabul.kabul_isyeri || "",
      kabulTarihi:  kabul.kabul_tarihi || "",
    },
    pttUrl: PTT_WEB_URL + encodeURIComponent(barkodNo),
  };
}
