// Clips on the GPU against the CPU's classification (plan §13.26, increment
// 8a; the Node test is test/clips.test.ts). Unlit white content on black,
// drawn into an offscreen target with clips on, and every pixel read back and
// compared with what float64 says the clip keeps there: the pixel's ray,
// carried to the surface, to the true point (the route's inverse) or the drawn
// one, and tested in the clip's own frame (`clipSetKeeps`). Pixels within
// 1 px of a boundary (of the clip or of the silhouette) are left out, as the
// other spikes do: coverage across an edge is not a classification.
//
// Cases, each in a view that opts into its clips by mask:
//   1. a cube cut by a plane, and a window cut by a box (two sets);
//   2. the cube's roof cut by an extruded L-shaped polygon, from above;
//   3. a tower under a ×10 height warp (the rig sits on the drawn frame), cut
//      by a plane named in ITRF (true: tested on the location-4 point);
//   4. the same tower cut by a plane named in the drawn frame (drawn: the
//      point rebuilt per fragment);
//   5. a b-rep (a capped cylinder: untrimmed and trimmed patch draws, and a
//      CPU mesh) cut by a plane;
//   6. picks through a clipped region hit what is behind it;
//   7. a view without clips draws everything, and clearing the mask restores it.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { routeInverse } from "../src/camera/route.ts";
import {
  createFrameCatalog,
  createFramesResolver,
  warpFrame,
} from "../src/frames/index.ts";
import {
  EARTH,
  Engine,
  MaterialFlags,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  clipSetKeeps,
  type ClipSet,
  type MeshData,
  type View,
  type World,
} from "../src/index.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";
import { cappedCylinderBrep } from "../test/brepFixtures.ts";

const TEMPLATE = `
<h1>Clips on the GPU against the CPU's classification</h1>
<p>
  Unlit white content on black, cut by clips the view opts into
  (<code>View.clipMask</code>). Every pixel is compared with float64's
  classification of the surface point it shows, tested in the clip's own
  frame: a clip named in ITRF on a tower drawn under a ×10 height warp, and one
  named in the drawn frame. Pixels within 1 px of a boundary are left out.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 512;
const HEIGHT = 512;
/** The warp's sphere, m: the ellipsoid's equatorial radius. */
const R = 6_378_137;
/** The exaggeration the warped cases draw at. */
const K = 10;
const WHITE = [1, 1, 1, 1] as const;

type V3 = [number, number, number];

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface ClipsResult {
  adapter: string;
  checks: Check[];
  pass: boolean;
}

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;
let active: Engine | undefined;

function stop(engine: Engine | undefined): void {
  if (engine && active === engine) {
    active = undefined;
    engine.destroy();
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** An axis-aligned box's mesh, centred on the origin, `half` its half extents. */
function boxMesh(half: readonly [number, number, number]): MeshData {
  const corners: number[] = [];
  for (let i = 0; i < 8; i++) {
    corners.push(
      (i & 1 ? 1 : -1) * half[0],
      (i & 2 ? 1 : -1) * half[1],
      (i & 4 ? 1 : -1) * half[2],
    );
  }
  const quads = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  const indices = quads.flatMap(([a, b, c, d]) => [a!, b!, c!, a!, c!, d!]);
  return {
    positions: Float32Array.from(corners),
    indices: Uint32Array.from(indices),
  };
}

/** Height above the sphere times `k`, along the radial, with its Jacobian. */
function exaggerate(
  k: number,
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  const r = Math.hypot(x, y, z);
  const f = R + k * (r - R);
  out[0] = (f * x) / r;
  out[1] = (f * y) / r;
  out[2] = (f * z) / r;
  if (jacobian) {
    const u = [x / r, y / r, z / r];
    for (let c = 0; c < 3; c++) {
      for (let row = 0; row < 3; row++) {
        jacobian[c * 3 + row] =
          (row === c ? f / r : 0) + (k - f / r) * u[row]! * u[c]!;
      }
    }
  }
  return out;
}

/** The exaggeration's inverse: the true point of a drawn one. */
function flatten(
  k: number,
  q: ArrayLike<number>,
  out: Float64Array,
): Float64Array {
  const r = Math.hypot(q[0]!, q[1]!, q[2]!);
  const g = (R + (r - R) / k) / r;
  out[0] = q[0]! * g;
  out[1] = q[1]! * g;
  out[2] = q[2]! * g;
  return out;
}

interface Scene {
  world: World;
  view: View;
  target: OffscreenTarget;
  earth: AnchorHandle;
  /** The frames of the scene: ITRF, and the drawn one when the rig sits on a warp. */
  itrf: ReturnType<ReturnType<typeof createFrameCatalog>["get"]>;
  drawn: ReturnType<typeof warpFrame> | undefined;
  /** Renders frames until the draws' fits have landed. */
  settle(draws: readonly DrawHandle[]): Promise<void>;
  /** Reads the image. */
  capture(): Promise<Uint8ClampedArray>;
  dispose(): void;
}

function scene(
  engine: Engine,
  warped: boolean,
  lost: () => void,
  extra: Partial<Parameters<Engine["addView"]>[0]> = {},
): Scene {
  const world = engine.createWorld({
    maxDraws: 16,
    vertexBytes: 1 << 22,
    indexBytes: 1 << 20,
  });
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const view = engine.addView({
    target,
    world,
    background: "color",
    clearColor: [0, 0, 0],
    observer: { exposure: UNITLESS_EXPOSURE },
    ...extra,
  });
  const catalog = createFrameCatalog();
  const itrf = catalog.get("ITRF");
  let drawn: ReturnType<typeof warpFrame> | undefined;
  if (warped) {
    drawn = warpFrame("drawn", itrf, {
      presentation: true,
      revision: 1,
      description: `height × ${K}`,
      forward: (p, out, jacobian) => exaggerate(K, p, out, jacobian),
      inverse: (q, out) => flatten(K, q, out),
    });
    catalog.add(drawn);
  }
  engine.cameras.setResolver(world, createFramesResolver(catalog));
  const earth = world.bodyAnchor(EARTH);
  engine.cameras.setRig(view, {
    position: { frame: drawn ?? itrf },
    orientation: { kind: "free" },
  });
  const frames = async (n: number) => {
    for (let i = 0; i < n; i++) {
      engine.renderFrame();
      lost();
      await sleep(16);
    }
  };
  return {
    world,
    view,
    target,
    earth,
    itrf,
    drawn,
    async settle(draws) {
      for (let i = 0; i < 200; i++) {
        await frames(1);
        if (
          draws.every((d) => {
            const state = world.warps.status(d)?.state;
            return state === undefined || state === "fitted";
          })
        ) {
          break;
        }
      }
      await frames(2);
    },
    async capture() {
      engine.renderFrame();
      lost();
      const pixels = await target.read();
      lost();
      return pixels;
    },
    dispose() {
      engine.removeView(view);
      engine.removeWorld(world);
    },
  };
}

function look(view: View, eye: V3, direction: V3, up: V3): void {
  view.camera.position.set(eye);
  view.camera.direction.set(direction);
  view.camera.orient(Float64Array.from(up));
  view.camera.version++;
}

/** The ray through the centre of pixel (px, py): origin and unit direction, in the root frame. */
function pixelRay(view: View, px: number, py: number): { o: V3; d: V3 } {
  const c = view.camera;
  const t = Math.tan(view.camera.fovy(WIDTH / HEIGHT) / 2);
  const ndcX = ((px + 0.5) / WIDTH) * 2 - 1;
  const ndcY = 1 - ((py + 0.5) / HEIGHT) * 2;
  const d: V3 = [0, 1, 2].map(
    (i) => c.direction[i]! + c.right[i]! * ndcX * t + c.up[i]! * ndcY * t,
  ) as V3;
  const length = Math.hypot(...d);
  return {
    o: [c.position[0]!, c.position[1]!, c.position[2]!],
    d: [d[0] / length, d[1] / length, d[2] / length],
  };
}

/** Where the pixel's ray meets the plane `axis` = `value` (axis 0, 1 or 2), or undefined. */
function onPlane(
  view: View,
  px: number,
  py: number,
  axis: number,
  value: number,
): V3 | undefined {
  const { o, d } = pixelRay(view, px, py);
  if (Math.abs(d[axis]!) < 1e-12) {
    return undefined;
  }
  const s = (value - o[axis]!) / d[axis]!;
  return s > 0
    ? [o[0] + s * d[0], o[1] + s * d[1], o[2] + s * d[2]]
    : undefined;
}

interface Comparison {
  /** Pixels compared: clear of every boundary. */
  checked: number;
  /** Of them expected white, and expected black. */
  white: number;
  black: number;
  /** Where the image differs from the classification. */
  wrong: number;
  /** Of those, expected white (drawn dark), and the box they lie in. */
  wrongWhite: number;
  firstX: number;
  firstY: number;
  lastX: number;
  lastY: number;
  /** Pixels left out for lying within a pixel of a boundary. */
  skipped: number;
}

/**
 * Compares the image's green channel (white above the midpoint of the
 * silhouette's own value and the background's) with `expected`, a
 * classification per pixel, over the pixels whose 3 × 3 neighbourhood agrees.
 */
function compare(
  pixels: Uint8ClampedArray,
  expected: (px: number, py: number) => boolean,
): Comparison {
  const e = new Uint8Array(WIDTH * HEIGHT);
  let brightest = 0;
  for (let py = 0; py < HEIGHT; py++) {
    for (let px = 0; px < WIDTH; px++) {
      e[py * WIDTH + px] = expected(px, py) ? 1 : 0;
      brightest = Math.max(brightest, pixels[(py * WIDTH + px) * 4 + 1]!);
    }
  }
  const out: Comparison = {
    checked: 0,
    white: 0,
    black: 0,
    wrong: 0,
    wrongWhite: 0,
    firstX: -1,
    firstY: -1,
    lastX: -1,
    lastY: -1,
    skipped: 0,
  };
  for (let py = 1; py < HEIGHT - 1; py++) {
    for (let px = 1; px < WIDTH - 1; px++) {
      const here = e[py * WIDTH + px]!;
      let uniform = true;
      for (let dy = -1; dy <= 1 && uniform; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (e[(py + dy) * WIDTH + px + dx] !== here) {
            uniform = false;
            break;
          }
        }
      }
      if (!uniform) {
        out.skipped++;
        continue;
      }
      out.checked++;
      const green = pixels[(py * WIDTH + px) * 4 + 1]!;
      const lit = green > brightest / 2;
      if (here) {
        out.white++;
      } else {
        out.black++;
      }
      if (lit !== (here === 1)) {
        out.wrong++;
        out.wrongWhite += here;
        if (out.firstX < 0) {
          out.firstX = px;
          out.firstY = py;
        }
        out.lastX = px;
        out.lastY = py;
      }
    }
  }
  return out;
}

/** Shows an image under a caption. */
function show(caption: string, pixels: Uint8ClampedArray): void {
  const figure = document.createElement("figure");
  const label = document.createElement("figcaption");
  label.textContent = caption;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = "320px";
  canvas.style.borderRadius = "4px";
  canvas
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pixels), WIDTH), 0, 0);
  figure.append(label, canvas);
  $("images").append(figure);
}

const unlitMaterial = (world: World) =>
  world.addMaterial({ baseColor: [1, 1, 1, 1], flags: MaterialFlags.unlit });

/** The first row of a drawn region (a column's topmost white pixel), or -1. */
function topWhite(pixels: Uint8ClampedArray, px: number): number {
  let brightest = 0;
  for (let i = 1; i < pixels.length; i += 4) {
    brightest = Math.max(brightest, pixels[i]!);
  }
  for (let py = 0; py < HEIGHT; py++) {
    if (pixels[(py * WIDTH + px) * 4 + 1]! > brightest / 2) {
      return py;
    }
  }
  return -1;
}

function format(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toFixed(3);
}

function render(checks: readonly Check[]): void {
  const cell = (text: string, className?: string) => {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) {
      td.className = className;
    }
    return td;
  };
  const table = $("results");
  const head = document.createElement("tr");
  for (const title of ["check", "measured", "value", "passes when", ""]) {
    const th = document.createElement("th");
    th.textContent = title;
    head.append(th);
  }
  table.replaceChildren(head);
  for (const c of checks) {
    const entries = Object.entries(c.measured);
    entries.forEach(([key, value], i) => {
      const tr = document.createElement("tr");
      if (i === 0) {
        const name = cell(`${c.id}. ${c.name}`, "text");
        name.rowSpan = entries.length;
        tr.append(name);
      }
      tr.append(cell(key, "text"), cell(format(value)));
      if (i === 0) {
        const limit = cell(c.limit, "text");
        limit.rowSpan = entries.length;
        const verdict = cell(c.pass ? "pass" : "FAIL");
        verdict.rowSpan = entries.length;
        tr.append(limit, verdict);
      }
      table.append(tr);
    });
  }
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
}

async function runClips(): Promise<ClipsResult> {
  const status = root.querySelector(".status")!;
  $("images").replaceChildren();
  $("results").replaceChildren();
  status.textContent = "checking…";
  const engine = await Engine.create();
  active = engine;
  let lostReason: string | undefined;
  void engine.gpu.device.lost.then((info) => {
    lostReason = info.message || info.reason;
  });
  const lost = () => {
    if (lostReason !== undefined) {
      throw new Error(`the GPU device was lost (${lostReason}); stopped`);
    }
    if (active !== engine) {
      throw new Error("stopped");
    }
  };
  const checks: Check[] = [];
  const gpuErrors: string[] = [];
  const onError = (event: Event) => {
    gpuErrors.push((event as GPUUncapturedErrorEvent).error.message);
  };
  engine.gpu.device.addEventListener("uncapturederror", onError);
  let id = 1;
  const add = (
    name: string,
    measured: Record<string, number>,
    limit: string,
    pass: boolean,
  ) => checks.push({ id: id++, name, measured, limit, pass });
  const comparison = (c: Comparison): Record<string, number> => ({
    "pixels compared": c.checked,
    "expected white": c.white,
    "expected black": c.black,
    wrong: c.wrong,
    "of them expected white": c.wrongWhite,
    "first wrong, x": c.firstX,
    "first wrong, y": c.firstY,
    "last wrong, x": c.lastX,
    "last wrong, y": c.lastY,
    "left out (within 1 px of a boundary)": c.skipped,
  });
  const MEANINGFUL =
    "every pixel clear of a boundary is as float64 classifies it, with white and black both well represented";
  const agrees = (c: Comparison, white = 1000) =>
    c.wrong === 0 && c.white > white && c.black > 2000;
  try {
    // The clipped pipelines are made when first asked for: here, all now, so
    // no frame is drawn uncut while they compile.
    await engine.ctx.pipelines.warmClipped();
    lost();

    // --- 1. a wall cut by a plane, and a window cut by a box -------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      // A thin wall, so what lies behind a cut is within a fraction of a pixel of it.
      const cube = world.addDraw({
        mesh: world.addMesh(boxMesh([4, 0.05, 4])),
        parent: s.earth,
        origin: Float64Array.from([0, 0, R + 4]),
        color: WHITE,
        unlit: true,
        doubleSided: true,
      });
      look(view, [0, -30, R + 4], [0, 1, 0], [0, 0, 1]);
      const plane: ClipSet = {
        frame: s.itrf,
        shapes: [{ kind: "plane", point: [0, 0, R + 5], normal: [0, 0, 3] }],
      };
      const window: ClipSet = {
        frame: s.itrf,
        shapes: [
          {
            kind: "box",
            center: [-1.5, 0, R + 2.5],
            halfExtents: [1.2, 12, 1],
          },
        ],
        keep: "outside",
      };
      const a = world.addClip(plane);
      const b = world.addClip(window);
      view.clipMask = a.bit | b.bit;
      await s.settle([cube]);
      const pixels = await s.capture();
      show("1. a wall cut by a plane and a box window", pixels);
      const inside = (px: number, py: number): boolean => {
        const p = onPlane(view, px, py, 1, -0.05);
        return (
          p !== undefined &&
          Math.abs(p[0]) <= 4 &&
          p[2] >= R &&
          p[2] <= R + 8 &&
          clipSetKeeps(plane, p) &&
          clipSetKeeps(window, p)
        );
      };
      const result = compare(pixels, inside);
      add(
        "a wall cut by a plane (above 5 m) and a box window (keep outside)",
        comparison(result),
        MEANINGFUL,
        agrees(result),
      );
      s.dispose();
    }

    // --- 2. a roof cut by an extruded L, from above ----------------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      // A thin plate, so nothing lies behind the cut.
      const plate = world.addDraw({
        mesh: world.addMesh(boxMesh([4, 4, 0.025])),
        parent: s.earth,
        origin: Float64Array.from([0, 0, R + 8]),
        color: WHITE,
        unlit: true,
        doubleSided: true,
      });
      look(view, [0, 0, R + 24], [0, 0, -1], [0, 1, 0]);
      const hole: ClipSet = {
        frame: s.itrf,
        shapes: [
          {
            kind: "polygon",
            ring: [
              [-3, -3],
              [1, -3],
              [1, -1],
              [-1, -1],
              [-1, 3],
              [-3, 3],
            ],
            zRange: [R - 1, R + 9],
          },
        ],
        keep: "outside",
      };
      view.setClips([world.addClip(hole)]);
      await s.settle([plate]);
      const pixels = await s.capture();
      show("2. a plate cut by an extruded L-shaped polygon", pixels);
      const inside = (px: number, py: number): boolean => {
        const p = onPlane(view, px, py, 2, R + 8.025);
        return (
          p !== undefined &&
          Math.abs(p[0]) <= 4 &&
          Math.abs(p[1]) <= 4 &&
          clipSetKeeps(hole, p)
        );
      };
      const result = compare(pixels, inside);
      add(
        "a plate cut by an extruded L-shaped polygon (concave), seen from above",
        comparison(result),
        MEANINGFUL,
        agrees(result, 2000),
      );
      s.dispose();
    }

    // --- 3 and 4. a tower under a ×10 warp, cut in the true and the drawn frame --
    for (const named of ["true", "drawn"] as const) {
      const s = scene(engine, true, lost);
      const { world, view } = s;
      const tower = world.addDraw({
        mesh: world.addMesh(boxMesh([2, 0.5, 1.5])),
        parent: s.earth,
        origin: Float64Array.from([0, 0, R + 1.5]),
        color: WHITE,
        unlit: true,
        doubleSided: true,
      });
      look(view, [0, -70, R + 15], [0, 1, 0], [0, 0, 1]);
      // 1 m up in ITRF is 10 m up as drawn; 12 m up as drawn is 1.2 m true.
      const set: ClipSet =
        named === "true"
          ? {
              frame: s.itrf,
              shapes: [
                { kind: "plane", point: [0, 0, R + 1], normal: [0, 0, 1] },
              ],
            }
          : {
              frame: s.drawn!,
              shapes: [
                { kind: "plane", point: [0, 0, R + 12], normal: [0, 0, 1] },
              ],
            };
      view.setClips([world.addClip(set)]);
      await s.settle([tower]);
      const pixels = await s.capture();
      show(
        `${named === "true" ? 3 : 4}. the ×10 tower cut by a plane named in the ${named} frame`,
        pixels,
      );
      const route = view.anchorRoute(s.earth);
      if (!route) {
        throw new Error(
          "the Earth's anchor has no route: the rig is not on a warp",
        );
      }
      const scratch = new Float64Array(3);
      const inside = (px: number, py: number): boolean => {
        const p = onPlane(view, px, py, 1, -0.5);
        if (!p || Math.abs(p[0]) > 2 || p[2] < R || p[2] > R + 30) {
          return false;
        }
        // The clip's own frame: ITRF holds the true point, the drawn frame this one.
        const at = named === "true" ? routeInverse(route, p, scratch) : p;
        return clipSetKeeps(set, at);
      };
      const result = compare(pixels, inside);
      // Where the cut falls, measured: the topmost white row of the tower's middle column.
      const top = topWhite(pixels, WIDTH >> 1);
      const wanted = named === "true" ? R + 10 : R + 12;
      const expectedRow = view.toPixel([0, -0.5, wanted], view.world.root)![1]!;
      const naiveTrue = view.toPixel([0, -0.5, R + 1], view.world.root)![1]!;
      add(
        `a ×10 tower cut by a plane named in the ${named} frame`,
        {
          ...comparison(result),
          "cut row measured": top,
          "cut row expected": expectedRow,
          ...(named === "true"
            ? { "row of the cut if tested on the drawn point": naiveTrue }
            : {}),
        },
        `${MEANINGFUL}; the cut within 1 px of the route's (${named === "true" ? "1 m true = 10 m drawn" : "12 m drawn"})`,
        agrees(result) && Math.abs(top - expectedRow) <= 1.5,
      );
      s.dispose();
    }

    // --- 5. a b-rep cut --------------------------------------------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      const brep = world.addBrep(cappedCylinderBrep(), {
        parent: s.earth,
        origin: Float64Array.from([0, 0, R]),
        material: unlitMaterial(world),
        doubleSided: true,
        errorPixels: 0.5,
      });
      look(view, [0, -9, R + 1.5], [0, 1, 0], [0, 0, 1]);
      const plane: ClipSet = {
        frame: s.itrf,
        shapes: [{ kind: "plane", point: [0, 0, R + 1.8], normal: [0, 0, 1] }],
      };
      view.setClips([world.addClip(plane)]);
      await s.settle([]);
      const pixels = await s.capture();
      show("5. a capped cylinder (a b-rep) cut by a plane", pixels);
      const inside = (px: number, py: number): boolean => {
        // The first surface the pixel's ray meets that the clip keeps: the
        // cylinder's two walls (x² + y² = 1, between z = 0 and 3 m) and its
        // two discs.
        const { o, d } = pixelRay(view, px, py);
        const hits: number[] = [];
        const a = d[0] * d[0] + d[1] * d[1];
        const b = 2 * (o[0] * d[0] + o[1] * d[1]);
        const c = o[0] * o[0] + o[1] * o[1] - 1;
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
          const q = Math.sqrt(disc);
          for (const t of [(-b - q) / (2 * a), (-b + q) / (2 * a)]) {
            const z = o[2] + t * d[2] - R;
            if (t > 0 && z >= 0 && z <= 3) {
              hits.push(t);
            }
          }
        }
        for (const z of [0, 3]) {
          const t = (R + z - o[2]) / d[2];
          const x = o[0] + t * d[0];
          const y = o[1] + t * d[1];
          if (t > 0 && x * x + y * y <= 1) {
            hits.push(t);
          }
        }
        return hits.some((t) =>
          clipSetKeeps(plane, [
            o[0] + t * d[0],
            o[1] + t * d[1],
            o[2] + t * d[2],
          ]),
        );
      };
      const result = compare(pixels, inside);
      // The cylinder's edge on screen is 1 px from where the axis plane puts it by perspective alone.
      add(
        "a capped cylinder (b-rep: patch draws, trimmed caps) cut by a plane",
        {
          ...comparison(result),
          "patch draw": brep.patches ? 1 : 0,
          "trimmed patch draw": brep.trimmed ? 1 : 0,
          "CPU mesh draw": brep.mesh ? 1 : 0,
        },
        MEANINGFUL,
        agrees(result, 1000),
      );
      s.dispose();
    }

    // --- 6. picks through a clipped region -------------------------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      const slab = (name: string, y: number) =>
        world.addDraw({
          mesh: world.addMesh(boxMesh([4, 0.5, 4])),
          parent: s.earth,
          origin: Float64Array.from([0, y, R + 4]),
          color: WHITE,
          unlit: true,
          doubleSided: true,
          name,
        });
      slab("front", -1);
      slab("back", 3);
      look(view, [0, -30, R + 4], [0, 1, 0], [0, 0, 1]);
      const pickAt = async (x: number, y: number) => {
        let done = false;
        let name: string | undefined;
        void view.pick(x, y).then((r) => {
          name = r?.name;
          done = true;
        });
        for (let i = 0; i < 400 && !done; i++) {
          engine.renderFrame();
          lost();
          await sleep(8);
        }
        if (!done) {
          throw new Error(`the pick at (${x}, ${y}) did not answer`);
        }
        return name;
      };
      const pixelOf = (p: V3): [number, number] => {
        const q = view.toPixel(p, world.root)!;
        return [Math.floor(q[0]!), Math.floor(q[1]!)];
      };
      const [wx, wy] = pixelOf([-1.5, -1, R + 2.5]);
      const [ox, oy] = pixelOf([2, -1, R + 6]);
      await s.settle([]);
      const before = await pickAt(wx, wy);
      const window: ClipSet = {
        frame: s.itrf,
        shapes: [
          {
            kind: "box",
            center: [-1.5, -1, R + 2.5],
            halfExtents: [1.2, 1, 1],
          },
        ],
        keep: "outside",
      };
      const clip = world.addClip(window);
      view.setClips([clip]);
      await s.settle([]);
      const through = await pickAt(wx, wy);
      const outside = await pickAt(ox, oy);
      view.clipMask = 0;
      await s.settle([]);
      const after = await pickAt(wx, wy);
      add(
        "a pick through a clipped region hits what is behind it",
        {
          'front slab without the clip (1: "front")':
            before === "front" ? 1 : 0,
          'through the window (1: "back")': through === "back" ? 1 : 0,
          'outside the window, same view (1: "front")':
            outside === "front" ? 1 : 0,
          'after the mask is cleared (1: "front")': after === "front" ? 1 : 0,
        },
        "the pick variant discards what the clips remove, as the drawn image does, and only for the view that opted in",
        before === "front" &&
          through === "back" &&
          outside === "front" &&
          after === "front",
      );
      s.dispose();
    }

    // --- 7. a view without clips ------------------------------------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      const cube = world.addDraw({
        mesh: world.addMesh(boxMesh([4, 4, 4])),
        parent: s.earth,
        origin: Float64Array.from([0, 0, R + 4]),
        color: WHITE,
        unlit: true,
        doubleSided: true,
      });
      look(view, [0, -30, R + 4], [0, 1, 0], [0, 0, 1]);
      const clip = world.addClip({
        frame: s.itrf,
        shapes: [{ kind: "plane", point: [0, 0, R + 5], normal: [0, 0, 1] }],
      });
      await s.settle([cube]);
      const whiteRows = (pixels: Uint8ClampedArray) => {
        let n = 0;
        for (let i = 1; i < pixels.length; i += 4) {
          n += pixels[i]! > 127 ? 1 : 0;
        }
        return n;
      };
      // A clip that exists, in a view that didn't opt in: nothing is cut, and
      // the view runs the pipelines without the test.
      const plain = await s.capture();
      const frame = engine.raster.viewFrames.get(view)!;
      const plainBytes = frame.clipBytes;
      view.setClips([clip]);
      const cut = await s.capture();
      const cutBytes = engine.raster.viewFrames.get(view)!.clipBytes;
      view.clipMask = 0;
      const restored = await s.capture();
      add(
        "a view that has not opted in draws everything; clearing the mask restores it",
        {
          "white pixels, no mask": whiteRows(plain),
          "white pixels, masked": whiteRows(cut),
          "white pixels, mask cleared": whiteRows(restored),
          "clip table bytes uploaded, no mask": plainBytes,
          "clip table bytes uploaded, masked": cutBytes,
        },
        "no table without the mask; the cut removes white pixels; clearing it restores the image exactly",
        plainBytes === 0 &&
          cutBytes > 0 &&
          whiteRows(cut) < whiteRows(plain) &&
          whiteRows(restored) === whiteRows(plain),
      );
      s.dispose();
    }

    // --- 8. glass, shadows and ambient occlusion with clips on -----------------
    // The translucent passes (both methods), the shadow casters and the
    // prepass have clipped pipelines too: a blended pane in front of the wall
    // is cut by the same plane, and the whole set runs without a GPU error.
    for (const method of ["moments", "exact"] as const) {
      const s = scene(engine, false, lost, {
        shadows: true,
        ambientOcclusion: true,
        translucencyMethod: method,
      });
      const { world, view } = s;
      const wall = world.addDraw({
        mesh: world.addMesh(boxMesh([4, 0.05, 4])),
        parent: s.earth,
        origin: Float64Array.from([0, 0, R + 4]),
        color: WHITE,
        unlit: true,
        doubleSided: true,
      });
      const glass = world.addDraw({
        mesh: world.addMesh(boxMesh([4, 0.05, 4])),
        parent: s.earth,
        origin: Float64Array.from([0, -3, R + 4]),
        material: world.addMaterial({
          baseColor: [1, 1, 1, 0.5],
          flags: MaterialFlags.unlit | MaterialFlags.alphaBlend,
        }),
        unlit: true,
        doubleSided: true,
      });
      look(view, [0, -30, R + 4], [0, 1, 0], [0, 0, 1]);
      const plane: ClipSet = {
        frame: s.itrf,
        shapes: [{ kind: "plane", point: [0, 0, R + 5], normal: [0, 0, 1] }],
      };
      view.setClips([world.addClip(plane)]);
      await s.settle([wall, glass]);
      await s.settle([]);
      const pixels = await s.capture();
      show(
        `8. a pane of glass and a wall, cut by one plane (${method})`,
        pixels,
      );
      const inside = (px: number, py: number): boolean =>
        [-0.05, -3].some((y) => {
          const p = onPlane(view, px, py, 1, y);
          return (
            p !== undefined &&
            Math.abs(p[0]) <= 4 &&
            p[2] >= R &&
            p[2] <= R + 8 &&
            clipSetKeeps(plane, p)
          );
        });
      const result = compare(pixels, inside);
      add(
        `a blended pane in front of a wall, cut by one plane, with shadows and ambient occlusion on (${method})`,
        comparison(result),
        MEANINGFUL,
        agrees(result, 2000),
      );
      s.dispose();
    }
  } finally {
    engine.gpu.device.removeEventListener("uncapturederror", onError);
    add(
      "no GPU validation error in any case",
      { "uncaptured errors": gpuErrors.length },
      "the clipped pipelines of every pass (depth, color, translucency, shadows, prepass, picks) are valid",
      gpuErrors.length === 0,
    );
    if (gpuErrors.length > 0) {
      console.error(`[clips] GPU errors: ${gpuErrors.slice(0, 3).join(" | ")}`);
    }
    $("adapter").textContent = `Adapter: ${describe(engine)}`;
    stop(engine);
    render(checks);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
    if (failed.length) {
      console.error(
        `[clips] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    pass: checks.length === 10 && checks.every((c) => c.pass),
  };
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runClips, dispose: () => stop(active) };
  },
};
