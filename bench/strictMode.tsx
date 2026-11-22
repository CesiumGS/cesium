// A Viewer under React's StrictMode (CS-708): the library user writes the
// plain effect (create, and destroy in the cleanup), StrictMode runs it,
// its cleanup and it again, and the page checks what that cost: WebGPU
// devices made, each frames-store file fetched, and anything said on the
// console. The runner's entry is `runStrictMode` (bench/run.mjs strictMode).
import { StrictMode, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Viewer, type ViewerOptions } from "@cesium/next/ui";
import type { Harness } from "../lab/harness.ts";

const STORE = "/frames-data/";

/** What the page counts from mount on. */
interface Counts {
  devices: number;
  creates: number;
  destroys: number;
  console: string[];
}

const counts: Counts = { devices: 0, creates: 0, destroys: 0, console: [] };

// Devices, counted where WebGPU makes them (before any engine asks).
const adapterProto = (globalThis as { GPUAdapter?: { prototype: GPUAdapter } })
  .GPUAdapter?.prototype;
if (adapterProto) {
  const requestDevice = adapterProto.requestDevice;
  adapterProto.requestDevice = function (
    this: GPUAdapter,
    ...args: Parameters<GPUAdapter["requestDevice"]>
  ) {
    counts.devices++;
    return requestDevice.apply(this, args);
  };
}

// The frames store's requests, from this module's load on (an observer
// sees every entry, whatever the resource timing buffer holds).
const storeRequests: string[] = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
    const path = new URL(entry.name).pathname;
    if (path.startsWith(STORE)) {
      storeRequests.push(path.slice(STORE.length));
    }
  }
}).observe({ type: "resource", buffered: true });

/**
 * The viewer as an application would make it: nothing that needs an ion
 * token, and the default star map (not the dev server's local sky pack,
 * which varies by machine).
 */
const OPTIONS: ViewerOptions = {
  frameData: STORE,
  imagery: false,
  cityLights: false,
  timeControls: false,
  skyPack: null,
};

const TEMPLATE = `
<h1>A Viewer under StrictMode</h1>
<p>
  React's StrictMode runs an effect, its cleanup and the effect again. This
  page's effect is the plain one an application writes: <code>Viewer.create</code>,
  and <code>destroy</code> in the cleanup. It checks that the second run
  costs no second WebGPU device, that each frames-store file is fetched
  once, and that the console stays clean.
</p>
<div class="status">Run to mount the viewer.</div>
<div data-id="viewer" class="strict-viewer"
  style="position: relative; height: 360px; border-radius: 6px; overflow: hidden"></div>`;

function StrictViewer({ onViewer }: { onViewer: (viewer: Viewer) => void }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let canceled = false;
    let viewer: Viewer | undefined;
    counts.creates++;
    Viewer.create(container.current!, OPTIONS).then(
      (made) => {
        if (canceled) {
          counts.destroys++;
          made.destroy();
          return;
        }
        viewer = made;
        onViewer(made);
      },
      (error: unknown) => {
        if (!canceled) {
          counts.console.push(`create: ${String(error)}`);
        }
      },
    );
    return () => {
      canceled = true;
      if (viewer) {
        counts.destroys++;
        viewer.destroy();
      }
    };
  }, [onViewer]);
  return <div ref={container} style={{ width: "100%", height: "100%" }} />;
}

/** What `runStrictMode` reports. */
export interface StrictModeResult {
  ok: boolean;
  effects: { creates: number; destroys: number };
  devices: number;
  /** Requests per frames-store file. */
  fetches: Record<string, number>;
  /** Files asked for more than once. */
  repeated: string[];
  framesRendered: number;
  frameData: boolean;
  console: string[];
}

export const harness: Harness = {
  mount(root) {
    root.innerHTML = TEMPLATE;
    const status = root.querySelector<HTMLElement>(".status")!;
    const host = root.querySelector<HTMLElement>('[data-id="viewer"]')!;
    let react: Root | undefined;
    // What the console says while it runs (errors and warnings).
    const saved = { error: console.error, warn: console.warn };
    const said =
      (kind: "error" | "warn") =>
      (...args: unknown[]) => {
        counts.console.push(`${kind}: ${args.map(String).join(" ")}`);
        saved[kind].apply(console, args);
      };
    const onError = (event: ErrorEvent) =>
      counts.console.push(`error: ${event.message}`);
    const onRejection = (event: PromiseRejectionEvent) =>
      counts.console.push(`unhandled rejection: ${String(event.reason)}`);

    const run = async (): Promise<StrictModeResult> => {
      console.error = said("error");
      console.warn = said("warn");
      addEventListener("error", onError);
      addEventListener("unhandledrejection", onRejection);
      const devicesBefore = counts.devices;
      status.textContent = "Mounting under StrictMode…";
      const viewer = await new Promise<Viewer>((resolve) => {
        react = createRoot(host);
        react.render(
          <StrictMode>
            <StrictViewer onViewer={resolve} />
          </StrictMode>,
        );
      });
      const data = await viewer.frameData;
      // Drawn: the first frames, then a moment for late loads to settle.
      const start = performance.now();
      while (
        viewer.engine.stats.framesRendered < 2 &&
        performance.now() - start < 10_000
      ) {
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, 500));
      const fetches: Record<string, number> = {};
      for (const file of storeRequests) {
        fetches[file] = (fetches[file] ?? 0) + 1;
      }
      const repeated = Object.entries(fetches)
        .filter(([file, n]) => n > 1 && file !== "manifest.json")
        .map(([file]) => file);
      const result: StrictModeResult = {
        effects: { creates: counts.creates, destroys: counts.destroys },
        devices: counts.devices - devicesBefore,
        fetches,
        repeated,
        framesRendered: viewer.engine.stats.framesRendered,
        frameData: data !== undefined,
        console: [...counts.console],
        ok: false,
      };
      result.ok =
        result.effects.creates === 2 &&
        result.devices === 1 &&
        repeated.length === 0 &&
        result.framesRendered > 0 &&
        result.console.length === 0;
      status.textContent = result.ok
        ? `Clean: ${result.effects.creates} effect runs, ${result.devices} device, each frames-store file fetched once, nothing on the console.`
        : `Not clean: ${result.devices} devices, repeated ${repeated.join(", ") || "none"}, ${result.console.length} console messages (see the result).`;
      return result;
    };
    return {
      run,
      dispose: () => {
        react?.unmount();
        console.error = saved.error;
        console.warn = saved.warn;
        removeEventListener("error", onError);
        removeEventListener("unhandledrejection", onRejection);
      },
    };
  },
};
