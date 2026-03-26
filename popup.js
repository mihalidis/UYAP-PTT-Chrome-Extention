// popup.js — UYAP Tebligat PTT Takip eklentisi

const elBtnQuery   = document.getElementById("btnQuery");
const elBtnText    = document.getElementById("btnText");
const elSpinner    = document.getElementById("spinner");
const elBtnIcon    = document.querySelector(".btn-icon");
const elBarkodCard = document.getElementById("barkodCard");
const elBarkodVal  = document.getElementById("barkodValue");
const elInfoBox    = document.getElementById("infoBox");
const elErrorBox   = document.getElementById("errorBox");
const elErrorText  = document.getElementById("errorText");
const elResultCard = document.getElementById("resultCard");
const elStatusBanner = document.getElementById("statusBanner");
const elStatusIcon   = document.getElementById("statusIcon");
const elStatusText   = document.getElementById("statusText");
const elStatusDate   = document.getElementById("statusDate");
const elResultBody   = document.getElementById("resultBody");

// --- State helpers ---
function showLoading() {
  elBtnQuery.disabled = true;
  elBtnText.textContent = "Sorgulanıyor...";
  elBtnIcon.style.display = "none";
  elSpinner.style.display = "block";
}

function hideLoading() {
  elBtnQuery.disabled = false;
  elBtnText.textContent = "Tekrar Sorgula";
  elBtnIcon.style.display = "inline";
  elSpinner.style.display = "none";
}

function showError(msg) {
  elInfoBox.style.display = "none";
  elResultCard.classList.remove("visible");
  elErrorText.textContent = msg;
  elErrorBox.classList.add("visible");
}

function showResult(data) {
  elErrorBox.classList.remove("visible");
  elInfoBox.style.display = "none";
  elResultCard.classList.add("visible");
  renderResult(data);
}

// --- Render ---
function renderResult(data) {
  const { statusColor, durumAciklama, durumTarihi } = data;

  // Banner rengi + ikon + metin
  const bannerConfig = {
    green:  { icon: "✓",  label: durumAciklama || "Teslim Edildi" },
    yellow: { icon: "📦", label: durumAciklama || "İşlemde" },
    red:    { icon: "✕",  label: durumAciklama || "Gönderi bulunamadı" },
  };
  const cfg = bannerConfig[statusColor] || bannerConfig.yellow;

  elStatusBanner.className = `status-banner ${statusColor}`;
  elStatusIcon.textContent  = cfg.icon;
  elStatusText.textContent  = cfg.label;
  elStatusDate.textContent  = durumTarihi ? formatTarih(durumTarihi) : "";

  elResultBody.innerHTML = "";

  if (statusColor === "red") return; // sadece banner yeterli

  if (statusColor === "green") {
    renderKabulBox(data.kabul);
    renderCollapsibleTimeline(data.hareketler);
  } else {
    renderTimeline(data.hareketler);
  }

  if (data.pttUrl) {
    const link = document.createElement("a");
    link.className = "btn-ptt";
    link.href = "#";
    link.innerHTML = "🔗 PTT sitesinde görüntüle";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: data.pttUrl });
    });
    elResultBody.appendChild(link);
  }
}

function renderKabulBox(k) {
  if (!k || (!k.gonderici && !k.alici && !k.kabulIsyeri && !k.kabulTarihi)) return;

  const box = document.createElement("div");
  box.className = "kabul-box";

  const rows = [
    { icon: "👤", label: "Gönderici",    value: k.gonderici },
    { icon: "📬", label: "Alıcı",        value: k.alici },
    { icon: "🏪", label: "Kabul Şubesi", value: k.kabulIsyeri },
    { icon: "📅", label: "Kabul Tarihi", value: k.kabulTarihi ? formatTarih(String(k.kabulTarihi)) : "" },
  ];

  rows.forEach(({ icon, label, value }) => {
    if (!value) return;
    const row = document.createElement("div");
    row.className = "kabul-row";
    row.innerHTML = `
      <span class="kabul-row-icon">${icon}</span>
      <span class="kabul-row-label">${label}</span>
      <span class="kabul-row-value">${escapeHtml(value)}</span>
    `;
    box.appendChild(row);
  });

  elResultBody.appendChild(box);
}

function renderTimeline(hareketler) {
  if (!hareketler || hareketler.length === 0) return;

  const timeline = document.createElement("div");
  timeline.className = "timeline";

  const reversed = [...hareketler].reverse();
  reversed.forEach((h, i) => {
    const item = document.createElement("div");
    item.className = "timeline-item" + (i === 0 ? " first" : "");

    const dot = document.createElement("div");
    dot.className = "timeline-dot";

    const content = document.createElement("div");
    content.className = "timeline-content";

    const detayHtml = h.islemDetay
      ? `<div class="timeline-detay">${escapeHtml(h.islemDetay)}</div>`
      : "";

    content.innerHTML = `
      <div class="timeline-aciklama">${escapeHtml(h.aciklama)}</div>
      <div class="timeline-isyeri">${escapeHtml(h.isyeri)}</div>
      <div class="timeline-tarih">${escapeHtml(h.tarih)} · ${escapeHtml(h.saat)}</div>
      ${detayHtml}
    `;

    item.appendChild(dot);
    item.appendChild(content);
    timeline.appendChild(item);
  });

  elResultBody.appendChild(timeline);
}

function renderCollapsibleTimeline(hareketler) {
  if (!hareketler || hareketler.length === 0) return;

  const wrapper = document.createElement("div");
  wrapper.className = "collapsible-timeline";

  const toggle = document.createElement("button");
  toggle.className = "timeline-toggle";
  toggle.innerHTML = `<span class="timeline-toggle-icon">▸</span> Gönderi Hareketleri (${hareketler.length})`;
  wrapper.appendChild(toggle);

  const content = document.createElement("div");
  content.className = "timeline-toggle-content";
  wrapper.appendChild(content);

  toggle.addEventListener("click", () => {
    const open = content.classList.toggle("open");
    toggle.querySelector(".timeline-toggle-icon").textContent = open ? "▾" : "▸";
    if (open && content.childElementCount === 0) {
      const timeline = document.createElement("div");
      timeline.className = "timeline";
      const reversed = [...hareketler].reverse();
      reversed.forEach((h, i) => {
        const item = document.createElement("div");
        item.className = "timeline-item" + (i === 0 ? " first" : "");
        const dot = document.createElement("div");
        dot.className = "timeline-dot";
        const cont = document.createElement("div");
        cont.className = "timeline-content";
        const detayHtml = h.islemDetay
          ? `<div class="timeline-detay">${escapeHtml(h.islemDetay)}</div>`
          : "";
        cont.innerHTML = `
          <div class="timeline-aciklama">${escapeHtml(h.aciklama)}</div>
          <div class="timeline-isyeri">${escapeHtml(h.isyeri)}</div>
          <div class="timeline-tarih">${escapeHtml(h.tarih)} · ${escapeHtml(h.saat)}</div>
          ${detayHtml}
        `;
        item.appendChild(dot);
        item.appendChild(cont);
        timeline.appendChild(item);
      });
      content.appendChild(timeline);
    }
  });

  elResultBody.appendChild(wrapper);
}

// "20260316" → "16.03.2026"
function formatTarih(raw) {
  if (!raw || raw === "0") return "";
  const s = String(raw);
  if (s.length === 8) {
    return `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)}`;
  }
  return s;
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Ana akış ---
async function runQuery() {
  showLoading();

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const isUyap      = tab?.url?.includes("uyap.gov.tr");
  const isLocalTest = tab?.url?.startsWith("http://localhost") || tab?.url?.startsWith("file://");

  if (!tab || !tab.url || (!isUyap && !isLocalTest)) {
    hideLoading();
    showError("Bu eklenti yalnızca uyap.gov.tr domaininde çalışır. Lütfen UYAP'ta bir tebligat belgesi açın.");
    return;
  }

  let barkodResult;
  try {
    barkodResult = await chrome.tabs.sendMessage(tab.id, { type: "GET_BARKOD" });
  } catch (_) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      barkodResult = await chrome.tabs.sendMessage(tab.id, { type: "GET_BARKOD" });
    } catch {
      hideLoading();
      showError("Sayfaya erişilemedi. Sayfayı yenileyip tekrar deneyin.");
      return;
    }
  }

  if (!barkodResult?.success) {
    hideLoading();
    showError(barkodResult?.error || "Barkod numarası okunamadı.");
    return;
  }

  const { barkodNo } = barkodResult;

  elBarkodCard.classList.add("visible");
  elBarkodVal.textContent = barkodNo;

  const pttResult = await chrome.runtime.sendMessage({ type: "QUERY_PTT", barkodNo });

  hideLoading();

  if (!pttResult?.success) {
    showError(pttResult?.error || "PTT sorgusu başarısız oldu.");
    return;
  }

  showResult(pttResult);
}

elBtnQuery.addEventListener("click", runQuery);

document.getElementById("disclaimerToggle").addEventListener("click", () => {
  const panel = document.getElementById("footerDisclaimer");
  const arrow = document.getElementById("disclaimerArrow");
  const open  = panel.classList.toggle("open");
  arrow.textContent = open ? "▾" : "▸";
});
