import {
  Camera,
  Ellipsoid,
  Engine,
  MaterialFlags,
  OffscreenTarget,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type MeshData,
  type TranslucencyMethod,
  type World,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import { flip } from "./flip.ts";

const TEMPLATE = `
<h1>Translucency: moments against the exact lists</h1>
<p>
  Blended surfaces in controlled scenes on the bare ellipsoid (no terrain),
  rendered with moment-based OIT ("moments", the default) and with the
  exact per-pixel lists (the reference, plan §6 M4): stacked and crossing
  layers, glass around opaque boxes, a dense stack, near-opaque layers and
  layers a centimeter apart. FLIP of moments against exact; and the exact
  lists against themselves with the draws added in reverse (order
  independence: should be 0). Unlit layers over an unlit backdrop are also
  checked against the ground truth, their sorted "over" computed here from
  each layer's coverage (rendered alone): the exact lists must match it to
  the 8-bit rounding, glass's antialiased edges too; moments come close
  (off the edges, which they don't antialias). Click a row to see its images.
</p>
<div class="status">Run to render every scene both ways.</div>
<div class="images">
  <figure>
    <figcaption>Exact (lists)</figcaption>
    <canvas class="out" data-id="exact"></canvas>
  </figure>
  <figure>
    <figcaption>Moments</figcaption>
    <canvas class="out" data-id="moments"></canvas>
  </figure>
  <figure>
    <figcaption>FLIP error</figcaption>
    <canvas class="out" data-id="heat"></canvas>
  </figure>
</div>
<table data-id="results"></table>
<table data-id="cost"></table>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const WIDTH = 640;
const HEIGHT = 400;
const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);

/** A unit square in its xy-plane, facing +z. */
function square(): MeshData {
  return {
    positions: new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}

type Rgba = readonly [number, number, number, number];

/** A part of a scene, in east-north-up meters at the site. */
interface Part {
  shape: "square" | "box";
  /** Scale, then rotation about up (deg), then about east (deg), then offset. */
  size: readonly [number, number, number];
  turn?: number;
  tilt?: number;
  at: readonly [number, number, number];
  color: Rgba;
  /** Blended (alpha mode BLEND); else opaque. */
  blended: boolean;
  /** Unlit (KHR_materials_unlit): its color shown as is. */
  unlit?: boolean;
}

interface Scene {
  name: string;
  parts: Part[];
  /** Camera: heading, pitch (deg) and range (m) around the site, raised. */
  view: { heading: number; pitch: number; range: number; height: number };
  /**
   * Checked against the ground truth: every part unlit, the first an
   * opaque backdrop filling the view, the blended ones upright squares
   * facing the camera (heading 0, pitch 0), nearer the further south.
   */
  truth?: boolean;
}

const RED: Rgba = [0.9, 0.1, 0.1, 0.5];
const GREEN: Rgba = [0.1, 0.8, 0.2, 0.5];
const BLUE: Rgba = [0.1, 0.2, 0.9, 0.5];
const YELLOW: Rgba = [0.9, 0.8, 0.1, 0.5];
const MAGENTA: Rgba = [0.8, 0.1, 0.8, 0.5];
const GRAY: Rgba = [0.5, 0.5, 0.5, 1];
const WHITE: Rgba = [0.85, 0.85, 0.8, 1];
const ground: Part = {
  shape: "box",
  size: [30, 30, 0.2],
  at: [0, 0, -0.1],
  color: GRAY,
  blended: false,
};
const withAlpha = (c: Rgba, a: number): Rgba => [c[0], c[1], c[2], a];
const hues = [RED, GREEN, BLUE, YELLOW, MAGENTA];

/** The unlit scenes' backdrop: an opaque wall behind everything. */
const backdrop: Part = {
  shape: "square",
  size: [60, 60, 1],
  tilt: 90,
  at: [0, 8, 2],
  color: [0.2, 0.25, 0.3, 1],
  blended: false,
  unlit: true,
};

type Vec3 = readonly [number, number, number];

/** An unlit blended upright square, `side` wide, facing south. */
function facing(at: Vec3, side: number, color: Rgba): Part {
  return {
    shape: "square",
    size: [side, side, 1],
    tilt: 90,
    at,
    color,
    blended: true,
    unlit: true,
  };
}

/** Upright squares facing south, `gap` apart going north. */
function stack(count: number, gap: number, alpha: number, side = 4): Part[] {
  return Array.from({ length: count }, (_, i) => ({
    shape: "square" as const,
    size: [side, side, 1] as const,
    tilt: 90,
    at: [0.3 * i, gap * i, side / 2 + 0.2 * i] as const,
    color: withAlpha(hues[i % hues.length]!, alpha),
    blended: true,
  }));
}

const SCENES: Scene[] = [
  {
    name: "stack",
    parts: [
      ground,
      ...stack(5, 0.6, 0.5),
      {
        shape: "box",
        size: [1.5, 1.5, 1.5],
        at: [0.5, 4, 0.75],
        color: WHITE,
        blended: false,
      },
    ],
    view: { heading: 10, pitch: -12, range: 14, height: 2 },
  },
  {
    name: "crossing",
    parts: [
      ground,
      ...[0, 60, 120].map((turn, i) => ({
        shape: "square" as const,
        size: [5, 3, 1] as const,
        turn,
        tilt: 90,
        at: [0, 0, 1.6] as const,
        color: withAlpha(hues[i]!, [0.4, 0.55, 0.3][i]!),
        blended: true,
      })),
      {
        shape: "box",
        size: [0.8, 0.8, 3.5],
        turn: 20,
        at: [0.6, 0.3, 1.75],
        color: WHITE,
        blended: false,
      },
    ],
    view: { heading: 30, pitch: -25, range: 10, height: 1 },
  },
  {
    name: "glass box",
    parts: [
      ground,
      {
        shape: "box",
        size: [4, 3, 2.5],
        at: [0, 0, 1.25],
        color: [0.6, 0.85, 0.9, 0.25],
        blended: true,
      },
      {
        shape: "box",
        size: [1.2, 1.2, 1.2],
        turn: 30,
        at: [-0.5, 0.2, 0.6],
        color: [0.85, 0.4, 0.1, 1],
        blended: false,
      },
      // Pokes out through the glass's wall.
      {
        shape: "box",
        size: [3, 0.5, 0.5],
        at: [1.8, -0.3, 1.5],
        color: WHITE,
        blended: false,
      },
    ],
    view: { heading: 40, pitch: -20, range: 9, height: 1 },
  },
  {
    name: "dense",
    parts: [ground, ...stack(16, 0.15, 0.2, 3)],
    view: { heading: 15, pitch: -10, range: 10, height: 2 },
  },
  {
    name: "near-opaque",
    parts: [ground, ...stack(4, 0.05, 0.9)],
    view: { heading: 25, pitch: -10, range: 10, height: 2 },
  },
  {
    name: "thin",
    parts: [ground, ...stack(2, 0.01, 0.5)],
    view: { heading: 20, pitch: -10, range: 10, height: 2 },
  },
  {
    name: "unlit layers",
    parts: [
      backdrop,
      facing([-0.8, 0, 2.3], 3, withAlpha(RED, 0.5)),
      facing([0, 1, 1.8], 3, withAlpha(GREEN, 0.35)),
      facing([0.8, 2, 2.2], 3, withAlpha(BLUE, 0.7)),
    ],
    view: { heading: 0, pitch: 0, range: 10, height: 2 },
    truth: true,
  },
  {
    name: "unlit dense",
    parts: [
      backdrop,
      ...Array.from({ length: 8 }, (_, i) =>
        facing(
          [0.15 * i - 0.5, 0.25 * i, 2 + 0.1 * (i % 3)],
          2.5,
          withAlpha(hues[i % hues.length]!, 0.2 + 0.05 * (i % 4)),
        ),
      ),
    ],
    view: { heading: 0, pitch: 0, range: 10, height: 2 },
    truth: true,
  },
];

interface Row {
  scene: string;
  layers: number;
  /** Moments against the exact lists. */
  flipMean: number;
  flipP95: number;
  /** The exact lists with the draws in reverse, against in order. */
  orderMean: number;
  orderMax: number;
  /** Unlit scenes: against the ground truth, in 8-bit steps. */
  truth?: Truth;
  pass: boolean;
}

interface Truth {
  /** Pixels checked: at most one layer's edge crossing each. */
  pixels: number;
  /** Of those, on a layer's edge (exact's antialiasing). */
  edges: number;
  exactMax: number;
  /** Off the edges (the moments' passes don't antialias glass's own). */
  momentsMean: number;
  momentsMax: number;
}

// What passes (plan §3.5's record, with margin). The exact lists match
// the ground truth to the 8-bit rounding (fp16 color, sRGB encoding);
// moments approximate it, worst where layers are near opaque, and alias
// glass's own edges, which exact antialiases (near-opaque's mean 0.020).
const LIMITS = {
  flipMean: 0.03,
  flipP95: 0.15,
  orderMax: 0.001,
  exactMax: 2,
  momentsMean: 4,
};

const passes = (r: Omit<Row, "pass">): boolean =>
  r.flipMean <= LIMITS.flipMean &&
  r.flipP95 <= LIMITS.flipP95 &&
  r.orderMax <= LIMITS.orderMax &&
  (!r.truth ||
    (r.truth.pixels > 0 &&
      r.truth.edges > 0 &&
      r.truth.exactMax <= LIMITS.exactMax &&
      r.truth.momentsMean <= LIMITS.momentsMean));

const decode = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const encode = (c: number): number =>
  255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/**
 * An unlit scene's ground truth: per pixel, its blended layers sorted
 * nearest first (the further south, as `truth` scenes are built) and put
 * "over" the backdrop in linear light, then sRGB encoded as the present
 * pass does. Each layer's coverage is rendered alone, opaque white on
 * black: its samples covered, of the four, from the resolved value. A
 * pixel on one layer's edge is that layer's share of the samples over
 * the rest and the rest alone; pixels on two layers' edges are left out
 * (which samples each covers isn't known). Compares `exact` and `moments`.
 */
async function groundTruth(
  engine: Engine,
  target: OffscreenTarget,
  scene: Scene,
  exact: ImageData,
  moments: ImageData,
): Promise<Truth> {
  const backdrop = scene.parts[0]!;
  const layers = scene.parts
    .filter((p) => p.blended)
    .sort((a, b) => a.at[1] - b.at[1]);
  const masks: Uint8ClampedArray[] = [];
  for (const layer of layers) {
    const alone: Scene = {
      ...scene,
      parts: [
        { ...backdrop, color: [0, 0, 0, 1] },
        { ...layer, color: [1, 1, 1, 1], blended: false },
      ],
    };
    masks.push((await render(engine, target, alone, "exact")).data);
  }
  // The layers (by `has`) over the backdrop, linear.
  const over = (has: (k: number) => boolean): number[] => {
    const color = [0, 0, 0];
    let through = 1;
    layers.forEach((layer, k) => {
      if (has(k)) {
        const a = layer.color[3];
        for (let c = 0; c < 3; c++) {
          color[c]! += layer.color[c]! * a * through;
        }
        through *= 1 - a;
      }
    });
    return color.map((v, c) => v + backdrop.color[c]! * through);
  };
  let pixels = 0;
  let edges = 0;
  let interior = 0;
  let exactMax = 0;
  let momentsSum = 0;
  let momentsMax = 0;
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const samples = masks.map((m) => Math.round(decode(m[i * 4]!) * 4));
    const partial = samples.flatMap((n, k) => (n > 0 && n < 4 ? [k] : []));
    if (partial.length > 1) {
      continue;
    }
    const edge = partial[0];
    const share = edge === undefined ? 0 : samples[edge]! / 4;
    const without = over((k) => k !== edge && samples[k] === 4);
    const within = over((k) => k === edge || samples[k] === 4);
    pixels++;
    if (edge !== undefined) {
      edges++;
    } else {
      interior++;
    }
    for (let c = 0; c < 3; c++) {
      const expected = encode(share * within[c]! + (1 - share) * without[c]!);
      exactMax = Math.max(
        exactMax,
        Math.abs(exact.data[i * 4 + c]! - expected),
      );
      if (edge === undefined) {
        const m = Math.abs(moments.data[i * 4 + c]! - expected);
        momentsMax = Math.max(momentsMax, m);
        momentsSum += m / 3;
      }
    }
  }
  return {
    pixels,
    edges,
    exactMax,
    momentsMean: interior ? momentsSum / interior : 0,
    momentsMax,
  };
}

interface RowImages {
  exact: ImageData;
  moments: ImageData;
  heat: ImageData;
}

function flipHeatmap(errors: Float32Array): ImageData {
  const image = new ImageData(WIDTH, HEIGHT);
  errors.forEach((e, i) => {
    image.data[i * 4] = 255 * Math.min(1, e * 3);
    image.data[i * 4 + 1] = 255 * Math.min(1, Math.max(0, e * 3 - 1));
    image.data[i * 4 + 2] = 255 * Math.max(0, e * 3 - 2);
    image.data[i * 4 + 3] = 255;
  });
  return image;
}

/** Adds a scene's parts to a world (in reverse: `reversed`). */
function build(world: World, scene: Scene, reversed: boolean): void {
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
  const meshes = {
    square: world.addMesh(square()),
    box: world.addMesh(createBox()),
  };
  const parts = reversed ? [...scene.parts].reverse() : scene.parts;
  for (const part of parts) {
    const material = world.addMaterial({
      baseColor: part.color,
      roughness: 0.5,
      flags:
        (part.blended ? MaterialFlags.alphaBlend : 0) |
        (part.unlit ? MaterialFlags.unlit : 0),
    });
    const local = mat4.fromScale(mat4.mat4(), ...part.size);
    const turn = (part.turn ?? 0) * deg;
    const tilt = (part.tilt ?? 0) * deg;
    // About east (x), then about up (z).
    const rx = mat4.mat4();
    rx[5] = Math.cos(tilt);
    rx[6] = Math.sin(tilt);
    rx[9] = -Math.sin(tilt);
    rx[10] = Math.cos(tilt);
    const rz = mat4.mat4();
    rz[0] = Math.cos(turn);
    rz[1] = Math.sin(turn);
    rz[4] = -Math.sin(turn);
    rz[5] = Math.cos(turn);
    mat4.multiply(local, rx, local);
    mat4.multiply(local, rz, local);
    mat4.setTranslation(local, vec3.vec3(...part.at));
    world.addDraw({
      mesh: meshes[part.shape],
      origin,
      model: mat4.multiply(mat4.mat4(), enu, local),
      material,
      // Squares both ways (the unlit scenes' coverage renders draw their
      // layers opaque).
      doubleSided: part.blended || part.shape === "square",
    });
  }
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 30));

/** Runs `body` with a view of `scene` (its draws in reverse: `reversed`). */
async function withView<T>(
  engine: Engine,
  target: OffscreenTarget,
  scene: Scene,
  translucency: TranslucencyMethod,
  reversed: boolean,
  body: () => Promise<T>,
): Promise<T> {
  const world = engine.createWorld({
    maxDraws: 64,
    maxMaterials: 64,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  build(world, scene, reversed);
  const camera = new Camera();
  camera.near = 0.1;
  const center = Ellipsoid.WGS84.cartographicToCartesian(
    { ...SITE, height: scene.view.height },
    vec3.vec3(),
  );
  camera.lookAt(
    center,
    scene.view.heading * deg,
    scene.view.pitch * deg,
    scene.view.range,
  );
  const view = engine.addView({
    target,
    world,
    camera,
    background: "color",
    clearColor: [0.03, 0.04, 0.06],
    translucencyMethod: translucency,
    lighting: { environment: "procedural" },
  });
  try {
    return await body();
  } finally {
    engine.removeView(view);
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();
  }
}

async function render(
  engine: Engine,
  target: OffscreenTarget,
  scene: Scene,
  translucency: TranslucencyMethod,
  reversed = false,
): Promise<ImageData> {
  return withView(engine, target, scene, translucency, reversed, async () => {
    // A few frames: the lists grow to what the first needed.
    for (let i = 0; i < 4; i++) {
      engine.renderFrame();
      await frame();
    }
    return new ImageData(await target.read(), WIDTH, HEIGHT);
  });
}

let lastImages: RowImages[] = [];

/** `?scene=crossing,thin`: those scenes alone. */
function chosenScenes(): Scene[] {
  const only = new URLSearchParams(location.search).get("scene")?.split(",");
  return only ? SCENES.filter((s) => only.includes(s.name)) : SCENES;
}

async function runTranslucency(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const engine = await Engine.create();
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const sun = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(
    { ...SITE, latitude: SITE.latitude + 0.6, longitude: SITE.longitude - 0.4 },
    vec3.vec3(),
  );
  vec3.copy(engine.sunDirection, sun);
  const rows: Row[] = [];
  lastImages = [];
  for (const scene of chosenScenes()) {
    status.textContent = `${scene.name}…`;
    const exact = await render(engine, target, scene, "exact");
    const moments = await render(engine, target, scene, "moments");
    const reversed = await render(engine, target, scene, "exact", true);
    const m = flip(exact.data, moments.data, WIDTH, HEIGHT);
    const o = flip(exact.data, reversed.data, WIDTH, HEIGHT);
    const row = {
      scene: scene.name,
      layers: scene.parts.filter((p) => p.blended).length,
      flipMean: m.mean,
      flipP95: m.p95,
      orderMean: o.mean,
      orderMax: o.max,
      truth: scene.truth
        ? await groundTruth(engine, target, scene, exact, moments)
        : undefined,
    };
    rows.push({ ...row, pass: passes(row) });
    lastImages.push({ exact, moments, heat: flipHeatmap(m.errors) });
    renderTable(rows);
  }
  if (lastImages.length) {
    showImages(lastImages[0]!);
  }
  const passed = rows.filter((r) => r.pass).length;
  status.textContent = `Done: ${passed} of ${rows.length} pass.`;
  target.destroy();
  engine.destroy();
  return rows;
}

function showImages(images: RowImages): void {
  for (const id of ["exact", "moments", "heat"] as const) {
    const canvas = $<HTMLCanvasElement>(id);
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext("2d")!.putImageData(images[id], 0, 0);
  }
}

/**
 * Fills `table`: a header, then a row of cells each (as text, never
 * markup). Returns the rows' elements.
 */
function fillTable(
  table: HTMLElement,
  header: string[],
  rows: string[][],
): HTMLTableRowElement[] {
  const line = (cells: string[], tag: "th" | "td") => {
    const tr = document.createElement("tr");
    for (const text of cells) {
      tr.appendChild(document.createElement(tag)).textContent = text;
    }
    return tr;
  };
  const trs = rows.map((cells) => line(cells, "td"));
  table.replaceChildren(line(header, "th"), ...trs);
  return trs;
}

function renderTable(rows: Row[]): void {
  const table = $("results");
  const f = (v: number) => v.toFixed(4);
  const trs = fillTable(
    table,
    [
      "Scene",
      "Blended layers",
      "FLIP mean",
      "FLIP p95",
      "Order: mean",
      "Order: max",
      "Truth: edge pixels",
      "Truth: exact max",
      "Truth: moments mean",
      "Truth: moments max",
      "Pass",
    ],
    rows.map((r) => [
      r.scene,
      String(r.layers),
      f(r.flipMean),
      f(r.flipP95),
      f(r.orderMean),
      f(r.orderMax),
      ...(r.truth
        ? [
            String(r.truth.edges),
            r.truth.exactMax.toFixed(1),
            r.truth.momentsMean.toFixed(2),
            r.truth.momentsMax.toFixed(1),
          ]
        : ["–", "–", "–", "–"]),
      r.pass ? "yes" : "NO",
    ]),
  );
  trs.forEach((tr, i) => {
    tr.classList.add("row");
    tr.addEventListener("click", () => {
      table.querySelector("tr.selected")?.classList.remove("selected");
      tr.classList.add("selected");
      showImages(lastImages[i]!);
    });
  });
}

interface CostRow {
  scene: string;
  layers: number;
  /** A frame's time, ms: the scene without its blended parts, then each way. */
  opaque: number;
  moments: number;
  exact: number;
}

/**
 * What each way costs: the scenes at 1920 × 1080, a frame's time with each
 * way against the scene without its blended parts: frames rendered back
 * to back and waited for once (`onSubmittedWorkDone`), the fastest of
 * three batches. Waited on each, a frame quicker than the display's
 * refresh heard it was done only at the next (16.7 ms at 60 Hz: the
 * scene without glass came out slower than with). Not timers (a hidden
 * page's are throttled), nor the passes' timestamps (on Apple's GPUs a
 * render pass's took in the passes before it). For comparing, not
 * budgets. The runner's `runTranslucencyCost`.
 */
async function runTranslucencyCost(): Promise<CostRow[]> {
  const status = root.querySelector(".status")!;
  const engine = await Engine.create();
  const target = new OffscreenTarget(1920, 1080);
  const queue = engine.gpu.device.queue;
  const perFrame = (scene: Scene, way: TranslucencyMethod) =>
    withView(engine, target, scene, way, false, async () => {
      const run = async (frames: number) => {
        for (let i = 0; i < frames; i++) {
          engine.renderFrame();
        }
        await queue.onSubmittedWorkDone();
      };
      await run(20);
      let best = Infinity;
      for (let batch = 0; batch < 3; batch++) {
        const start = performance.now();
        await run(40);
        best = Math.min(best, (performance.now() - start) / 40);
      }
      return best;
    });
  const rows: CostRow[] = [];
  const f = (v: number) => v.toFixed(2);
  for (const scene of chosenScenes()) {
    status.textContent = `Cost: ${scene.name}…`;
    const opaque: Scene = {
      ...scene,
      parts: scene.parts.filter((p) => !p.blended),
    };
    rows.push({
      scene: scene.name,
      layers: scene.parts.length - opaque.parts.length,
      opaque: await perFrame(opaque, "moments"),
      moments: await perFrame(scene, "moments"),
      exact: await perFrame(scene, "exact"),
    });
    fillTable(
      $("cost"),
      [
        "Scene (1920 × 1080)",
        "Blended layers",
        "Frame without them, ms",
        "Moments, +ms",
        "Exact, +ms",
      ],
      rows.map((r) => [
        r.scene,
        String(r.layers),
        f(r.opaque),
        f(r.moments - r.opaque),
        f(r.exact - r.opaque),
      ]),
    );
  }
  status.textContent = `Cost: ${rows.length} scenes.`;
  target.destroy();
  engine.destroy();
  return rows;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return {
      run: runTranslucency,
      entries: { runTranslucencyCost },
    };
  },
};
