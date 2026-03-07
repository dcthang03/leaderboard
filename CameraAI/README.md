# Realtime Poker Card Detection (Browser AI Foundation)

This repo is now a **Vite + TypeScript** foundation for realtime poker card detection in the browser.

## What is included

- `getUserMedia` camera pipeline (rear camera preferred)
- ONNX Runtime Web adapter with **WebGPU preference** and automatic **WASM fallback**
- OpenCV.js loader and preprocessing utility hook (optional, utility-only)
- Mock inference adapter when no real ONNX model is configured
- Overlay/debug UI for live boxes, score labels, FPS, logs, and raw detections
- Modular folders: `camera`, `ai`, `vision`, `state`, `services`

## Project structure

```text
src/
  ai/
    adapters/
      MockCardDetector.ts
      OnnxCardDetector.ts
    createInferenceAdapter.ts
    types.ts
  camera/
    CameraService.ts
  services/
    overlay.ts
  state/
    store.ts
  vision/
    opencvLoader.ts
    preprocess.ts
  main.ts
  styles.css
```

## Windows setup and run

### 1. Install dependencies

```powershell
cd D:\2.Rivebase-Staging\leaderboard\CameraAI
npm install
```

### 2. Run dev server

```powershell
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

### 3. Build check

```powershell
npm run build
```

## Configure a real ONNX model

By default, the app uses mock detections unless `VITE_ONNX_MODEL_URL` is provided.

Create `.env.local`:

```env
VITE_ONNX_MODEL_URL=/models/cards-yolo.onnx
```

Put your ONNX model in `public/models/cards-yolo.onnx` (or use a full URL).

## Current ONNX expectation

`OnnxCardDetector` currently assumes a YOLO-style flattened output decoded as per-row:

`[cx, cy, w, h, confidence, classId]`

If your model output differs, update `decodeYoloStyle()` in `src/ai/adapters/OnnxCardDetector.ts`.

## Future-ready YOLO -> ONNX -> Browser path

1. Train/fine-tune YOLO on poker card classes and export ONNX (fixed input, e.g. 640).
2. Validate ONNX output tensor shape and postprocess expectations.
3. Place model in `public/models/` and set `VITE_ONNX_MODEL_URL`.
4. Map model class IDs to card labels (`AS`, `KH`, etc.) in ONNX adapter decoding.
5. Add NMS and confidence calibration if not baked into model output.
6. Optimize browser runtime: quantized model, stable input size, WebGPU-enabled browser.

## Notes

- Camera access needs secure context (`https://` or `http://localhost`).
- OpenCV.js is optional and only used as a preprocessing utility gate.
- The mock adapter keeps UI and pipeline testable before model integration.