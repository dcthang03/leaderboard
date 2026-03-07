const video = document.getElementById("video");
const canvas = document.getElementById("captureCanvas");
const startBtn = document.getElementById("startBtn");
const scanBtn = document.getElementById("scanBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const jsonOutput = document.getElementById("jsonOutput");

let stream = null;
const scannedCards = [];

const suitMap = [
  { keys: ["SPADE", "SPADES", "♠"], value: "S" },
  { keys: ["HEART", "HEARTS", "♥"], value: "H" },
  { keys: ["DIAMOND", "DIAMONDS", "♦"], value: "D" },
  { keys: ["CLUB", "CLUBS", "♣"], value: "C" },
];

const rankMap = [
  { keys: ["A", "ACE"], value: "A" },
  { keys: ["K", "KING"], value: "K" },
  { keys: ["Q", "QUEEN"], value: "Q" },
  { keys: ["J", "JACK"], value: "J" },
  { keys: ["10", "T"], value: "10" },
  { keys: ["9"], value: "9" },
  { keys: ["8"], value: "8" },
  { keys: ["7"], value: "7" },
  { keys: ["6"], value: "6" },
  { keys: ["5"], value: "5" },
  { keys: ["4"], value: "4" },
  { keys: ["3"], value: "3" },
  { keys: ["2"], value: "2" },
];

function updateStatus(msg) {
  statusEl.textContent = msg;
}

function isLikelyInsecureContext() {
  const isHttps = location.protocol === "https:";
  const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const hasSecureContext = typeof window.isSecureContext === "boolean" ? window.isSecureContext : false;
  return !(isHttps || isLocalhost || hasSecureContext);
}

function getUserMediaCompat(constraints) {
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  const legacy =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  if (!legacy) {
    return Promise.reject(new Error("Trinh duyet khong ho tro getUserMedia"));
  }

  return new Promise((resolve, reject) => legacy.call(navigator, constraints, resolve, reject));
}

function renderJson() {
  jsonOutput.textContent = JSON.stringify(scannedCards, null, 2);
}

async function startRearCamera() {
  if (isLikelyInsecureContext()) {
    updateStatus("Can HTTPS de mo camera tren iPhone. Hay dung tunnel HTTPS (ngrok/Cloudflare) hoac host co SSL.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia && !navigator.webkitGetUserMedia) {
    updateStatus("Trinh duyet khong ho tro camera API (getUserMedia).");
    return;
  }

  try {
    stream = await getUserMediaCompat({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();

    scanBtn.disabled = false;
    stopBtn.disabled = false;
    startBtn.disabled = true;
    updateStatus("Camera da bat. Dua la bai vao khung roi bam Quet la bai.");
  } catch (err) {
    updateStatus(`Khong mo duoc camera: ${err.message}`);
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  video.srcObject = null;
  scanBtn.disabled = true;
  stopBtn.disabled = true;
  startBtn.disabled = false;
  updateStatus("Da tat camera.");
}

function normalizeOCR(rawText) {
  const text = rawText.toUpperCase().replace(/\s+/g, " ").trim();
  const compact = text.replace(/[^A-Z0-9♠♥♦♣]/g, "");

  let suit = null;
  for (const s of suitMap) {
    if (s.keys.some((k) => text.includes(k))) {
      suit = s.value;
      break;
    }
  }

  let rank = null;
  for (const r of rankMap) {
    if (r.keys.some((k) => new RegExp(`(^|[^A-Z0-9])${k}([^A-Z0-9]|$)`).test(text) || text.includes(k))) {
      rank = r.value;
      break;
    }
  }

  if (!rank || !suit) {
    const codeMatch = compact.match(/(10|[2-9AJQKT])([SHDC])/);
    if (codeMatch) {
      rank = rank ?? (codeMatch[1] === "T" ? "10" : codeMatch[1]);
      suit = suit ?? codeMatch[2];
    }
  }

  if (!rank || !suit) {
    const suitSymbol = compact.match(/[♠♥♦♣]/)?.[0];
    if (!suit && suitSymbol) {
      suit = suitMap.find((s) => s.keys.includes(suitSymbol))?.value ?? null;
    }

    if (!rank) {
      const rankToken = compact.match(/10|[2-9AJQKT]/)?.[0] ?? null;
      if (rankToken) {
        rank = rankToken === "T" ? "10" : rankToken;
      }
    }

    if (!suit) {
      const suitToken = compact.match(/[SHDC]/)?.[0] ?? null;
      if (suitToken) suit = suitToken;
    }
  }

  return { rank, suit, normalized: rank && suit ? `${rank}${suit}` : null, ocrText: text };
}

async function scanCard() {
  if (!video.videoWidth || !video.videoHeight) {
    updateStatus("Camera chua san sang.");
    return;
  }

  updateStatus("Dang quet... giu may on dinh 1-2 giay.");
  scanBtn.disabled = true;

  const width = video.videoWidth;
  const height = video.videoHeight;
  const cropW = Math.floor(width * 0.35);
  const cropH = Math.floor(height * 0.42);

  canvas.width = cropW;
  canvas.height = cropH;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, cropW, cropH, 0, 0, cropW, cropH);

  try {
    const result = await Tesseract.recognize(canvas, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          updateStatus(`Dang OCR: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const parsed = normalizeOCR(result.data.text || "");
    const item = {
      id: crypto.randomUUID(),
      scannedAt: new Date().toISOString(),
      rawText: parsed.ocrText,
      rank: parsed.rank,
      suit: parsed.suit,
      cardCode: parsed.normalized,
      source: "iphone-rear-camera",
    };

    scannedCards.unshift(item);
    renderJson();

    if (item.cardCode) {
      updateStatus(`Nhan dien: ${item.cardCode}`);
    } else {
      updateStatus("Khong nhan dien chac chan. Kiem tra anh va thu quet lai.");
    }
  } catch (err) {
    updateStatus(`Loi OCR: ${err.message}`);
  } finally {
    scanBtn.disabled = false;
  }
}

startBtn.addEventListener("click", startRearCamera);
scanBtn.addEventListener("click", scanCard);
stopBtn.addEventListener("click", stopCamera);
window.addEventListener("beforeunload", stopCamera);

renderJson();
