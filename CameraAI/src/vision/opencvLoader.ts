let cvReadyPromise: Promise<boolean> | null = null;

export async function ensureOpenCvReady(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if ((window as Window & { cv?: unknown }).cv) {
    return true;
  }

  if (cvReadyPromise) {
    return cvReadyPromise;
  }

  cvReadyPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.10.0/opencv.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return cvReadyPromise;
}