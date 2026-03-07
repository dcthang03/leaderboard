export interface CameraConfig {
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
}

export class CameraService {
  private stream: MediaStream | null = null;

  public async start(video: HTMLVideoElement, config?: CameraConfig): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: config?.width ?? 1280 },
        height: { ideal: config?.height ?? 720 },
        facingMode: { ideal: config?.facingMode ?? "environment" },
      },
      audio: false,
    });

    video.srcObject = this.stream;
    await video.play();
  }

  public stop(video: HTMLVideoElement): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    video.srcObject = null;
  }
}