import type { CardDetection } from "../ai/types";

export function drawOverlay(canvas: HTMLCanvasElement, detections: CardDetection[], fps: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 2;
  ctx.font = "14px Consolas, monospace";

  for (const detection of detections) {
    const { x, y, width, height } = detection.box;
    ctx.strokeStyle = detection.source === "onnx" ? "#00e676" : "#ffd740";
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.strokeRect(x, y, width, height);

    const label = `${detection.label} ${Math.round(detection.score * 100)}%`;
    const labelWidth = ctx.measureText(label).width + 10;
    const labelY = Math.max(0, y - 20);

    ctx.fillRect(x, labelY, labelWidth, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, x + 5, labelY + 13);
  }

  ctx.fillStyle = "rgba(5, 5, 5, 0.55)";
  ctx.fillRect(10, 10, 140, 28);
  ctx.fillStyle = "#64ffda";
  ctx.fillText(`FPS: ${fps.toFixed(1)}`, 18, 30);
}