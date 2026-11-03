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
  type Translucency,
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
  independence: should be 0). Click a row to see its images.
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
<table data-id="results"></table>`;

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
}

interface Scene {
  name: string;
  parts: Part[];
  /** Camera: heading, pitch (deg) and range (m) around the site, raised. */
  view: { heading: number; pitch: number; range: number; height: number };
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
      flags: part.blended ? MaterialFlags.alphaBlend : 0,
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
      doubleSided: part.blended,
    });
  }
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 30));

async function render(
  engine: Engine,
  target: OffscreenTarget,
  scene: Scene,
  translucency: Translucency,
  reversed = false,
): Promise<ImageData> {
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
    translucency,
    lighting: { environment: "procedural" },
  });
  // A few frames: the lists grow to what the first needed.
  for (let i = 0; i < 4; i++) {
    engine.renderFrame();
    await frame();
  }
  const image = new ImageData(await target.read(), WIDTH, HEIGHT);
  engine.removeView(view);
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  return image;
}

let lastImages: RowImages[] = [];

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
  for (const scene of SCENES) {
    status.textContent = `${scene.name}…`;
    const exact = await render(engine, target, scene, "exact");
    const moments = await render(engine, target, scene, "moments");
    const reversed = await render(engine, target, scene, "exact", true);
    const m = flip(exact.data, moments.data, WIDTH, HEIGHT);
    const o = flip(exact.data, reversed.data, WIDTH, HEIGHT);
    rows.push({
      scene: scene.name,
      layers: scene.parts.filter((p) => p.blended).length,
      flipMean: m.mean,
      flipP95: m.p95,
      orderMean: o.mean,
      orderMax: o.max,
    });
    lastImages.push({ exact, moments, heat: flipHeatmap(m.errors) });
    renderTable(rows);
  }
  if (lastImages.length) {
    showImages(lastImages[0]!);
  }
  status.textContent = `Done: ${rows.length} scenes.`;
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

function renderTable(rows: Row[]): void {
  const table = $("results");
  const f = (v: number) => v.toFixed(4);
  table.innerHTML = `<tr><th>Scene</th><th>Blended layers</th><th>FLIP mean</th><th>FLIP p95</th><th>Order: mean</th><th>Order: max</th></tr>${rows
    .map(
      (r, i) =>
        `<tr class="row" data-index="${i}"><td>${r.scene}</td><td>${r.layers}</td><td>${f(r.flipMean)}</td><td>${f(r.flipP95)}</td><td>${f(r.orderMean)}</td><td>${f(r.orderMax)}</td></tr>`,
    )
    .join("")}`;
  table.querySelectorAll<HTMLTableRowElement>("tr.row").forEach((tr) =>
    tr.addEventListener("click", () => {
      table.querySelector("tr.selected")?.classList.remove("selected");
      tr.classList.add("selected");
      showImages(lastImages[Number(tr.dataset.index)]!);
    }),
  );
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runTranslucency };
  },
};
