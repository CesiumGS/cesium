import type { Harness } from "../lab/harness.ts";
import "./worker.css";

const TEMPLATE = `
<h1>Engine in a worker (OffscreenCanvas)</h1>
<p>
  The whole engine runs in a dedicated worker and renders into a transferred
  OffscreenCanvas; the camera orbits on its own. "Block main thread"
  busy-waits the page for 3 s: the scene keeps animating because nothing
  runs on the main thread.
</p>
<div class="status">Run to start the worker.</div>
<div class="worker">
  <canvas data-id="view"></canvas>
  <button data-id="block" disabled>Block main thread for 3 s</button>
  <pre data-id="stats"></pre>
</div>`;

/** Where the page is mounted (harness `mount`). */
let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

/** The engine's worker, once started; `dispose` terminates it. */
let worker: Worker | undefined;

/** Starts the engine in a worker; resolves with its first report. */
function runWorker(): Promise<string> {
  if (worker) {
    return Promise.resolve($("stats").textContent ?? "");
  }
  const status = root.querySelector(".status")!;
  const stats = $("stats");
  status.textContent = "starting worker…";
  const canvas = $<HTMLCanvasElement>("view");
  const dpr = devicePixelRatio;
  const offscreen = canvas.transferControlToOffscreen();
  offscreen.width = Math.round(canvas.clientWidth * dpr);
  offscreen.height = Math.round(canvas.clientHeight * dpr);

  const started = new Worker(new URL("./engine-worker.ts", import.meta.url), {
    type: "module",
  });
  worker = started;
  started.postMessage({ type: "init", canvas: offscreen }, [offscreen]);
  $<HTMLButtonElement>("block").disabled = false;
  return new Promise((resolve, reject) => {
    started.onmessage = (event: MessageEvent<{ text: string }>) => {
      stats.textContent = event.data.text;
      status.textContent = "running in a worker";
      resolve(event.data.text);
    };
    started.onerror = (event) => {
      status.textContent = `worker error: ${event.message}`;
      reject(new Error(event.message));
    };
  });
}

function block(): void {
  const until = performance.now() + 3000;
  while (performance.now() < until) {
    // Busy-wait: the main thread cannot run any frame callbacks.
  }
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    $("block").addEventListener("click", block);
    return {
      run: runWorker,
      dispose() {
        worker?.terminate();
        worker = undefined;
      },
    };
  },
};
