import { ensureOpenCvReady } from "./opencvLoader";

interface PreprocessOptions {
  targetWidth: number;
  targetHeight: number;
  useOpenCv?: boolean;
}

const scratchCanvas = document.createElement("canvas");
const scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: true });

export async function preprocessFrame(video: HTMLVideoElement, options: PreprocessOptions): Promise<ImageData> {
  if (!scratchContext) {
    throw new Error("Canvas 2D context unavailable for preprocessing");
  }

  scratchCanvas.width = options.targetWidth;
  scratchCanvas.height = options.targetHeight;

  scratchContext.drawImage(video, 0, 0, options.targetWidth, options.targetHeight);

  if (options.useOpenCv) {
    const ready = await ensureOpenCvReady();
    if (ready) {
      const base = scratchContext.getImageData(0, 0, options.targetWidth, options.targetHeight);
      // OpenCV stays optional and utility-only; this grayscale preprocessing can be swapped for blur/warp/crop later.
      return toGrayscaleImageData(base);
    }
  }

  return scratchContext.getImageData(0, 0, options.targetWidth, options.targetHeight);
}

function toGrayscaleImageData(input: ImageData): ImageData {
  const out = new Uint8ClampedArray(input.data);
  for (let i = 0; i < out.length; i += 4) {
    const gray = Math.round(0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2]);
    out[i] = gray;
    out[i + 1] = gray;
    out[i + 2] = gray;
  }

  return new ImageData(out, input.width, input.height);
}