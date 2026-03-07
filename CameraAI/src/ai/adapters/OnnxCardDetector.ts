import * as ort from "onnxruntime-web";
import type { CardDetection, InferenceAdapter, InferenceFrame } from "../types";

interface OnnxOptions {
  modelUrl: string;
  inputSize?: number;
  confidenceThreshold?: number;
}

export class OnnxCardDetector implements InferenceAdapter {
  public readonly name = "OnnxCardDetector";
  private readonly modelUrl: string;
  private readonly inputSize: number;
  private readonly confidenceThreshold: number;
  private session: ort.InferenceSession | null = null;
  private provider: "webgpu" | "wasm" = "wasm";

  public constructor(options: OnnxOptions) {
    this.modelUrl = options.modelUrl;
    this.inputSize = options.inputSize ?? 640;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.45;
  }

  public async initialize(): Promise<void> {
    ort.env.wasm.simd = true;
    ort.env.wasm.proxy = true;

    this.session = await this.createSession();
  }

  private async createSession(): Promise<ort.InferenceSession> {
    try {
      const session = await ort.InferenceSession.create(this.modelUrl, {
        executionProviders: ["webgpu", "wasm"],
      });
      this.provider = "webgpu";
      return session;
    } catch {
      const session = await ort.InferenceSession.create(this.modelUrl, {
        executionProviders: ["wasm"],
      });
      this.provider = "wasm";
      return session;
    }
  }

  public async detect(frame: InferenceFrame): Promise<CardDetection[]> {
    if (!this.session) {
      throw new Error("ONNX session is not initialized");
    }

    const inputName = this.session.inputNames[0];
    const outputName = this.session.outputNames[0];
    const tensor = this.toTensor(frame.imageData);
    const output = await this.session.run({ [inputName]: tensor });
    const raw = output[outputName]?.data;
    if (!raw || !(raw instanceof Float32Array)) {
      return [];
    }

    return this.decodeYoloStyle(raw, frame.sourceWidth, frame.sourceHeight);
  }

  private toTensor(imageData: ImageData): ort.Tensor {
    const { data, width, height } = imageData;
    const channels = 3;
    const floatData = new Float32Array(channels * width * height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const pixelIndex = (y * width + x) * 4;
        const tensorIndex = y * width + x;
        floatData[tensorIndex] = data[pixelIndex] / 255;
        floatData[width * height + tensorIndex] = data[pixelIndex + 1] / 255;
        floatData[2 * width * height + tensorIndex] = data[pixelIndex + 2] / 255;
      }
    }

    return new ort.Tensor("float32", floatData, [1, 3, height, width]);
  }

  private decodeYoloStyle(raw: Float32Array, sourceWidth: number, sourceHeight: number): CardDetection[] {
    const stride = 6;
    const detections: CardDetection[] = [];

    for (let i = 0; i <= raw.length - stride; i += stride) {
      const cx = raw[i];
      const cy = raw[i + 1];
      const w = raw[i + 2];
      const h = raw[i + 3];
      const score = raw[i + 4];
      const classId = Math.round(raw[i + 5]);

      if (score < this.confidenceThreshold) {
        continue;
      }

      const scaleX = sourceWidth / this.inputSize;
      const scaleY = sourceHeight / this.inputSize;

      detections.push({
        id: crypto.randomUUID(),
        label: `class_${classId}`,
        score,
        box: {
          x: (cx - w / 2) * scaleX,
          y: (cy - h / 2) * scaleY,
          width: w * scaleX,
          height: h * scaleY,
        },
        source: "onnx",
      });
    }

    return detections;
  }

  public async dispose(): Promise<void> {
    this.session?.release();
    this.session = null;
  }

  public getProvider(): "webgpu" | "wasm" {
    return this.provider;
  }
}