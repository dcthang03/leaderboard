import type { CardDetection, InferenceAdapter, InferenceFrame } from "../types";

const labels = ["AS", "KH", "QC", "10D", "7S"];

export class MockCardDetector implements InferenceAdapter {
  public readonly name = "MockCardDetector";
  private frameCount = 0;

  public async initialize(): Promise<void> {
    return;
  }

  public async detect(frame: InferenceFrame): Promise<CardDetection[]> {
    this.frameCount += 1;
    const t = this.frameCount * 0.03;
    const w = frame.sourceWidth;
    const h = frame.sourceHeight;

    const boxWidth = Math.max(120, Math.round(w * 0.2));
    const boxHeight = Math.max(160, Math.round(h * 0.28));
    const x = Math.round((w * 0.35) + Math.sin(t) * w * 0.08);
    const y = Math.round((h * 0.2) + Math.cos(t * 1.3) * h * 0.06);

    return [
      {
        id: crypto.randomUUID(),
        label: labels[this.frameCount % labels.length],
        score: 0.8 + (Math.sin(t * 2) * 0.1),
        box: { x, y, width: boxWidth, height: boxHeight },
        source: "mock",
      },
    ];
  }

  public async dispose(): Promise<void> {
    return;
  }
}