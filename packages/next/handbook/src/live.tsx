import { useEffect, useRef, useState } from "react";
import still from "../shots/live-globe.webp?inline";

/**
 * A live 2.0 globe inside the page. The engine is inert text in the built
 * file until a reader asks for it, so reading the handbook uses no GPU and
 * parses none of it. It draws nothing out of view, and ends on leaving the tab.
 */
interface LiveGlobe {
  setHour(hour: number): void;
  look(where: "earth" | "towers"): void;
  setActive(active: boolean): void;
  dispose(): void;
}

type StartLiveGlobe = (
  canvas: HTMLCanvasElement,
  onLost: (message: string) => void,
) => Promise<LiveGlobe>;

async function loadEngine(): Promise<StartLiveGlobe> {
  if (import.meta.env.DEV) {
    return (await import("../viewer/main.ts")).startLiveGlobe;
  }
  const code = document.getElementById("live-engine")?.textContent;
  if (!code) {
    throw new Error("This copy of the page has no live engine in it.");
  }
  const url = URL.createObjectURL(
    new Blob([code], { type: "text/javascript" }),
  );
  try {
    const module = (await import(/* @vite-ignore */ url)) as {
      startLiveGlobe: StartLiveGlobe;
    };
    return module.startLiveGlobe;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type State =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "running" }
  | { kind: "paused" }
  | { kind: "unavailable"; why: string }
  | { kind: "lost"; why: string }
  | { kind: "failed"; why: string };

/** Whether this browser can run it, before anything loads. */
async function webgpuProblem(): Promise<string | undefined> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
  if (!gpu) {
    return "This browser doesn't offer WebGPU here.";
  }
  const adapter = await gpu.requestAdapter().catch(() => null);
  return adapter
    ? undefined
    : "This browser offers WebGPU, but no GPU adapter.";
}

export function LiveGlobeFigure() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [hour, setHour] = useState(10.5);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const live = useRef<LiveGlobe | undefined>(undefined);

  const start = async () => {
    setState({ kind: "starting" });
    const problem = await webgpuProblem();
    if (problem) {
      setState({ kind: "unavailable", why: problem });
      return;
    }
    try {
      const startLive = await loadEngine();
      live.current = await startLive(canvas.current!, (message) => {
        live.current = undefined;
        setState({ kind: "lost", why: message });
      });
      (globalThis as { __handbookLive?: LiveGlobe }).__handbookLive =
        live.current;
      setState({ kind: "running" });
    } catch (error) {
      setState({ kind: "failed", why: (error as Error).message });
    }
  };

  // Out of view, it draws nothing. Leaving the tab ends it.
  useEffect(() => {
    if (!box.current) {
      return undefined;
    }
    const seen = new IntersectionObserver(([entry]) => {
      const engine = live.current;
      if (engine && entry) {
        engine.setActive(entry.isIntersecting);
        setState((s) =>
          s.kind === "running" || s.kind === "paused"
            ? { kind: entry.isIntersecting ? "running" : "paused" }
            : s,
        );
      }
    });
    seen.observe(box.current);
    return () => {
      seen.disconnect();
      live.current?.dispose();
      live.current = undefined;
    };
  }, []);

  const stop = () => {
    live.current?.dispose();
    live.current = undefined;
    setState({ kind: "idle" });
  };

  const running = state.kind === "running" || state.kind === "paused";
  const shown = running || state.kind === "starting";
  const message =
    state.kind === "unavailable"
      ? `${state.why} The picture shows what it draws.`
      : state.kind === "lost"
        ? `The GPU device was lost, so the live view has stopped: ${state.why} It doesn't retry. Reload the page to try again.`
        : state.kind === "failed"
          ? `The live view couldn't start${state.why ? `: ${state.why}` : "."} The picture shows what it draws.`
          : undefined;

  return (
    <div className="live" ref={box}>
      <div className="live-stage">
        {!shown ? (
          <img
            src={still}
            alt="The globe as the live view draws it: Natural Earth imagery under an atmosphere, lit by the sun."
          />
        ) : null}
        <canvas
          ref={canvas}
          className={shown ? undefined : "live-hidden"}
          aria-label="Live view of the globe. Drag to orbit."
        />
        {state.kind === "idle" ? (
          <button
            type="button"
            className="live-start"
            onClick={() => void start()}
          >
            Start the live view
          </button>
        ) : null}
        {state.kind === "starting" ? (
          <p className="live-note" role="status">
            Starting…
          </p>
        ) : null}
      </div>
      {message ? (
        <p className="live-message" role="alert">
          {message}
        </p>
      ) : null}
      {running ? (
        <div className="live-controls">
          <label>
            Time of day
            <input
              type="range"
              min={0}
              max={24}
              step={0.25}
              value={hour}
              onChange={(e) => {
                const next = Number(e.target.value);
                setHour(next);
                live.current?.setHour(next);
              }}
            />
            <output>
              {String(Math.floor(hour)).padStart(2, "0")}:
              {String(Math.round((hour % 1) * 60)).padStart(2, "0")}
            </output>
          </label>
          <button type="button" onClick={() => live.current?.look("earth")}>
            Whole Earth
          </button>
          <button type="button" onClick={() => live.current?.look("towers")}>
            The towers
          </button>
          <button type="button" onClick={stop}>
            Stop
          </button>
        </div>
      ) : null}
    </div>
  );
}
