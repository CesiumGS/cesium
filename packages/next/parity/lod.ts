import {
  Ellipsoid,
  Engine,
  OffscreenTarget,
  fromDegrees,
  resolveIonAsset,
  resolveITwinIModel,
  type TilesetOptions,
  type View,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import ionSource from "../../engine/Source/Core/Ion.js?raw";
import { createGpuFlip, type GpuFlip } from "./flipGpu.ts";

/**
 * FLIP on the GPU: the JS version took about 0.3 s per comparison on the
 * main thread, stalling the very loading it sampled every 500 ms.
 */
let gpuFlip: Promise<GpuFlip> | undefined;
const flip = async (
  reference: Uint8ClampedArray,
  test: Uint8ClampedArray,
  width: number,
  height: number,
) => {
  gpuFlip ??= createGpuFlip();
  return (await gpuFlip).flip(reference, test, width, height);
};

/**
 * L1′ (plan §4): `Budgeted` vs `Stepwise` over camera moves. For each move and
 * policy, a fresh tileset settles at the start camera, then the camera moves;
 * from the move until settled we record requests, GPU bytes, time, and image
 * error (FLIP) at 250 ms, 1 s and settled against a fully refined reference
 * at the end camera.
 *
 * `runLodReference()` renders the references (it also warms the HTTP cache
 * equally for every policy); the runner may then throttle the network before
 * `runLod()`, which measures.
 */

const TEMPLATE = `
<h1>Tile selection L1′: Budgeted vs Stepwise</h1>
<p>
  One camera move per policy: settle far, jump close. Requests, GPU bytes
  and time from the jump until settled, and FLIP against a fully refined
  reference (SSE 2) at 250 ms, 1 s and settled. Lower is better everywhere.
  ?asset=&lt;ion id&gt;&amp;at=lon,lat for real data.
</p>
<div class="status">Run to measure every policy over each camera move.</div>
<table data-id="results"></table>`;

/** Where the page is mounted, and its options (harness `mount`). */
let root: HTMLElement;
let params = new URLSearchParams();
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

/**
 * FLIP samples while loading. 500 ms while FLIP ran in JS; moves that
 * settle in under a second got one or two samples, so whether a policy
 * had converged at 500 ms decided its average (r37).
 */
const SAMPLE_MS = 100;
const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;

interface Policy {
  /** For ?policies= (e.g. stepwise,adaptive: the exit check's pair). */
  id: string;
  label: string;
  options: TilesetOptions;
}

const POLICIES: Policy[] = [
  {
    id: "stepwise",
    label: "Stepwise (1.x, 18 requests)",
    options: { policy: "stepwise", maximumRequests: 18 },
  },
  {
    id: "budgeted-18",
    label: "Budgeted, 18 requests",
    options: { policy: "budgeted", maximumRequests: 18 },
  },
  {
    id: "budgeted-4",
    label: "Budgeted, 4 requests",
    options: { policy: "budgeted", maximumRequests: 4 },
  },
  {
    id: "adaptive",
    label: "Budgeted, adaptive",
    options: { policy: "budgeted" },
  },
  {
    id: "budgeted-64",
    label: "Budgeted, 64 requests",
    options: { policy: "budgeted", maximumRequests: 64 },
  },
];

/** 1.x's public default ion token (Sandcastle's sample assets). */
const DEFAULT_TOKEN = /defaultAccessToken =\s*"([^"]+)"/.exec(ionSource)?.[1];

type Place = (view: View) => void;

interface Scenario {
  name: string;
  start: Place;
  end: Place;
}

interface Row {
  scenario: string;
  policy: string;
  status: string;
  requests?: number;
  megabytes?: number;
  settleMs?: number;
  flip250?: number;
  flip1000?: number;
  /**
   * Mean FLIP over the same horizon for every policy in a move (the slowest
   * settle), each held at its settled image once done: how good it looked
   * over the same N seconds.
   */
  flipAverage?: number;
  /** FLIP every `SAMPLE_MS` until settled, for the common-horizon average. */
  trace?: number[];
  /**
   * The same against the target: the image every policy converges to
   * (`Stepwise` settled at the default SSE). The fully refined reference
   * rewards lingering on finer or coarser content that happens to look
   * more like SSE 2 than the target does: zooming out, the finer content
   * still drawn; design models whose SSE-16 tiles drop elements.
   */
  traceTarget?: number[];
  flipAverageTarget?: number;
  flipSettledTarget?: number;
  flipSettled?: number;
  selected?: number;
  /** Requests and MB by purpose over the move (`Budgeted`'s bands). */
  purposes?: Record<string, { requests: number; megabytes: number }>;
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 16));

interface Source {
  label: string;
  url: string;
  headers?: Record<string, string>;
  scenarios: Scenario[];
}

let sourcePromise: Promise<Source> | undefined;
let enginePromise: Promise<Engine> | undefined;
const references = new Map<string, Uint8ClampedArray>();
const targets = new Map<string, Uint8ClampedArray>();

function engine(): Promise<Engine> {
  enginePromise ??= Engine.create();
  return enginePromise;
}

/** The tileset and its moves: around ?at=lon,lat, else the root volume. */
function source(): Promise<Source> {
  sourcePromise ??= (async () => {
    const asset = params.get("asset");
    const imodel = params.get("imodel");
    const at = params.get("at")?.split(",").map(Number);
    let url = new URL(
      "/specs-data/Cesium3DTiles/Tilesets/TilesetUniform/tileset.json",
      location.href,
    ).href;
    let headers: Record<string, string> | undefined;
    let label = "TilesetUniform";
    if (asset) {
      // ?token=default: 1.x's public token, for Cesium's sample assets.
      const resolved = await resolveIonAsset(Number(asset), {
        accessToken:
          params.get("token") === "default" && DEFAULT_TOKEN
            ? DEFAULT_TOKEN
            : (import.meta.env.VITE_ION_TOKEN as string),
      });
      url = resolved.url;
      headers = resolved.headers;
      label = "ion asset";
    } else if (imodel) {
      url = (
        await resolveITwinIModel(imodel, {
          shareKey: import.meta.env.VITE_ITWIN_SHARE_KEY as string,
        })
      ).url;
      label = "iModel";
    }
    const e = await engine();
    const world = e.createWorld({ maxDraws: 64 });
    const probe = await e.addTileset(world, url, headers ? { headers } : {});
    const sphere = probe.root.volume.sphere;
    e.removeTileset(probe);
    e.removeWorld(world);
    const center = at
      ? Ellipsoid.WGS84.cartographicToCartesian(
          fromDegrees(at[0]!, at[1]!, 0),
          new Float64Array(3),
        )
      : sphere.center;
    const far = at ? 6000 : sphere.radius * 2.5;
    const close = at ? 450 : sphere.radius * 0.3;
    // A second spot ~600 m east (or 0.3 radii) for the pan.
    const east = at
      ? Ellipsoid.WGS84.cartographicToCartesian(
          fromDegrees(
            at[0]! + 600 / (111320 * Math.cos(at[1]! * deg)),
            at[1]!,
            0,
          ),
          new Float64Array(3),
        )
      : Float64Array.from(center);
    if (!at) {
      east[0] = east[0]! + sphere.radius * 0.3;
    }
    const look =
      (target: Float64Array, pitch: number, range: number): Place =>
      (view) =>
        view.camera.lookAt(target, 30 * deg, pitch * deg, range);
    const only = params.get("scenarios")?.split(",");
    return {
      label,
      url,
      ...(headers ? { headers } : {}),
      scenarios: [
        {
          name: "jump in",
          start: look(center, -35, far),
          end: look(center, -20, close),
        },
        {
          name: "zoom out",
          start: look(center, -20, close),
          end: look(center, -35, far),
        },
        {
          name: "pan",
          start: look(center, -20, close),
          end: look(east, -20, close),
        },
      ].filter((sc) => !only || only.includes(sc.name)),
    };
  })();
  return sourcePromise;
}

interface Measurement {
  image: Uint8ClampedArray;
  requests: number;
  megabytes: number;
  settleMs: number;
  flips: Record<number, number>;
  /** FLIP every `SAMPLE_MS` from the move until settled. */
  trace: number[];
  /** The same against the target, when given. */
  traceTarget: number[];
  selected: number;
  purposes: Record<string, { requests: number; megabytes: number }>;
}

async function measure(
  options: TilesetOptions,
  scenario: Scenario,
  reference?: Uint8ClampedArray,
  goal?: Uint8ClampedArray,
): Promise<Measurement> {
  const e = await engine();
  const s = await source();
  const world = e.createWorld({
    maxDraws: 1 << 16,
    vertexBytes: 512 << 20,
    indexBytes: 256 << 20,
  });
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const view = e.addView({ target, world, clearColor: [0, 0, 0] });
  view.camera.near = 1;
  const tileset = await e.addTileset(world, s.url, {
    ...(s.headers ? { headers: s.headers } : {}),
    cacheBytes: 4 * 1024 * 1024 * 1024,
    ...options,
  });
  const id = Math.log2(e.viewBit(view));
  try {
    const settle = async (maxMs = 180000) => {
      const start = performance.now();
      let previous = "";
      let stable = 0;
      while (stable < 5) {
        e.renderFrame();
        await frame();
        const now = (tileset.lastSelected.get(id) ?? [])
          .map((t) => t.headerKey)
          .sort()
          .join("#");
        stable = tileset.idle && now === previous ? stable + 1 : 0;
        previous = now;
        if (performance.now() - start > maxMs) {
          throw new Error("did not settle");
        }
      }
      return performance.now() - start;
    };
    scenario.start(view);
    await settle();
    const requests0 = tileset.stats.requestsTotal;
    const bytes0 = tileset.stats.bytesTotal;
    const purposes0 = structuredClone(tileset.stats.purposes);
    scenario.end(view);
    // From the move until settled: FLIP at fixed marks, and every SAMPLE_MS
    // for the average (how good the image was while loading, which fixed
    // marks miss on slow networks).
    const start = performance.now();
    const flips: Record<number, number> = {};
    const marks = [250, 1000];
    const samples: number[] = [];
    const goalSamples: number[] = [];
    let nextSample = SAMPLE_MS;
    let previous = "";
    let stable = 0;
    while (stable < 5) {
      e.renderFrame();
      await frame();
      const t = performance.now() - start;
      if (reference && (t >= marks[0]! || t >= nextSample)) {
        const image = await target.read();
        const error = (await flip(reference, image, WIDTH, HEIGHT)).mean;
        while (marks.length > 0 && t >= marks[0]!) {
          flips[marks.shift()!] = error;
        }
        if (t >= nextSample) {
          samples.push(error);
          if (goal) {
            goalSamples.push((await flip(goal, image, WIDTH, HEIGHT)).mean);
          }
          nextSample += SAMPLE_MS;
        }
      }
      const now = (tileset.lastSelected.get(id) ?? [])
        .map((t) => t.headerKey)
        .sort()
        .join("#");
      stable = tileset.idle && now === previous ? stable + 1 : 0;
      previous = now;
      if (t > 600000) {
        throw new Error("did not settle");
      }
    }
    const settleMs = performance.now() - start;
    e.renderFrame();
    const image = await target.read();
    if (reference) {
      const settled = (await flip(reference, image, WIDTH, HEIGHT)).mean;
      for (const at of marks) {
        flips[at] = settled; // settled before this mark
      }
    }
    return {
      image,
      requests: tileset.stats.requestsTotal - requests0,
      megabytes: (tileset.stats.bytesTotal - bytes0) / 1048576,
      settleMs,
      flips,
      trace: samples,
      traceTarget: goalSamples,
      selected: tileset.stats.selected.get(id) ?? 0,
      purposes: Object.fromEntries(
        Object.entries(tileset.stats.purposes)
          .map(([k, v]) => [
            k,
            {
              requests:
                v.requests - purposes0[k as keyof typeof purposes0].requests,
              megabytes:
                (v.bytes - purposes0[k as keyof typeof purposes0].bytes) /
                1048576,
            },
          ])
          .filter(([, v]) => (v as { requests: number }).requests > 0),
      ),
    };
  } finally {
    e.removeView(view);
    e.removeTileset(tileset);
    e.removeWorld(world);
  }
}

/**
 * Fully refined images (SSE 2) at every scenario's end camera, and the
 * targets (`Stepwise` at the default SSE, what every policy settles to).
 */
async function runLodReference(): Promise<number> {
  const s = await source();
  for (const scenario of s.scenarios) {
    if (!references.has(scenario.name)) {
      root.querySelector(".status")!.textContent =
        `reference: ${scenario.name}…`;
      const r = await measure(
        { policy: "stepwise", maximumScreenSpaceError: 2 },
        scenario,
      );
      references.set(scenario.name, r.image);
      const t = await measure({ policy: "stepwise" }, scenario);
      targets.set(scenario.name, t.image);
    }
  }
  return references.size;
}

async function runLod(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const rows: Row[] = [];
  const s = await source();
  root.querySelector("h1")!.textContent += ` (${s.label})`;
  await runLodReference();
  const only = params.get("policies")?.split(",");
  const policies = POLICIES.filter((p) => !only || only.includes(p.id));
  for (const scenario of s.scenarios) {
    const reference = references.get(scenario.name)!;
    const goal = targets.get(scenario.name)!;
    for (const policy of policies) {
      status.textContent = `${scenario.name}: ${policy.label}…`;
      try {
        const r = await measure(policy.options, scenario, reference, goal);
        rows.push({
          scenario: scenario.name,
          policy: policy.label,
          status: "ok",
          requests: r.requests,
          megabytes: r.megabytes,
          settleMs: r.settleMs,
          flip250: r.flips[250],
          flip1000: r.flips[1000],
          trace: r.trace,
          traceTarget: r.traceTarget,
          flipSettled: (await flip(reference, r.image, WIDTH, HEIGHT)).mean,
          flipSettledTarget: (await flip(goal, r.image, WIDTH, HEIGHT)).mean,
          selected: r.selected,
          purposes: r.purposes,
        });
      } catch (error) {
        rows.push({
          scenario: scenario.name,
          policy: policy.label,
          status: `error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
      renderTable(rows);
    }
    // Common horizon: the slowest settle in this move; each policy holds its
    // settled image after it settles.
    const done = rows.filter(
      (r) =>
        r.scenario === scenario.name && r.trace && r.flipSettled !== undefined,
    );
    const horizon = Math.max(0, ...done.map((r) => r.trace!.length));
    for (const r of done) {
      let sum = 0;
      let sumTarget = 0;
      for (let i = 0; i < horizon; i++) {
        sum += r.trace![i] ?? r.flipSettled!;
        sumTarget += r.traceTarget?.[i] ?? r.flipSettledTarget!;
      }
      r.flipAverage = horizon > 0 ? sum / horizon : r.flipSettled!;
      r.flipAverageTarget =
        horizon > 0 ? sumTarget / horizon : r.flipSettledTarget!;
      delete r.trace;
      delete r.traceTarget;
    }
    renderTable(rows);
  }
  status.textContent = "done";
  return rows;
}

function renderTable(rows: Row[]): void {
  const n = (v: number | undefined, d = 3) =>
    v === undefined ? "" : v.toFixed(d);
  $("results").innerHTML =
    `<tr><th>move</th><th>policy</th><th>status</th><th>requests</th><th>MB uploaded</th><th>settle ms</th>` +
    `<th>FLIP @250 ms</th><th>FLIP @1 s</th><th>FLIP avg</th><th>FLIP settled</th><th>selected</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.scenario}</td><td>${r.policy}</td><td>${r.status}</td><td>${r.requests ?? ""}</td><td>${n(r.megabytes, 1)}</td>` +
          `<td>${n(r.settleMs, 0)}</td><td>${n(r.flip250)}</td><td>${n(r.flip1000)}</td><td>${n(r.flipAverage)}</td><td>${n(r.flipSettled)}</td><td>${r.selected ?? ""}</td></tr>`,
      )
      .join("")}`;
}

export const harness: Harness = {
  mount(element, options) {
    root = element;
    params = options;
    root.innerHTML = TEMPLATE;
    return {
      run: runLod,
      entries: { runLodReference },
      dispose() {
        // The source depends on the options; the engine and references
        // are kept only while mounted.
        const engine = enginePromise;
        enginePromise = undefined;
        sourcePromise = undefined;
        references.clear();
        targets.clear();
        engine?.then((e) => e.destroy()).catch(() => {});
      },
    };
  },
};
