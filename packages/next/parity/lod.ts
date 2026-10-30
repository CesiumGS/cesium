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
import { flip } from "./flip.ts";

/**
 * L1′ (plan §4): `Budgeted` vs `Legacy1x` over camera moves. For each move and
 * policy, a fresh tileset settles at the start camera, then the camera moves;
 * from the move until settled we record requests, GPU bytes, time, and image
 * error (FLIP) at 250 ms, 1 s and settled against a fully refined reference
 * at the end camera.
 *
 * `runLodReference()` renders the references (it also warms the HTTP cache
 * equally for every policy); the runner may then throttle the network before
 * `runLod()`, which measures.
 */

const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;

interface Policy {
  label: string;
  options: TilesetOptions;
}

const POLICIES: Policy[] = [
  {
    label: "Legacy1x (1.x, 18 requests)",
    options: { policy: "legacy1x", maximumRequests: 18 },
  },
  {
    label: "Budgeted, 18 requests",
    options: { policy: "budgeted", maximumRequests: 18 },
  },
  {
    label: "Budgeted, 4 requests",
    options: { policy: "budgeted", maximumRequests: 4 },
  },
  { label: "Budgeted, adaptive", options: { policy: "budgeted" } },
  {
    label: "Budgeted, 64 requests",
    options: { policy: "budgeted", maximumRequests: 64 },
  },
];

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
  /** Mean FLIP sampled every 500 ms from the move until settled. */
  flipAverage?: number;
  flipSettled?: number;
  selected?: number;
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

function engine(): Promise<Engine> {
  enginePromise ??= Engine.create();
  return enginePromise;
}

/** The tileset and its moves: around ?at=lon,lat, else the root volume. */
function source(): Promise<Source> {
  sourcePromise ??= (async () => {
    const params = new URLSearchParams(location.search);
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
      const resolved = await resolveIonAsset(Number(asset), {
        accessToken: import.meta.env.VITE_ION_TOKEN as string,
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
  flipAverage?: number;
  selected: number;
}

async function measure(
  options: TilesetOptions,
  scenario: Scenario,
  reference?: Uint8ClampedArray,
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
    scenario.end(view);
    // From the move until settled: FLIP at fixed marks, and every 500 ms
    // for the average (how good the image was while loading, which fixed
    // marks miss on slow networks).
    const start = performance.now();
    const flips: Record<number, number> = {};
    const marks = [250, 1000];
    const samples: number[] = [];
    let nextSample = 500;
    let previous = "";
    let stable = 0;
    while (stable < 5) {
      e.renderFrame();
      await frame();
      const t = performance.now() - start;
      if (reference && (t >= marks[0]! || t >= nextSample)) {
        const error = flip(reference, await target.read(), WIDTH, HEIGHT).mean;
        while (marks.length > 0 && t >= marks[0]!) {
          flips[marks.shift()!] = error;
        }
        if (t >= nextSample) {
          samples.push(error);
          nextSample += 500;
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
    let flipAverage: number | undefined;
    if (reference) {
      const settled = flip(reference, image, WIDTH, HEIGHT).mean;
      for (const at of marks) {
        flips[at] = settled; // settled before this mark
      }
      samples.push(settled);
      flipAverage = samples.reduce((a, b) => a + b, 0) / samples.length;
    }
    return {
      image,
      requests: tileset.stats.requestsTotal - requests0,
      megabytes: (tileset.stats.bytesTotal - bytes0) / 1048576,
      settleMs,
      flips,
      ...(flipAverage !== undefined ? { flipAverage } : {}),
      selected: tileset.stats.selected.get(id) ?? 0,
    };
  } finally {
    e.removeView(view);
    e.removeTileset(tileset);
    e.removeWorld(world);
  }
}

/** Fully refined images (SSE 2) at every scenario's end camera. */
async function runLodReference(): Promise<number> {
  const s = await source();
  for (const scenario of s.scenarios) {
    if (!references.has(scenario.name)) {
      document.querySelector("#status")!.textContent =
        `reference: ${scenario.name}…`;
      const r = await measure(
        { policy: "legacy1x", maximumScreenSpaceError: 2 },
        scenario,
      );
      references.set(scenario.name, r.image);
    }
  }
  return references.size;
}

async function runLod(): Promise<Row[]> {
  const status = document.querySelector("#status")!;
  const rows: Row[] = [];
  const s = await source();
  document.querySelector("h1")!.textContent += ` (${s.label})`;
  await runLodReference();
  for (const scenario of s.scenarios) {
    const reference = references.get(scenario.name)!;
    for (const policy of POLICIES) {
      status.textContent = `${scenario.name}: ${policy.label}…`;
      try {
        const r = await measure(policy.options, scenario, reference);
        rows.push({
          scenario: scenario.name,
          policy: policy.label,
          status: "ok",
          requests: r.requests,
          megabytes: r.megabytes,
          settleMs: r.settleMs,
          flip250: r.flips[250],
          flip1000: r.flips[1000],
          ...(r.flipAverage !== undefined
            ? { flipAverage: r.flipAverage }
            : {}),
          flipSettled: flip(reference, r.image, WIDTH, HEIGHT).mean,
          selected: r.selected,
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
  }
  status.textContent = "done";
  return rows;
}

function renderTable(rows: Row[]): void {
  const n = (v: number | undefined, d = 3) =>
    v === undefined ? "" : v.toFixed(d);
  document.querySelector("#results")!.innerHTML =
    `<tr><th>move</th><th>policy</th><th>status</th><th>requests</th><th>MB uploaded</th><th>settle ms</th>` +
    `<th>FLIP @250 ms</th><th>FLIP @1 s</th><th>FLIP avg</th><th>FLIP settled</th><th>selected</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.scenario}</td><td>${r.policy}</td><td>${r.status}</td><td>${r.requests ?? ""}</td><td>${n(r.megabytes, 1)}</td>` +
          `<td>${n(r.settleMs, 0)}</td><td>${n(r.flip250)}</td><td>${n(r.flip1000)}</td><td>${n(r.flipAverage)}</td><td>${n(r.flipSettled)}</td><td>${r.selected ?? ""}</td></tr>`,
      )
      .join("")}`;
}

Object.assign(globalThis, { runLod, runLodReference });
