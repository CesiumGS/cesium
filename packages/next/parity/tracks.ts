import {
  Camera,
  EARTH,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  PointSource,
  VectorLayer,
  createSurfacePatch,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type AnchorHandle,
  type MeshData,
  type VectorStyleDocument,
  type World,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import { flip } from "./flip.ts";

const TEMPLATE = `
<h1>Live points and styled layers</h1>
<p>
  Tracks (plan §13.11) as a live point source drawn by a vector style: a
  feed update writes their samples at once; each frame a kernel moves them
  on the GPU and writes their anchors; a style draws each as a truck
  within the switch distance of the camera (a model pool) and a red
  square symbol beyond it (a point set, by vertex pulling). The clock is
  the harness's, so motion is exact. Click a row to see its image.
</p>
<div class="status">Run to check every case.</div>
<div class="images">
  <figure>
    <figcaption>Image</figcaption>
    <canvas class="out" data-id="image"></canvas>
  </figure>
</div>
<table data-id="results"></table>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const WIDTH = 640;
const HEIGHT = 400;
const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);
const TRUCK =
  "/specs-data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf";
/** Buildings with per-feature colors (batched b3dm). */
const BUILDINGS =
  "/specs-data/Cesium3DTiles/Batched/BatchedColors/tileset.json";
/** The symbols' side, px, and the switch distance, m. */
const PIXELS = 24;
const SWITCH = 300;

/** Red squares beyond the switch distance, trucks within it. */
const styleOf = (pixels: number, models = true): VectorStyleDocument => ({
  resources: {
    full: { kind: "symbol", path: "M -1 -1 H 1 V 1 H -1 Z" },
    truck: { kind: "model", uri: TRUCK },
  },
  layers: [
    {
      filter: models ? `\${view.distance} >= ${SWITCH}` : "true",
      shape: "full",
      size: `${pixels}px`,
      fill: { color: "#ff0000" },
    },
    ...(models
      ? [
          {
            filter: `\${view.distance} < ${SWITCH}`,
            shape: "model('truck')",
            heading: "${heading}",
          },
        ]
      : []),
  ],
});

interface Row {
  case: string;
  measured: string;
  expected: string;
  pass: boolean;
}

/**
 * The unlit red billboards' area in pixels, weighted by coverage (red over
 * green: 1 inside, about half on an antialiased edge, 0 on the background,
 * the ground and the trucks).
 */
function redPixels(image: ImageData): number {
  let n = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const red =
      image.data[i]! - Math.max(image.data[i + 1]!, image.data[i + 2]!);
    n += Math.max(0, red) / 255;
  }
  return Math.round(n);
}

/** Tracks along the x axis `spacing` m apart, heading east (degrees). */
function line(count: number, x0 = 0, heading = 90, spacing = 30): Float32Array {
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    out.set([x0 + (i - (count - 1) / 2) * spacing, 0, 0, heading], i * 4);
  }
  return out;
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 30));

/** Hills in a frame's east and north (m): ±40 m, a few hundred m across. */
const hill = (x: number, y: number) =>
  40 * Math.sin(x / 300) * Math.cos(y / 250);

/** The hills as a grid mesh over ±`half` m, `step` m apart, in that frame. */
function hills(half: number, step: number): MeshData {
  const n = Math.round((2 * half) / step) + 1;
  const positions = new Float32Array(n * n * 3);
  const normals = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -half + i * step;
      const y = -half + j * step;
      positions.set([x, y, hill(x, y)], (j * n + i) * 3);
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

/**
 * Ground heights at (x, y) in `frame` (east-north-up at an origin) by the
 * world's exact ray casts straight down from `top` (undefined: no hit),
 * against the draws under `anchor` (default none: the page's own meshes;
 * a tileset's are under the Earth's anchor).
 */
async function castDown(
  world: World,
  frame: mat4.Mat4,
  points: Array<[number, number]>,
  top: number,
  anchor?: AnchorHandle,
): Promise<Array<number | undefined>> {
  const down = [-frame[8]!, -frame[9]!, -frame[10]!];
  const hits = await world.castRays(
    points.map(([x, y]) => ({
      origin: [0, 1, 2].map(
        (k) =>
          frame[12 + k]! +
          frame[k]! * x +
          frame[4 + k]! * y +
          frame[8 + k]! * top,
      ),
      direction: down,
      maxDistance: 5000,
    })),
    anchor ? { anchor } : {},
  );
  return hits.map((d) => (d === undefined ? undefined : top - d));
}

/** Points' anchors (x, y, z, heading), as the frame kernel wrote them. */
async function anchors(
  engine: Engine,
  world: World,
  source: PointSource,
  count: number,
): Promise<Float32Array> {
  const device = engine.gpu.device;
  const bytes = count * 16;
  const read = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(
    world.vertexBufferOf(source.mesh),
    source.mesh.points.anchors * 4,
    read,
    0,
    bytes,
  );
  device.queue.submit([encoder.finish()]);
  await read.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(read.getMappedRange().slice(0));
  read.destroy();
  return out;
}

/** |a − b| statistics, meters. */
function errors(a: number[]): { max: number; p95: number; mean: number } {
  const s = [...a].sort((x, y) => x - y);
  return {
    max: s.at(-1) ?? 0,
    p95: s[Math.floor(s.length * 0.95)] ?? 0,
    mean: s.reduce((t, x) => t + x, 0) / Math.max(1, s.length),
  };
}

/** The frame's rotation alone (a draw placed by `origin` and `model`). */
function rotation(frame: mat4.Mat4): mat4.Mat4 {
  const m = mat4.copy(mat4.mat4(), frame);
  m[12] = m[13] = m[14] = 0;
  return m;
}

/** Clamped points' heights (their anchors) against ray casts. */
async function clampErrors(
  engine: Engine,
  world: World,
  source: PointSource,
  reference: Array<number | undefined>,
): Promise<{ hits: number; max: number; p95: number; mean: number }> {
  const placed = await anchors(engine, world, source, reference.length);
  const diffs: number[] = [];
  reference.forEach((z, i) => {
    if (z !== undefined) {
      diffs.push(Math.abs(placed[i * 4 + 2]! - z));
    }
  });
  return { hits: diffs.length, ...errors(diffs) };
}

async function runTracks(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const engine = await Engine.create();
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const origin = Ellipsoid.WGS84.cartographicToCartesian(SITE, vec3.vec3());
  const rows: Row[] = [];
  const images: ImageData[] = [];
  let now = 0;

  /** A world with ground and tracks; `render` draws it from `range` m. */
  // An asset's images are released once uploaded to a world, so each
  // scene (a world) loads the truck itself.
  const scene = async (capacity: number) => {
    const world: World = engine.createWorld({
      maxDraws: 64,
      maxMaterials: 32,
      maxInstances: Math.max(1024, capacity * 8),
      vertexBytes: 32 << 20,
      indexBytes: 16 << 20,
    });
    const patch = createSurfacePatch(
      Ellipsoid.WGS84,
      SITE.longitude - 0.05,
      SITE.latitude - 0.04,
      SITE.longitude + 0.05,
      SITE.latitude + 0.04,
      16,
    );
    world.addDraw({
      mesh: world.addMesh(patch),
      origin: patch.origin,
      radius: patch.radius,
      material: world.addMaterial({
        baseColor: [0.35, 0.4, 0.3, 1],
        roughness: 1,
      }),
    });
    const tracks = new PointSource(engine, world, {
      capacity,
      origin,
      delay: 0,
      clock: () => now,
    });
    const layer = await VectorLayer.create(engine, world, {
      source: tracks,
      style: styleOf(PIXELS),
      slots: capacity,
      depthTestDistance: 1e9,
    });
    const render = async (range: number, pitch = -35): Promise<ImageData> => {
      const camera = new Camera();
      camera.near = 0.5;
      camera.lookAt(origin, 20 * deg, pitch * deg, range);
      const view = engine.addView({
        target,
        world,
        camera,
        background: "color",
        clearColor: [0.03, 0.04, 0.06],
        lighting: { environment: "procedural" },
      });
      for (let i = 0; i < 4; i++) {
        engine.renderFrame();
        await frame();
      }
      const image = new ImageData(await target.read(), WIDTH, HEIGHT);
      engine.removeView(view);
      return image;
    };
    const dispose = () => {
      layer.destroy();
      tracks.destroy();
      engine.worlds.splice(engine.worlds.indexOf(world), 1);
      world.destroy();
    };
    return { world, tracks, render, dispose };
  };

  const add = (row: Row, image?: ImageData) => {
    rows.push(row);
    images.push(image ?? images.at(-1)!);
    renderTable(rows, images);
  };

  // Up close: trucks, no billboards.
  status.textContent = "model up close…";
  {
    const s = await scene(3);
    s.tracks.update(0, line(3));
    s.tracks.count = 3;
    const near = await s.render(90);
    s.tracks.count = 0;
    const empty = await s.render(90);
    s.tracks.count = 3;
    const f = flip(near.data, empty.data, WIDTH, HEIGHT).mean;
    const red = redPixels(near);
    add(
      {
        case: "model within the switch distance",
        measured: `FLIP vs no tracks ${f.toFixed(4)}, red px ${red}`,
        expected:
          "trucks drawn (FLIP > 0.002), no billboards (red px < 30: the trucks' own)",
        pass: f > 0.002 && red < 30,
      },
      near,
    );
    // From afar: billboards only (in front of everything), spread apart so
    // they don't overlap on screen.
    now += 1;
    s.tracks.update(0, line(3, 0, 90, 300));
    now += 1;
    const far = await s.render(1500);
    const n = redPixels(far);
    const want = 3 * PIXELS * PIXELS;
    add(
      {
        case: "billboards beyond the switch distance",
        measured: `${n} red px`,
        expected: `${want} (3 × ${PIXELS}²) ± 5%`,
        pass: Math.abs(n - want) / want < 0.05,
      },
      far,
    );
    // Count hides the rest.
    s.tracks.count = 1;
    const one = redPixels(await s.render(1500));
    add({
      case: "count shows the first tracks only",
      measured: `${one} red px`,
      expected: `${PIXELS * PIXELS} ± 5%`,
      pass: Math.abs(one - PIXELS * PIXELS) / (PIXELS * PIXELS) < 0.05,
    });
    s.dispose();
  }

  // Interpolation: halfway through a move is its midpoint. With a delay
  // of 1 s, a point sampled at 10 and 11 is shown moving from the first
  // to the second between 11 and 12.
  status.textContent = "interpolation…";
  {
    const moving = await scene(3);
    moving.tracks.delay = 1;
    now = 10;
    moving.tracks.update(0, line(3, -40));
    now = 11;
    moving.tracks.update(0, line(3, 40));
    moving.tracks.count = 3;
    now = 11.5;
    const halfway = await moving.render(90);
    moving.dispose();
    const fixed = await scene(3);
    fixed.tracks.update(0, line(3, 0));
    fixed.tracks.count = 3;
    const midpoint = await fixed.render(90);
    const f = flip(halfway.data, midpoint.data, WIDTH, HEIGHT).mean;
    add(
      {
        case: "halfway between samples (vs placed at the midpoint)",
        measured: `FLIP ${f.toFixed(5)}`,
        expected: "below 0.001",
        pass: f < 0.001,
      },
      halfway,
    );
    // Heading: turned trucks differ (once the clock passes the sample).
    fixed.tracks.update(0, line(3, 0, 0));
    now += 1;
    const turned = await fixed.render(90);
    const g = flip(turned.data, midpoint.data, WIDTH, HEIGHT).mean;
    add(
      {
        case: "heading turns the trucks",
        measured: `FLIP vs heading east ${g.toFixed(4)}`,
        expected: "above 0.002",
        pass: g > 0.002,
      },
      turned,
    );
    fixed.dispose();
  }

  // Clamping to hills: against exact ray casts.
  status.textContent = "clamped to hills…";
  {
    const world = engine.createWorld({
      maxDraws: 16,
      maxMaterials: 8,
      maxInstances: 4096,
      vertexBytes: 32 << 20,
      indexBytes: 16 << 20,
    });
    const enu = eastNorthUpToFixedFrame(origin, Ellipsoid.WGS84, mat4.mat4());
    world.addDraw({
      mesh: world.addMesh(hills(2000, 20)),
      origin,
      model: rotation(enu),
      radius: 3000,
      material: world.addMaterial({
        baseColor: [0.35, 0.4, 0.3, 1],
        roughness: 1,
      }),
    });
    const count = 1000;
    const points: Array<[number, number]> = [];
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < count; i++) {
      points.push([(random() - 0.5) * 3600, (random() - 0.5) * 3600]);
    }
    const reference = await castDown(world, enu, points, 500);
    const tracks = new PointSource(engine, world, {
      capacity: count,
      origin,
      clamp: { halfExtent: 2000, size: 2048, top: 500, bottom: -200 },
      delay: 0,
      clock: () => now,
    });
    const layer = await VectorLayer.create(engine, world, {
      source: tracks,
      style: styleOf(8, false),
    });
    tracks.update(
      0,
      new Float32Array(points.flatMap(([x, y]) => [x, y, 0, 0])),
    );
    tracks.count = count;
    const camera = new Camera();
    camera.near = 1;
    camera.lookAt(origin, 20 * deg, -40 * deg, 5000);
    const view = engine.addView({
      target,
      world,
      camera,
      background: "color",
      clearColor: [0.03, 0.04, 0.06],
    });
    for (let i = 0; i < 4; i++) {
      engine.renderFrame();
      await frame();
    }
    const image = new ImageData(await target.read(), WIDTH, HEIGHT);
    const e = await clampErrors(engine, world, tracks, reference);
    add(
      {
        case: "clamped to hills, 1,000 points (vs ray casts)",
        measured: `${e.hits} hits; error max ${e.max.toFixed(3)} m, p95 ${e.p95.toFixed(3)}, mean ${e.mean.toFixed(3)} (texel ${((2 * 2000) / 2048).toFixed(2)} m)`,
        expected: "max under 0.25 m",
        pass: e.hits === count && e.max < 0.25,
      },
      image,
    );
    engine.removeView(view);
    layer.destroy();
    tracks.destroy();
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();
  }

  // Clamping to buildings (3D Tiles): against exact ray casts.
  status.textContent = "clamped to buildings…";
  {
    const world = engine.createWorld({
      maxDraws: 1024,
      maxMaterials: 256,
      maxInstances: 8192,
      vertexBytes: 32 << 20,
      indexBytes: 16 << 20,
    });
    const tileset = await engine.addTileset(
      world,
      new URL(BUILDINGS, location.href),
      {},
    );
    const center = (tileset.root.contentVolume ?? tileset.root.volume).sphere
      .center;
    const at = Ellipsoid.WGS84.cartesianToCartographic(center, {
      longitude: 0,
      latitude: 0,
      height: 0,
    })!;
    const ground = Ellipsoid.WGS84.cartographicToCartesian(
      { ...at, height: 0 },
      vec3.vec3(),
    );
    const enu = eastNorthUpToFixedFrame(ground, Ellipsoid.WGS84, mat4.mat4());
    const camera = new Camera();
    camera.near = 1;
    camera.lookAt(center, 30 * deg, -50 * deg, 400);
    const view = engine.addView({
      target,
      world,
      camera,
      background: "color",
      clearColor: [0.03, 0.04, 0.06],
    });
    let quiet = 0;
    for (let i = 0; i < 160 && quiet < 10; i++) {
      engine.renderFrame();
      await frame();
      quiet = tileset.idle && tileset.stats.inFlight === 0 ? quiet + 1 : 0;
    }
    const points: Array<[number, number]> = [];
    // Every 2.5 m over ±100 m: the buildings are sparse.
    for (let j = 0; j < 80; j++) {
      for (let i = 0; i < 80; i++) {
        points.push([(i - 39.5) * 2.5, (j - 39.5) * 2.5]);
      }
    }
    const reference = await castDown(
      world,
      enu,
      points,
      300,
      world.bodyAnchor(EARTH),
    );
    const tracks = new PointSource(engine, world, {
      capacity: points.length,
      origin: ground,
      clamp: { halfExtent: 150, size: 2048, top: 300, bottom: -100 },
      delay: 0,
      clock: () => now,
    });
    const layer = await VectorLayer.create(engine, world, {
      source: tracks,
      style: styleOf(6, false),
    });
    tracks.update(
      0,
      new Float32Array(points.flatMap(([x, y]) => [x, y, 0, 0])),
    );
    tracks.count = points.length;
    for (let i = 0; i < 4; i++) {
      engine.renderFrame();
      await frame();
    }
    const image = new ImageData(await target.read(), WIDTH, HEIGHT);
    const e = await clampErrors(engine, world, tracks, reference);
    add(
      {
        case: "clamped to buildings, BatchedColors (vs ray casts)",
        measured: `${e.hits} on roofs of ${points.length}; error max ${e.max.toFixed(3)} m, p95 ${e.p95.toFixed(3)}, mean ${e.mean.toFixed(3)} (texel ${((2 * 150) / 2048).toFixed(3)} m)`,
        expected: "p95 under 0.1 m (at roof edges up to a wall's height)",
        pass: e.hits > 100 && e.p95 < 0.1,
      },
      image,
    );
    engine.removeView(view);
    layer.destroy();
    tracks.destroy();
    engine.removeTileset(tileset);
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();
  }

  // 100,000 points: a feed update's CPU cost (one copy and a dispatch).
  status.textContent = "100,000 points…";
  {
    const capacity = 100_000;
    const s = await scene(capacity);
    const samples = new Float32Array(capacity * 4);
    for (let i = 0; i < capacity; i++) {
      samples.set(
        [((i % 316) - 158) * 25, (Math.floor(i / 316) - 158) * 25, 0, i % 360],
        i * 4,
      );
    }
    s.tracks.count = capacity;
    const times: number[] = [];
    for (let k = 0; k < 11; k++) {
      now = 20 + k * 0.1;
      const t0 = performance.now();
      s.tracks.update(0, samples);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[5]!;
    const image = await s.render(6000, -50);
    add(
      {
        case: "100,000 points: a feed update on the CPU",
        measured: `median ${median.toFixed(2)} ms (${((median / capacity) * 1e6).toFixed(1)} ns a point)`,
        expected: "under 2 ms (a copy, no work per point)",
        pass: median < 2,
      },
      image,
    );
    s.dispose();
  }

  const passed = rows.filter((r) => r.pass).length;
  status.textContent = `Done: ${passed} of ${rows.length} pass.`;
  target.destroy();
  engine.destroy();
  return rows;
}

function renderTable(rows: Row[], images: ImageData[]): void {
  const table = $("results");
  table.innerHTML = `<tr><th>Case</th><th>Measured</th><th>Expected</th><th>Pass</th></tr>${rows
    .map(
      (r, i) =>
        `<tr class="row" data-index="${i}"><td>${r.case}</td><td>${r.measured}</td><td>${r.expected}</td><td>${r.pass ? "yes" : "NO"}</td></tr>`,
    )
    .join("")}`;
  const show = (image: ImageData) => {
    const canvas = $<HTMLCanvasElement>("image");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext("2d")!.putImageData(image, 0, 0);
  };
  show(images.at(-1)!);
  table
    .querySelectorAll<HTMLTableRowElement>("tr.row")
    .forEach((tr) =>
      tr.addEventListener("click", () =>
        show(images[Number(tr.dataset.index)]!),
      ),
    );
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runTracks };
  },
};
