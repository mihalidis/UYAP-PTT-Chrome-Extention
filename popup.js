// popup.js — UYAP Tebligat PTT Takip eklentisi

const elBtnQuery    = document.getElementById("btnQuery");
const elBtnText     = document.getElementById("btnText");
const elSpinner     = document.getElementById("spinner");
const elBtnIcon     = document.querySelector(".btn-icon");
const elBarkodCard  = document.getElementById("barkodCard");
const elBarkodVal   = document.getElementById("barkodValue");
const elInfoBox     = document.getElementById("infoBox");
const elErrorBox    = document.getElementById("errorBox");
const elErrorText   = document.getElementById("errorText");
const elResultCard  = document.getElementById("resultCard");
const elStatusBadge = document.getElementById("statusBadge");
const elStatusIcon  = document.getElementById("statusIcon");
const elStatusText  = document.getElementById("statusText");
const elResultBody  = document.getElementById("resultBody");

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

// --- PTT durum badge ---
function classifyStatus(durum) {
  if (!durum) return { cls: "bilinmiyor", icon: "●", label: "Bilgi Alınamadı" };
  const d = durum.toLowerCase();
  if (d.includes("teslim") && !d.includes("teslim edilemedi")) {
    return { cls: "teslim", icon: "✓", label: "Teslim Edildi" };
  }
  if (d.includes("dağıtım") || d.includes("yolda") || d.includes("transit") || d.includes("aktarım")) {
    return { cls: "yolda", icon: "🚚", label: "Yolda" };
  }
  if (d.includes("bekli") || d.includes("şube") || d.includes("işyeri") || d.includes("merkez")) {
    return { cls: "bekliyor", icon: "📦", label: "Şubede Bekliyor" };
  }
  return { cls: "bilinmiyor", icon: "●", label: durum.slice(0, 35) };
}

function renderResult(data) {
  const status = classifyStatus(data.sonDurum);
  elStatusBadge.className = `status-badge ${status.cls}`;
  elStatusIcon.textContent = status.icon;
  elStatusText.textContent = status.label;

  elResultBody.innerHTML = "";

  // Kabul bilgisi (gönderici / alıcı / şube)
  const k = data.kabul;
  if (k && (k.gonderici || k.alici || k.kabulIsyeri)) {
    const infoDiv = document.createElement("div");
    infoDiv.style.cssText = "font-size:11px;color:#495057;margin-bottom:10px;line-height:1.7;background:#f8f9fa;padding:8px 10px;border-radius:6px";
    if (k.gonderici)   infoDiv.innerHTML += `<b>Gönderici:</b> ${escapeHtml(k.gonderici)}<br>`;
    if (k.alici)       infoDiv.innerHTML += `<b>Alıcı:</b> ${escapeHtml(k.alici)}<br>`;
    if (k.kabulIsyeri) infoDiv.innerHTML += `<b>Kabul Şubesi:</b> ${escapeHtml(k.kabulIsyeri)}`;
    elResultBody.appendChild(infoDiv);
  }

  if (data.hareketler && data.hareketler.length > 0) {
    const ul = document.createElement("ul");
    ul.className = "hareket-list";
    data.hareketler.forEach((h) => {
      const li = document.createElement("li");
      li.className = "hareket-item";
      li.innerHTML = `
        <div class="hareket-dot"></div>
        <div class="hareket-content">
          <div class="hareket-durum">${escapeHtml(h.durum)}</div>
          <div class="hareket-meta">${escapeHtml(h.tarih)}${h.konum ? " · " + escapeHtml(h.konum) : ""}</div>
        </div>
      `;
      ul.appendChild(li);
    });
    elResultBody.appendChild(ul);
  } else {
    const noData = document.createElement("p");
    noData.style.cssText = "font-size:12px;color:#6c757d;text-align:center;padding:8px 0";
    noData.textContent = "Henüz hareket kaydı bulunmuyor.";
    elResultBody.appendChild(noData);
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

  // Barkodu oku
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

  // PTT API'ye sorgula
  const pttResult = await chrome.runtime.sendMessage({ type: "QUERY_PTT", barkodNo });

  hideLoading();

  if (!pttResult?.success) {
    showError(pttResult?.error || "PTT sorgusu başarısız oldu.");
    return;
  }

  showResult(pttResult);
}

elBtnQuery.addEventListener("click", runQuery);
