import {
  BingImagery,
  CanvasTarget,
  Ellipsoid,
  Engine,
  fromDegrees,
  ionDefaults,
  resolveIonAsset,
  type Tileset3D,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import "./hitch.css";
import { NEEDS_TOKEN, userToken } from "./suite/ionToken.ts";

/**
 * Hitch benchmark (plan §15, r27): a live world takes content in and out
 * while it renders, as an application does. Each step (add or remove a
 * tileset, a camera jump into an uncached area) is measured from the
 * action until everything has settled: frames over 34 ms (two vsyncs at
 * 60 Hz), the worst frame, and long animation frames (over 50 ms of
 * main-thread work, with the script that ran longest). Headless frame
 * pacing can stretch an idle frame, so long animation frames are the
 * measure of our own work; frame gaps show what a user would see.
 */

const TEMPLATE = `
<h1>Hitch benchmark: content in and out of a live world</h1>
<p>
  One world rendering continuously into a canvas while tilesets are added
  and removed and the camera jumps into uncached areas. Per step: frames
  over 34 ms, the worst frame, and the browser's long animation frames (over
  50 ms, with the script that ran longest). Needs an ion token (Dyno's, or VITE_ION_TOKEN in dev).
</p>
<div class="status">Run to step through adds, removes and jumps.</div>
<div class="hitch">
  <canvas data-id="canvas" width="960" height="540"></canvas>
  <table data-id="results"></table>
</div>`;

/** Where the page is mounted (harness `mount`). */
let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const deg = Math.PI / 180;

interface Row {
  step: string;
  ms: number;
  frames: number;
  over34: number;
  worst: number;
  p99: number;
  longFrames: number;
  worstBlocking: number;
  culprit: string;
}

/** Long animation frames (Chrome) seen since the last read. */
interface LongFrame {
  duration: number;
  blockingDuration: number;
  scripts: Array<{
    duration: number;
    sourceURL: string;
    sourceFunctionName: string;
    invoker: string;
  }>;
}
const longFrames: LongFrame[] = [];

/** The run in progress: its engine and frame watch, stopped by `dispose`. */
interface Run {
  engine?: Engine;
  unwatch: () => void;
}
let active: Run | undefined;

/** Frame intervals from requestAnimationFrame, recorded while `recording`. */
const frames: number[] = [];
let recording = false;

/**
 * Starts watching frames (intervals and long animation frames) for a run;
 * returns the function that stops it.
 */
function watchFrames(): () => void {
  let observer: PerformanceObserver | undefined;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longFrames.push(entry as unknown as LongFrame);
      }
    });
    observer.observe({ type: "long-animation-frame", buffered: false });
  } catch {
    // Not supported: the long-frame columns stay empty.
  }
  let last = performance.now();
  let handle = 0;
  const tick = (t: number) => {
    if (recording) {
      frames.push(t - last);
    }
    last = t;
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(handle);
    observer?.disconnect();
    recording = false;
  };
}

async function measure(
  step: string,
  action: () => Promise<void> | void,
  settled: () => boolean,
): Promise<Row> {
  frames.length = 0;
  longFrames.length = 0;
  recording = true;
  const start = performance.now();
  await action();
  // Settled for half a second, or 20 s at most.
  let since = 0;
  while (active && performance.now() - start < 20000) {
    await new Promise((r) => setTimeout(r, 100));
    since = settled() ? since + 100 : 0;
    if (since >= 500) {
      break;
    }
  }
  recording = false;
  const ms = performance.now() - start;
  const sorted = [...frames].sort((a, b) => a - b);
  const blocking = longFrames.map((f) => f.blockingDuration);
  const top = longFrames
    .flatMap((f) => f.scripts)
    .sort((a, b) => b.duration - a.duration)[0];
  return {
    step,
    ms,
    frames: frames.length,
    over34: frames.filter((f) => f > 34).length,
    worst: sorted[sorted.length - 1] ?? 0,
    p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
    longFrames: longFrames.length,
    worstBlocking: blocking.length ? Math.max(...blocking) : 0,
    culprit: top
      ? `${top.sourceFunctionName || top.invoker} ${top.sourceURL.replace(/^.*\/(src|bench|parity)\//, "$1/")} ${top.duration.toFixed(0)} ms`
      : "",
  };
}

function stop(run: Run): void {
  if (active !== run) {
    return; // already stopped by `dispose`
  }
  active = undefined;
  run.unwatch();
  run.engine?.destroy();
}

async function runHitch(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const token = userToken();
  if (!token) {
    throw new Error(`The hitch benchmark ${NEEDS_TOKEN}`);
  }
  ionDefaults.accessToken = token;
  const run: Run = { unwatch: watchFrames() };
  active = run;
  try {
    return await steps(run, status);
  } finally {
    stop(run);
  }
}

async function steps(run: Run, status: Element): Promise<Row[]> {
  const engine = await Engine.create();
  run.engine = engine;
  const world = engine.createWorld({
    maxDraws: 1 << 16,
    maxMaterials: 1 << 13,
    vertexBytes: 512 << 20,
    indexBytes: 256 << 20,
  });
  const canvas = $<HTMLCanvasElement>("canvas");
  const view = engine.addView({ target: new CanvasTarget(canvas), world });
  engine.start();
  const look = (lon: number, lat: number, heading = 30, range = 1500) => {
    const target = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(lon, lat, 0),
      new Float64Array(3),
    );
    view.camera.near = 1;
    view.camera.lookAt(target, heading * deg, -25 * deg, range);
  };
  const tilesets = new Set<Tileset3D>();
  const settled = () =>
    [...tilesets].every(
      (t) =>
        !t.show ||
        (t.idle && t.stats.inFlight === 0 && !(t.imagery?.busy ?? false)),
    );
  const add = async (asset: number) => {
    const resolved = await resolveIonAsset(asset);
    const t = await engine.addTileset(world, resolved.url, {
      headers: resolved.headers,
    });
    tilesets.add(t);
    return t;
  };
  const rows: Row[] = [];
  const step = async (
    name: string,
    action: () => Promise<void> | void,
  ): Promise<void> => {
    if (active !== run) {
      throw new Error("stopped");
    }
    status.textContent = `${name}…`;
    rows.push(await measure(name, action, settled));
    renderTable(rows);
  };

  // Terrain with imagery, then content on it.
  look(-73.9857, 40.7484);
  let terrain: Tileset3D | undefined;
  await step("add terrain + imagery", async () => {
    const [ion, imagery] = await Promise.all([
      resolveIonAsset(1),
      BingImagery.fromIon(2),
    ]);
    terrain = await engine.addTerrain(world, ion.url, {
      headers: ion.headers,
      imagery,
    });
    tilesets.add(terrain);
  });
  let osm: Tileset3D | undefined;
  await step("add OSM Buildings", async () => {
    osm = await add(96188);
  });
  await step("jump (OSM + terrain)", () => look(-74.009, 40.713, 200));
  await step("jump (OSM + terrain)", () => look(-73.9654, 40.7829, 120));
  // Photorealistic tiles: the globe hides beneath them.
  let google: Tileset3D | undefined;
  await step("add Google 3D Tiles", async () => {
    terrain!.show = false;
    osm!.show = false;
    google = await add(2275207);
  });
  await step("jump (Google)", () => look(-73.9442, 40.6782, 60));
  await step("jump (Google)", () => look(-74.0445, 40.6892, 300));
  await step("show OSM over Google", () => {
    osm!.show = true;
  });
  await step("jump (Google + OSM)", () => look(-73.99, 40.73, 200));
  await step("remove Google", () => {
    engine.removeTileset(google!);
    tilesets.delete(google!);
    terrain!.show = true;
  });
  await step("remove OSM", () => {
    engine.removeTileset(osm!);
    tilesets.delete(osm!);
  });
  status.textContent = "done";
  return rows;
}

function renderTable(rows: Row[]): void {
  $("results").innerHTML =
    `<tr><th>step</th><th>until settled</th><th>frames</th><th>&gt; 34 ms</th><th>worst</th><th>p99</th><th>long frames</th><th>worst blocking</th><th>longest script</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.step}</td><td>${(r.ms / 1000).toFixed(1)} s</td><td>${r.frames}</td><td>${r.over34}</td>` +
          `<td>${r.worst.toFixed(0)} ms</td><td>${r.p99.toFixed(0)} ms</td><td>${r.longFrames}</td>` +
          `<td>${r.worstBlocking.toFixed(0)} ms</td><td class="text">${r.culprit}</td></tr>`,
      )
      .join("")}`;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return {
      run: runHitch,
      dispose() {
        if (active) {
          stop(active);
        }
      },
    };
  },
};
