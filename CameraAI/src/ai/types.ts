export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardDetection {
  id: string;
  label: string;
  score: number;
  box: BoundingBox;
  source: "onnx" | "mock";
}

export interface InferenceFrame {
  imageData: ImageData;
  sourceWidth: number;
  sourceHeight: number;
}

export interface InferenceAdapter {
  readonly name: string;
  initialize(): Promise<void>;
  detect(frame: InferenceFrame): Promise<CardDetection[]>;
  dispose(): Promise<void> | void;
}