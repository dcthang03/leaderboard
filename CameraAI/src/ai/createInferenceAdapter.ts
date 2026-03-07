import { MockCardDetector } from "./adapters/MockCardDetector";
import { OnnxCardDetector } from "./adapters/OnnxCardDetector";
import type { InferenceAdapter } from "./types";

interface AdapterSelection {
  adapter: InferenceAdapter;
  mode: "onnx" | "mock";
  provider: "webgpu" | "wasm" | "mock";
  notes: string[];
}

interface AdapterOptions {
  modelUrl?: string;
  inputSize?: number;
}

export async function createInferenceAdapter(options: AdapterOptions): Promise<AdapterSelection> {
  const notes: string[] = [];

  if (!options.modelUrl) {
    notes.push("No ONNX model URL configured. Falling back to mock inference.");
    const adapter = new MockCardDetector();
    await adapter.initialize();
    return { adapter, mode: "mock", provider: "mock", notes };
  }

  const onnx = new OnnxCardDetector({ modelUrl: options.modelUrl, inputSize: options.inputSize });
  try {
    await onnx.initialize();
    notes.push(`ONNX adapter active via ${onnx.getProvider()}.`);
    return { adapter: onnx, mode: "onnx", provider: onnx.getProvider(), notes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    notes.push(`Failed to initialize ONNX model: ${message}`);
    notes.push("Using mock inference adapter.");
    const mock = new MockCardDetector();
    await mock.initialize();
    return { adapter: mock, mode: "mock", provider: "mock", notes };
  }
}