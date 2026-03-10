// UYAP sayfasındaki tebligat viewer içinden PTT barkod numarasını okur
// .rpv-core__text-layer-text span'larından sayısal değeri çeker

const BARKOD_PATTERN = /\b\d{13,}\b|\b[A-Z]{2}\d{9}TR\b/g;

function extractBarkodFromDOM() {
  const textSpans = document.querySelectorAll(".rpv-core__text-layer-text");

  if (!textSpans.length) {
    return { success: false, error: "Sayfada tebligat metni bulunamadı. Lütfen bir tebligat belgesi açık olduğundan emin olun." };
  }

  const fullText = Array.from(textSpans)
    .map((span) => span.textContent.trim())
    .join(" ");

  const matches = fullText.match(BARKOD_PATTERN);

  if (!matches || !matches.length) {
    return { success: false, error: "Tebligat metninde PTT barkod numarası tespit edilemedi." };
  }

  // Birden fazla eşleşme varsa ilkini al (tebligat numarası)
  const barkodNo = matches[0];
  return { success: true, barkodNo, allMatches: matches };
}

// Popup'tan gelen mesajı dinle
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_BARKOD") {
    const result = extractBarkodFromDOM();
    sendResponse(result);
  }
  return true; // async response için
});
