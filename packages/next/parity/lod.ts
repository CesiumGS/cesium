import {
  Ellipsoid,
  Engine,
  OffscreenTarget,
  fromDegrees,
  resolveIonAsset,
  type TilesetOptions,
  type View,
  type World,
} from "../src/index.ts";
import { flip } from "./flip.ts";

/**
 * L1′ (plan §4): `Next` vs `Legacy1x` on one camera move. Each policy
 * settles at a far view, then jumps to a close view of the same spot; from
 * the jump until settled we record requests, GPU bytes, time, and image
 * error (FLIP) at 250 ms, 1 s and settled against a fully refined reference.
 * The reference renders first, which also warms the HTTP cache equally for
 * every policy, so times reflect decode/upload/selection more than network.
 */

const WIDTH = 480;
const HEIGHT = 270;
const deg = Math.PI / 180;

interface Run {
  label: string;
  options: TilesetOptions;
}

const RUNS: Run[] = [
  { label: "Legacy1x (1.x)", options: { policy: "legacy1x" } },
  { label: "Next", options: { policy: "next" } },
  {
    label: "Next, 64 requests",
    options: { policy: "next", maximumRequests: 64 },
  },
];

interface Row {
  policy: string;
  status: string;
  requests?: number;
  megabytes?: number;
  settleMs?: number;
  flip250?: number;
  flip1000?: number;
  flipSettled?: number;
  selected?: number;
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 16));

interface Setup {
  url: string;
  headers?: Record<string, string>;
  far: (view: View) => void;
  close: (view: View) => void;
}

async function setup(): Promise<{
  label: string;
  make: (engine: Engine, world: World) => Promise<Setup>;
}> {
  const params = new URLSearchParams(location.search);
  const asset = params.get("asset");
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
  }
  return {
    label,
    make: async (engine) => {
      // Cameras: around ?at=lon,lat at absolute ranges, else relative to the
      // root bounding sphere.
      const probe = await engine.addTileset(
        engine.createWorld(),
        url,
        headers ? { headers } : {},
      );
      const sphere = probe.root.volume.sphere;
      engine.removeTileset(probe);
      const target = at
        ? Ellipsoid.WGS84.cartographicToCartesian(
            fromDegrees(at[0]!, at[1]!, 0),
            new Float64Array(3),
          )
        : sphere.center;
      const farRange = at ? 6000 : sphere.radius * 2.5;
      const closeRange = at ? 450 : sphere.radius * 0.3;
      return {
        url,
        ...(headers ? { headers } : {}),
        far: (view) =>
          view.camera.lookAt(target, 30 * deg, -35 * deg, farRange),
        close: (view) =>
          view.camera.lookAt(target, 30 * deg, -20 * deg, closeRange),
      };
    },
  };
}

async function runLod(): Promise<Row[]> {
  const status = document.querySelector("#status")!;
  const rows: Row[] = [];
  const engine = await Engine.create();
  const { label, make } = await setup();
  document.querySelector("h1")!.textContent += ` (${label})`;

  const once = async (
    options: TilesetOptions,
    sample: boolean,
    reference?: Uint8ClampedArray,
  ) => {
    const world = engine.createWorld({
      maxDraws: 1 << 16,
      vertexBytes: 512 << 20,
      indexBytes: 256 << 20,
    });
    const target = new OffscreenTarget(WIDTH, HEIGHT);
    const view = engine.addView({ target, world, clearColor: [0, 0, 0] });
    view.camera.near = 1;
    const s = await make(engine, world);
    const tileset = await engine.addTileset(world, s.url, {
      ...(s.headers ? { headers: s.headers } : {}),
      cacheBytes: 4 * 1024 * 1024 * 1024,
      ...options,
    });
    const id = Math.log2(engine.viewBit(view));
    const settle = async (maxMs = 120000) => {
      const start = performance.now();
      let previous = "";
      let stable = 0;
      while (stable < 5) {
        engine.renderFrame();
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
    s.far(view);
    await settle();
    const requests0 = tileset.stats.requestsTotal;
    const bytes0 = tileset.stats.bytesTotal;
    s.close(view);
    const start = performance.now();
    const flips: Record<number, number> = {};
    if (sample && reference) {
      for (const at of [250, 1000]) {
        while (performance.now() - start < at) {
          engine.renderFrame();
          await frame();
        }
        engine.renderFrame();
        flips[at] = flip(reference, await target.read(), WIDTH, HEIGHT).mean;
      }
    }
    const settleMs = performance.now() - start + (await settle());
    engine.renderFrame();
    const image = await target.read();
    const result = {
      image,
      requests: tileset.stats.requestsTotal - requests0,
      megabytes: (tileset.stats.bytesTotal - bytes0) / 1048576,
      settleMs,
      flips,
      selected: tileset.stats.selected.get(id) ?? 0,
    };
    engine.removeView(view);
    engine.removeTileset(tileset);
    engine.removeWorld(world);
    return result;
  };

  status.textContent = "reference (fully refined)…";
  const reference = (
    await once({ policy: "legacy1x", maximumScreenSpaceError: 2 }, false)
  ).image;
  for (const run of RUNS) {
    status.textContent = `${run.label}…`;
    try {
      const r = await once(run.options, true, reference);
      rows.push({
        policy: run.label,
        status: "ok",
        requests: r.requests,
        megabytes: r.megabytes,
        settleMs: r.settleMs,
        flip250: r.flips[250],
        flip1000: r.flips[1000],
        flipSettled: flip(reference, r.image, WIDTH, HEIGHT).mean,
        selected: r.selected,
      });
    } catch (error) {
      rows.push({
        policy: run.label,
        status: `error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    renderTable(rows);
  }
  engine.destroy();
  status.textContent = "done";
  return rows;
}

function renderTable(rows: Row[]): void {
  const n = (v: number | undefined, d = 3) =>
    v === undefined ? "" : v.toFixed(d);
  document.querySelector("#results")!.innerHTML =
    `<tr><th>policy</th><th>status</th><th>requests</th><th>MB uploaded</th><th>settle ms</th>` +
    `<th>FLIP @250 ms</th><th>FLIP @1 s</th><th>FLIP settled</th><th>selected</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.policy}</td><td>${r.status}</td><td>${r.requests ?? ""}</td><td>${n(r.megabytes, 1)}</td>` +
          `<td>${n(r.settleMs, 0)}</td><td>${n(r.flip250)}</td><td>${n(r.flip1000)}</td><td>${n(r.flipSettled)}</td><td>${r.selected ?? ""}</td></tr>`,
      )
      .join("")}`;
}

Object.assign(globalThis, { runLod });
