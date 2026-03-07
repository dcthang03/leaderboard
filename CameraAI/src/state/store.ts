import type { CardDetection } from "../ai/types";

export interface AppState {
  running: boolean;
  status: string;
  frameMs: number;
  detections: CardDetection[];
  provider: string;
  mode: "onnx" | "mock";
  logs: string[];
}

type Listener = (state: AppState) => void;

export function createAppStore(initial?: Partial<AppState>) {
  let state: AppState = {
    running: false,
    status: "Idle",
    frameMs: 0,
    detections: [],
    provider: "unknown",
    mode: "mock",
    logs: [],
    ...initial,
  };

  const listeners = new Set<Listener>();

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    getState(): AppState {
      return state;
    },
    setState(patch: Partial<AppState>): void {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener(state));
    },
    appendLog(line: string): void {
      const lines = [line, ...state.logs].slice(0, 15);
      state = { ...state, logs: lines };
      listeners.forEach((listener) => listener(state));
    },
  };
}