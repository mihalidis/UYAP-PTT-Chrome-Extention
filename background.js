// Background service worker
const PTT_API_URL = "https://api.ptt.gov.tr/api/ShipmentTracking";
const PTT_WEB_URL = "https://gonderitakip.ptt.gov.tr/Track/Verify?q=";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "QUERY_PTT") {
    queryPTT(message.barkodNo).then(sendResponse).catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // async
  }

  if (message.type === "OPEN_PTT_PAGE") {
    openPttAndAutoQuery(message.url, message.barkodNo);
    return false;
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

  // hareketDongu null ise gönderi bulunamadı — errorMessage'ı hata olarak döndür
  if (shipment.hareketDongu === null) {
    const msg = shipment.errorMessage || "Gönderi bulunamadı.";
    return {
      success: true,
      barkodNo,
      durumAciklama: msg,
      durumTarihi: "",
      statusColor: "red",
      hareketler: [],
      kabul: {},
      pttUrl: PTT_WEB_URL + encodeURIComponent(barkodNo),
    };
  }

  // Son durum — sondurum nesnesinden
  const sd = shipment.sondurum || {};

  const teslimEdildi =
    !!sd.teslim_durum_aciklama &&
    sd.teslim_durum_aciklama.trim() !== "" &&
    sd.teslim_tarihi !== "0" &&
    !!sd.teslim_tarihi;

  const durumAciklama = teslimEdildi
    ? sd.teslim_durum_aciklama
    : sd.son_durum_aciklama || "";

  const durumTarihi = teslimEdildi
    ? sd.teslim_tarihi
    : sd.son_islem_tarihi || "";

  const statusColor = teslimEdildi ? "green" : "yellow";

  // Hareketler
  const hareketler = (shipment.hareketDongu || []).map((h) => ({
    aciklama:   h.aciklama || "",
    tarih:      h.tarih || "",
    saat:       h.saat || "",
    isyeri:     h.isyeri || "",
    islemDetay: (h.islem_detay || "").trim(),
  }));

  // Kabul bilgisi
  const kabul = shipment.kabul || {};

  return {
    success: true,
    barkodNo: kabul.barkod_no || barkodNo,
    durumAciklama,
    durumTarihi,
    statusColor,
    hareketler,
    kabul: {
      gonderici:   kabul.gonderici    || "",
      alici:       kabul.alici        || "",
      kabulIsyeri: kabul.kabul_isyeri || "",
      kabulTarihi: kabul.kabul_tarihi || "",
    },
    pttUrl: PTT_WEB_URL + encodeURIComponent(barkodNo),
  };
}

// PTT sayfasını aç, yüklendikten sonra barkodu input'a yaz ve sorgulat
function openPttAndAutoQuery(url, barkodNo) {
  chrome.tabs.create({ url }, (tab) => {
    const tabId = tab.id;

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      chrome.tabs.onUpdated.removeListener(onUpdated);

      chrome.scripting.executeScript({
        target: { tabId },
        args: [barkodNo],
        func: (barcode) => {
          function tryFill() {
            const input = document.querySelector('input[name="value"]');
            if (!input) return false;

            // React uygulaması — native setter ile değeri set et
            const nativeSetter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype, "value"
            ).set;
            nativeSetter.call(input, barcode);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));

            // "SORGULA" butonunu bul ve tıkla
            const parent = input.closest("div");
            const btn = parent
              ? parent.querySelector("button")
              : document.querySelector("button");

            if (btn) {
              setTimeout(() => btn.click(), 300);
            }
            return true;
          }

          // Sayfa React ile render olabilir, DOM hazır olmayabilir — retry
          if (!tryFill()) {
            let attempts = 0;
            const interval = setInterval(() => {
              attempts++;
              if (tryFill() || attempts >= 20) clearInterval(interval);
            }, 500);
          }
        },
      });
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}
