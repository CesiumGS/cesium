import {
  Camera,
  CanvasTarget,
  Ellipsoid,
  Engine,
  PointSource,
  VectorLayer,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type MeshData,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see tracksBench.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Cesium: any;

/**
 * Real-time tracks benchmark (plan §13.11): N tracks circling, fed at 10 Hz
 * by a synthetic feed, drawn as 16 px symbols, in 2.0 (a `PointSource`:
 * one typed-array update, moved on the GPU, drawn by a `VectorLayer`) and
 * in 1.x as a
 * `BillboardCollection` (its fast path) and as entities with billboards
 * (what applications usually write). No globe on either side; the same
 * canvas, camera and symbol; 2.0 also clamped to hilly ground (a height
 * capture, 6 m texels). Per engine and N: time to create, CPU per
 * feed update, CPU per frame, frame intervals, and 2.0's GPU time. 1.x
 * moves its symbols at the feed's 10 Hz; 2.0 also interpolates them every
 * frame.
 */

const TEMPLATE = `
<h1>Real-time tracks: 2.0 against 1.x</h1>
<p>
  N tracks circling, updated by a 10 Hz feed, drawn as 16 px symbols: 2.0
  live points (<code>PointSource</code>, <code>VectorLayer</code>); 1.x
  <code>BillboardCollection</code> and entities.
  CPU per feed update and per frame, frame intervals, GPU (2.0).
</p>
<div class="status">Run to measure every engine and track count.</div>
<div class="tracks-bench">
  <canvas data-id="next" width="960" height="540"></canvas>
  <div data-id="legacy" style="width:960px;height:540px"></div>
  <table data-id="results"></table>
</div>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);
const COUNTS = [1_000, 10_000, 100_000];
/** Seconds measured per engine and count, and the feed's interval. */
const SECONDS = 4;
const FEED = 0.1;
const PIXELS = 16;

interface Row {
  engine: string;
  tracks: number;
  createMs: number;
  updateMs: number;
  frameCpuMs: number;
  frameP50: number;
  frameP95: number;
  gpuMs: number;
  frames: number;
}

const quantile = (values: number[], q: number) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))]! : NaN;
};
const median = (values: number[]) => quantile(values, 0.5);

/**
 * The synthetic feed: track i circles a point of a grid (±10 km) once a
 * minute, at `t` seconds; local east-north (m) and heading, 4 floats each.
 */
function feed(n: number, t: number, out: Float32Array): void {
  const side = Math.ceil(Math.sqrt(n));
  const spacing = 20_000 / side;
  for (let i = 0; i < n; i++) {
    const cx = ((i % side) - side / 2) * spacing;
    const cy = (Math.floor(i / side) - side / 2) * spacing;
    const a = (t / 60) * 2 * Math.PI + i;
    const r = spacing * 0.3;
    out[i * 4] = cx + r * Math.cos(a);
    out[i * 4 + 1] = cy + r * Math.sin(a);
    out[i * 4 + 2] = 0;
    out[i * 4 + 3] = (-a * 180) / Math.PI; // tangent, degrees clockwise from north
  }
}

/** A red 16 px square for 1.x's billboards. */
function symbol(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PIXELS;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#ff2020";
  g.fillRect(0, 0, PIXELS, PIXELS);
  return canvas;
}

/**
 * Runs a frame loop for `SECONDS`: a feed update every `FEED` seconds
 * (`update` returns the engine's part of it in ms: the feed's own work is
 * the application's), then a frame; returns the CPU times and intervals.
 */
async function measure(
  update: (t: number) => number,
  render: () => void,
): Promise<{ update: number[]; frame: number[]; intervals: number[] }> {
  const updates: number[] = [];
  const frames: number[] = [];
  const intervals: number[] = [];
  const start = performance.now();
  let lastFeed = -Infinity;
  let last: number | undefined;
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      if (last !== undefined) {
        intervals.push(now - last);
      }
      last = now;
      if (t - lastFeed >= FEED) {
        lastFeed = t;
        updates.push(update(t));
      }
      const t1 = performance.now();
      render();
      frames.push(performance.now() - t1);
      if (t < SECONDS) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
  return { update: updates, frame: frames, intervals };
}

/**
 * Hilly ground over the tracks' area (±12 km, ±60 m) in the frame at
 * `origin`, as a grid mesh 120 m apart, for the clamped runs.
 */
function hills(): MeshData {
  const half = 12_000;
  const step = 120;
  const n = Math.round((2 * half) / step) + 1;
  const positions = new Float32Array(n * n * 3);
  const normals = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -half + i * step;
      const y = -half + j * step;
      positions.set(
        [x, y, 60 * Math.sin(x / 1500) * Math.cos(y / 1100)],
        (j * n + i) * 3,
      );
      normals.set([0, 0, 1], (j * n + i) * 3);
    }
  }
  const indices = new Uint32Array((n - 1) * (n - 1) * 6);
  let k = 0;
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      indices.set([a, a + 1, a + n + 1, a, a + n + 1, a + n], k);
      k += 6;
    }
  }
  return { positions, normals, indices };
}

async function runNext(n: number, clamped = false): Promise<Row> {
  const canvas = $<HTMLCanvasElement>("next");
  const engine = await Engine.create();
  const target = new CanvasTarget(canvas, { pixelRatio: 1 });
  const origin = Ellipsoid.WGS84.cartographicToCartesian(SITE, vec3.vec3());
  const world = engine.createWorld({
    maxDraws: 64,
    maxInstances: Math.max(4096, n * 2),
    vertexBytes: 16 << 20,
    indexBytes: 4 << 20,
  });
  if (clamped) {
    const frame = eastNorthUpToFixedFrame(origin, Ellipsoid.WGS84, mat4.mat4());
    frame[12] = frame[13] = frame[14] = 0;
    world.addDraw({
      mesh: world.addMesh(hills()),
      origin,
      model: frame,
      radius: 17_000,
      material: world.addMaterial({
        baseColor: [0.3, 0.35, 0.28, 1],
        roughness: 1,
      }),
    });
  }
  const t0 = performance.now();
  const tracks = new PointSource(engine, world, {
    capacity: n,
    origin,
    delay: FEED,
    ...(clamped
      ? { clamp: { halfExtent: 12_000, size: 4096, top: 200, bottom: -200 } }
      : {}),
  });
  const layer = await VectorLayer.create(engine, world, {
    source: tracks,
    style: {
      layers: [
        {
          shape: "square",
          size: `${PIXELS / 0.85}px`,
          fill: { color: "#ff2020" },
        },
      ],
    },
  });
  const samples = new Float32Array(n * 4);
  feed(n, 0, samples);
  tracks.update(0, samples);
  tracks.count = n;
  const createMs = performance.now() - t0;
  const camera = new Camera();
  camera.near = 10;
  camera.lookAt(origin, 0, -60 * deg, 30_000);
  const view = engine.addView({
    target,
    world,
    camera,
    background: "color",
    clearColor: [0.03, 0.04, 0.06],
  });
  // Warm up (pipelines, first uploads).
  for (let i = 0; i < 10; i++) {
    engine.renderFrame();
    await new Promise(requestAnimationFrame);
  }
  const gpu: number[] = [];
  const m = await measure(
    (t) => {
      feed(n, t, samples);
      const t1 = performance.now();
      tracks.update(0, samples);
      return performance.now() - t1;
    },
    () => {
      engine.renderFrame();
      if (Number.isFinite(engine.stats.gpuMs)) {
        gpu.push(engine.stats.gpuMs);
      }
    },
  );
  engine.removeView(view);
  layer.destroy();
  tracks.destroy();
  engine.destroy();
  return {
    engine: clamped ? "2.0 points, clamped" : "2.0 points",
    tracks: n,
    createMs,
    updateMs: median(m.update),
    frameCpuMs: median(m.frame),
    frameP50: median(m.intervals),
    frameP95: quantile(m.intervals, 0.95),
    gpuMs: gpu.length ? median(gpu) : NaN,
    frames: m.frame.length,
  };
}

async function runLegacy(
  n: number,
  kind: "billboards" | "entities",
): Promise<Row> {
  const viewer = new Cesium.Viewer($("legacy"), {
    globe: false,
    baseLayer: false,
    skyBox: false,
    skyAtmosphere: false,
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    useDefaultRenderLoop: false,
  });
  const scene = viewer.scene;
  scene.backgroundColor = Cesium.Color.fromBytes(8, 10, 15);
  scene.sun = undefined;
  scene.moon = undefined;
  scene.fog.enabled = false;
  const center = Cesium.Cartesian3.fromRadians(
    SITE.longitude,
    SITE.latitude,
    0,
  );
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(center);
  const image = symbol();
  const samples = new Float32Array(n * 4);
  const positions: unknown[] = Array.from(
    { length: n },
    () => new Cesium.Cartesian3(),
  );
  const local = new Cesium.Cartesian3();
  // The feed in Earth-fixed positions (the application's work, not timed).
  const toFixed = (t: number) => {
    feed(n, t, samples);
    for (let i = 0; i < n; i++) {
      local.x = samples[i * 4]!;
      local.y = samples[i * 4 + 1]!;
      local.z = 0;
      Cesium.Matrix4.multiplyByPoint(enu, local, positions[i]);
    }
  };
  toFixed(0);
  const t0 = performance.now();
  let set: (i: number) => void;
  if (kind === "billboards") {
    const collection = scene.primitives.add(new Cesium.BillboardCollection());
    const billboards = positions.map((position) =>
      collection.add({ position, image, width: PIXELS, height: PIXELS }),
    );
    set = (i) => {
      billboards[i].position = positions[i];
    };
  } else {
    const entities = positions.map((position) =>
      viewer.entities.add({
        position: new Cesium.ConstantPositionProperty(position),
        billboard: { image, width: PIXELS, height: PIXELS },
      }),
    );
    set = (i) => {
      entities[i].position.setValue(positions[i]);
    };
  }
  const createMs = performance.now() - t0;
  viewer.camera.lookAt(
    center,
    new Cesium.HeadingPitchRange(0, -60 * deg, 30_000),
  );
  for (let i = 0; i < 10; i++) {
    viewer.render();
    await new Promise(requestAnimationFrame);
  }
  const m = await measure(
    (t) => {
      toFixed(t);
      const t1 = performance.now();
      for (let i = 0; i < n; i++) {
        set(i);
      }
      return performance.now() - t1;
    },
    () => viewer.render(),
  );
  viewer.destroy();
  return {
    engine: kind === "billboards" ? "1.x BillboardCollection" : "1.x entities",
    tracks: n,
    createMs,
    updateMs: median(m.update),
    frameCpuMs: median(m.frame),
    frameP50: median(m.intervals),
    frameP95: quantile(m.intervals, 0.95),
    gpuMs: NaN,
    frames: m.frame.length,
  };
}

async function runTracksBench(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const rows: Row[] = [];
  for (const n of COUNTS) {
    status.textContent = `2.0, ${n.toLocaleString()} tracks…`;
    rows.push(await runNext(n));
    renderTable(rows);
    status.textContent = `2.0 clamped, ${n.toLocaleString()} tracks…`;
    rows.push(await runNext(n, true));
    renderTable(rows);
    for (const kind of ["billboards", "entities"] as const) {
      status.textContent = `1.x ${kind}, ${n.toLocaleString()} tracks…`;
      rows.push(await runLegacy(n, kind));
      renderTable(rows);
    }
  }
  status.textContent = "Done.";
  return rows;
}

function renderTable(rows: Row[]): void {
  const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "–");
  $("results").innerHTML =
    `<tr><th>Engine</th><th>Tracks</th><th>Create, ms</th><th>Feed update, ms</th><th>Frame CPU, ms</th><th>Interval p50, ms</th><th>Interval p95, ms</th><th>GPU, ms</th><th>Frames</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.engine}</td><td>${r.tracks.toLocaleString()}</td><td>${f(r.createMs, 0)}</td><td>${f(r.updateMs)}</td><td>${f(r.frameCpuMs)}</td><td>${f(r.frameP50, 1)}</td><td>${f(r.frameP95, 1)}</td><td>${f(r.gpuMs)}</td><td>${r.frames}</td></tr>`,
      )
      .join("")}`;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runTracksBench };
  },
};
