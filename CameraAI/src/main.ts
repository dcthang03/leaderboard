import "./styles.css";
import { createInferenceAdapter } from "./ai/createInferenceAdapter";
import type { InferenceAdapter } from "./ai/types";
import { CameraService } from "./camera/CameraService";
import { drawOverlay } from "./services/overlay";
import { createAppStore } from "./state/store";
import { preprocessFrame } from "./vision/preprocess";

const TARGET_SIZE = 640;

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app mount root");
}

app.innerHTML = `
  <main class="shell">
    <header class="top">
      <h1>Realtime Poker Card Detection</h1>
      <p>Browser-only foundation: camera + ONNX Runtime Web + OpenCV preprocessing utilities.</p>
    </header>

    <section class="stage">
      <video id="camera" class="camera" autoplay playsinline muted></video>
      <canvas id="overlay" class="overlay"></canvas>
    </section>

    <section class="controls">
      <button id="start">Start Camera + Inference</button>
      <button id="stop" disabled>Stop</button>
      <label>
        <input id="opencvToggle" type="checkbox" />
        OpenCV preprocess utilities
      </label>
    </section>

    <section class="debug">
      <p><strong>Status:</strong> <span id="status">Idle</span></p>
      <p><strong>Mode:</strong> <span id="mode">mock</span> | <strong>Provider:</strong> <span id="provider">unknown</span></p>
      <p><strong>Frame time:</strong> <span id="frameMs">0</span> ms</p>
      <p><strong>Detections:</strong></p>
      <pre id="detections">[]</pre>
      <p><strong>Logs:</strong></p>
      <pre id="logs">[]</pre>
    </section>
  </main>
`;

function mustQuery<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return el;
}

const cameraEl = mustQuery<HTMLVideoElement>("#camera");
const overlayEl = mustQuery<HTMLCanvasElement>("#overlay");
const startBtn = mustQuery<HTMLButtonElement>("#start");
const stopBtn = mustQuery<HTMLButtonElement>("#stop");
const opencvToggle = mustQuery<HTMLInputElement>("#opencvToggle");
const statusEl = mustQuery<HTMLSpanElement>("#status");
const modeEl = mustQuery<HTMLSpanElement>("#mode");
const providerEl = mustQuery<HTMLSpanElement>("#provider");
const frameMsEl = mustQuery<HTMLSpanElement>("#frameMs");
const detectionsEl = mustQuery<HTMLPreElement>("#detections");
const logsEl = mustQuery<HTMLPreElement>("#logs");

const cameraService = new CameraService();
const store = createAppStore();
let adapter: InferenceAdapter | null = null;
let rafId = 0;
let running = false;
let inFlight = false;

store.subscribe((state) => {
  statusEl.textContent = state.status;
  modeEl.textContent = state.mode;
  providerEl.textContent = state.provider;
  frameMsEl.textContent = state.frameMs.toFixed(1);
  detectionsEl.textContent = JSON.stringify(state.detections, null, 2);
  logsEl.textContent = JSON.stringify(state.logs, null, 2);
});

async function start(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    store.setState({ status: "getUserMedia is not supported in this browser." });
    return;
  }

  store.setState({ status: "Initializing inference adapter..." });
  const modelUrl = typeof import.meta.env.VITE_ONNX_MODEL_URL === "string" ? import.meta.env.VITE_ONNX_MODEL_URL : "";
  const selection = await createInferenceAdapter({ modelUrl, inputSize: TARGET_SIZE });
  adapter = selection.adapter;

  selection.notes.forEach((line) => store.appendLog(line));
  store.setState({ mode: selection.mode, provider: selection.provider, status: "Starting camera..." });

  await cameraService.start(cameraEl, { facingMode: "environment", width: 1280, height: 720 });
  overlayEl.width = cameraEl.videoWidth;
  overlayEl.height = cameraEl.videoHeight;

  running = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  store.setState({ running: true, status: "Live inference running." });

  let lastFrame = performance.now();
  const tick = async () => {
    if (!running || !adapter) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      void tick();
    });

    if (inFlight) {
      return;
    }

    inFlight = true;
    const t0 = performance.now();

    try {
      const imageData = await preprocessFrame(cameraEl, {
        targetWidth: TARGET_SIZE,
        targetHeight: TARGET_SIZE,
        useOpenCv: opencvToggle.checked,
      });
      const detections = await adapter.detect({ imageData, sourceWidth: cameraEl.videoWidth, sourceHeight: cameraEl.videoHeight });
      const t1 = performance.now();
      const frameMs = t1 - t0;
      const fps = 1000 / Math.max(1, t1 - lastFrame);
      lastFrame = t1;

      store.setState({ detections, frameMs, status: `Live inference running (${detections.length} detections)` });
      drawOverlay(overlayEl, detections, fps);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.setState({ status: `Inference error: ${message}` });
      store.appendLog(`Inference loop error: ${message}`);
    } finally {
      inFlight = false;
    }
  };

  await tick();
}

async function stop(): Promise<void> {
  running = false;
  cancelAnimationFrame(rafId);
  cameraService.stop(cameraEl);
  const ctx = overlayEl.getContext("2d");
  ctx?.clearRect(0, 0, overlayEl.width, overlayEl.height);

  if (adapter) {
    await adapter.dispose();
    adapter = null;
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
  store.setState({ running: false, detections: [], status: "Stopped." });
}

startBtn.addEventListener("click", () => {
  void start();
});

stopBtn.addEventListener("click", () => {
  void stop();
});

window.addEventListener("beforeunload", () => {
  void stop();
});
