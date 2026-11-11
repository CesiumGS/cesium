// Curved clips on the GPU against the CPU's classification (plan §13.26,
// increment 8c; the Node test is test/curvedClips.test.ts). Unlit white
// content on black, drawn into an offscreen target with a clip on, and every
// pixel read back and compared with what float64 says the clip keeps there:
// the pixel's ray carried to the surface, to the true point (the route's
// inverse, where the rig is on a drawn frame), routed into the clip's own
// frame by the reprojection that bends it (`routeForward`), and tested there
// (`clipSetKeeps`). Pixels within 1 px of a boundary (of the clip or of the
// silhouette) are left out, as the other spikes do.
//
// The clip is a plane named in a design frame reached from ITRF by a
// non-presentation warp (z' = z + A sin(x / L) sin(y / L)): on a flat plate in
// ITRF it is a wavy contour no rigid test can draw. Its signed distance is
// fitted per draw into the lattice rows' w channel; the vertex stage reads
// it, the fragment stage discards by its sign.
//
// Cases, each in a view that opts into its clips by mask:
//   1. a plate (a 96 × 96 grid, so the interpolated distance follows the
//      surface) under an ITRF root, cut by the curved plane: the draw has no
//      lattice, so it carries the field on one of its own (a carrier);
//   2. the same plate drawn under a ×10 height warp (the rig sits on the
//      drawn frame): the field rides on the route's lattice, and the cut is
//      on the true surface;
//   3. a curved plane and a rigid one in one view, together;
//   4. a box window in the design frame, keep outside: a distance with kinks;
//   5. picks through the cut hit what is behind it;
//   6. clearing the mask restores the image and the draw's placement.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { routeForward, routeInverse } from "../src/camera/route.ts";
import {
  createFrameCatalog,
  createFramesResolver,
  warpFrame,
} from "../src/frames/index.ts";
import {
  EARTH,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  clipSetKeeps,
  type ClipSet,
  type MeshData,
  type View,
  type World,
} from "../src/index.ts";
import { clipSetDistance } from "../src/scene/world/clips.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";

const TEMPLATE = `
<h1>Curved clips on the GPU against the CPU's classification</h1>
<p>
  A plate cut by a plane named in a design frame that a reprojection bends
  away from ITRF, so its cut is a curve on the plate. Every pixel is compared
  with float64's classification of the surface point it shows, routed into the
  clip's own frame. Pixels within 1 px of a boundary are left out.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 512;
const HEIGHT = 512;
const R = 6_378_137;
/** The exaggeration the warped case draws at. */
const K = 10;
/** The reprojection's bend, m, and its length, m. */
const AMPLITUDE = 6;
const LENGTH = 8;
/** The plate: half its side, m, and its height in ITRF. */
const HALF = 12;
const PLATE = R + 8;
const WHITE = [1, 1, 1, 1] as const;

type V3 = [number, number, number];

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface CurvedClipsResult {
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

/** A square grid of `cells` × `cells` quads over [−half, half]², at z = 0. */
function gridMesh(half: number, cells: number): MeshData {
  const n = cells + 1;
  const positions = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const o = (j * n + i) * 3;
      positions[o] = -half + (2 * half * i) / cells;
      positions[o + 1] = -half + (2 * half * j) / cells;
    }
  }
  const indices = new Uint32Array(cells * cells * 6);
  let k = 0;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const a = j * n + i;
      indices.set([a, a + 1, a + n + 1, a, a + n + 1, a + n], k);
      k += 6;
    }
  }
  return { positions, indices };
}

/** The reprojection: ITRF to the design frame. */
function bend(
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const sx = Math.sin(p[0]! / LENGTH);
  const cx = Math.cos(p[0]! / LENGTH);
  const sy = Math.sin(p[1]! / LENGTH);
  const cy = Math.cos(p[1]! / LENGTH);
  out[0] = p[0]!;
  out[1] = p[1]!;
  out[2] = p[2]! + AMPLITUDE * sx * sy;
  jacobian?.set([
    1,
    0,
    (AMPLITUDE / LENGTH) * cx * sy,
    0,
    1,
    (AMPLITUDE / LENGTH) * sx * cy,
    0,
    0,
    1,
  ]);
  return out;
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

type Frames = ReturnType<typeof createFrameCatalog>;
type Frame = ReturnType<Frames["get"]>;

interface Scene {
  world: World;
  view: View;
  target: OffscreenTarget;
  earth: AnchorHandle;
  itrf: Frame;
  design: ReturnType<typeof warpFrame>;
  /** ITRF to the design frame, in float64: the truth. */
  toDesign(p: ArrayLike<number>): Float64Array;
  /** Renders frames until the draws' fits and curved fields have landed. */
  settle(draws: readonly DrawHandle[], curved?: boolean): Promise<void>;
  capture(): Promise<Uint8ClampedArray>;
  frames(n: number): Promise<void>;
  dispose(): void;
}

function scene(
  engine: Engine,
  warped: boolean,
  lost: () => void,
  extra: Partial<Parameters<Engine["addView"]>[0]> = {},
): Scene & { drawn: ReturnType<typeof warpFrame> | undefined } {
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
  const design = warpFrame("design", itrf, {
    presentation: false,
    revision: 1,
    description: "a bending reprojection",
    forward: bend,
  });
  catalog.add(design);
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
  const resolver = createFramesResolver(catalog);
  engine.cameras.setResolver(world, resolver);
  const earth = world.bodyAnchor(EARTH);
  engine.cameras.setRig(view, {
    position: { frame: drawn ?? itrf },
    orientation: { kind: "free" },
  });
  const route = resolver.route!(itrf, design, 0);
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
    design,
    drawn,
    toDesign: (p) => routeForward(route, p),
    frames,
    async settle(draws, curved = false) {
      for (let i = 0; i < 300; i++) {
        await frames(1);
        const fits = draws.every((d) => {
          const state = world.warps.status(d)?.state;
          return state === undefined || state === "fitted";
        });
        const fields =
          !curved ||
          (world.warps.curved.active &&
            world.warps.curved.pending === 0 &&
            draws.every(
              (d) => world.warps.curved.status(d)?.state === "fitted",
            ));
        if (fits && fields) {
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

/** Where the pixel's ray meets the plane z = `value`, or undefined. */
function onPlane(
  view: View,
  px: number,
  py: number,
  value: number,
): V3 | undefined {
  const { o, d } = pixelRay(view, px, py);
  if (Math.abs(d[2]) < 1e-12) {
    return undefined;
  }
  const s = (value - o[2]) / d[2];
  return s > 0
    ? [o[0] + s * d[0], o[1] + s * d[1], o[2] + s * d[2]]
    : undefined;
}

interface Comparison {
  checked: number;
  white: number;
  black: number;
  wrong: number;
  wrongWhite: number;
  firstX: number;
  firstY: number;
  skipped: number;
}

/**
 * Compares the image's green channel (white above the midpoint of the
 * brightest value and the background's) with `expected`, over the pixels
 * whose 3 × 3 neighbourhood agrees.
 */
function compare(
  pixels: Uint8ClampedArray,
  expected: (px: number, py: number) => boolean,
  uncertain?: (px: number, py: number) => boolean,
): Comparison {
  const e = new Uint8Array(WIDTH * HEIGHT);
  let brightest = 0;
  for (let py = 0; py < HEIGHT; py++) {
    for (let px = 0; px < WIDTH; px++) {
      // A pixel the field's stated error can't classify is its own class, left out with its neighbours.
      e[py * WIDTH + px] = uncertain?.(px, py) ? 2 : expected(px, py) ? 1 : 0;
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
    skipped: 0,
  };
  for (let py = 1; py < HEIGHT - 1; py++) {
    for (let px = 1; px < WIDTH - 1; px++) {
      const here = e[py * WIDTH + px]!;
      let uniform = here !== 2;
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
      const lit = pixels[(py * WIDTH + px) * 4 + 1]! > brightest / 2;
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
      }
    }
  }
  return out;
}

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

function whitePixels(pixels: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 1; i < pixels.length; i += 4) {
    n += pixels[i]! > 127 ? 1 : 0;
  }
  return n;
}

function format(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toPrecision(4);
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

/** A plane in the design frame 1.5 m above the plate's height there: kept below it. */
function curvedPlane(s: Scene): ClipSet {
  return {
    frame: s.design,
    shapes: [{ kind: "plane", point: [0, 0, PLATE + 1.5], normal: [0, 0, 1] }],
  };
}

async function runCurvedClips(): Promise<CurvedClipsResult> {
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
    "left out (within 1 px of a boundary)": c.skipped,
  });
  const MEANINGFUL =
    "every pixel clear of a boundary is as float64 classifies it, with white and black both well represented";
  const agrees = (c: Comparison) =>
    c.wrong === 0 && c.white > 3000 && c.black > 3000;
  const plate = (s: Scene, name = "plate") =>
    s.world.addDraw({
      mesh: s.world.addMesh(gridMesh(HALF, 96)),
      parent: s.earth,
      origin: Float64Array.from([0, 0, PLATE]),
      color: WHITE,
      unlit: true,
      doubleSided: true,
      name,
    });
  /** The pixel's point on the plate as drawn, as a true ITRF point (the rig's route undone when drawn). */
  const trueOf = (s: Scene, drawn: boolean) => {
    const route = drawn ? s.view.anchorRoute(s.earth) : undefined;
    const scratch = new Float64Array(3);
    return (px: number, py: number): V3 | undefined => {
      const p = onPlane(s.view, px, py, drawn ? R + (PLATE - R) * K : PLATE);
      if (!p) {
        return undefined;
      }
      const t = route ? routeInverse(route, p, scratch) : p;
      return [t[0]!, t[1]!, t[2]!];
    };
  };
  const onPlate = (p: V3) => Math.abs(p[0]) <= HALF && Math.abs(p[1]) <= HALF;
  const fieldOf = (s: Scene, d: DrawHandle) => {
    const st = s.world.warps.curved.status(d);
    return {
      "field error, m": st?.errorBound ?? -1,
      "field cells per axis": st?.cells ?? 0,
      "carrier lattice (1: the draw had none)": st?.carrier ? 1 : 0,
    };
  };
  try {
    await engine.ctx.pipelines.warmClipped();
    lost();

    // --- 1 and 2. a plate cut by a curved plane, under an ITRF root and a ×10 root --
    for (const warped of [false, true]) {
      const s = scene(engine, warped, lost);
      const { world, view } = s;
      const draw = plate(s);
      look(
        view,
        [0, 0, (warped ? R + (PLATE - R) * K : PLATE) + 40],
        [0, 0, -1],
        [0, 1, 0],
      );
      const set = curvedPlane(s);
      view.setClips([world.addClip(set)]);
      await s.settle([draw], true);
      const pixels = await s.capture();
      show(
        `${warped ? 2 : 1}. a plate cut by a plane in a bent design frame, ${warped ? "drawn ×10 (the field rides on the route's lattice)" : "under an ITRF root (the field is on a carrier lattice)"}`,
        pixels,
      );
      const point = trueOf(s, warped);
      const inside = (px: number, py: number): boolean => {
        const p = point(px, py);
        return (
          p !== undefined && onPlate(p) && clipSetKeeps(set, s.toDesign(p))
        );
      };
      const result = compare(pixels, inside);
      const field = fieldOf(s, draw);
      add(
        warped
          ? "a plate drawn under a ×10 height warp, cut on its true surface by a plane in a bent design frame"
          : "a plate under an ITRF root cut by a plane in a bent design frame (a wavy contour)",
        { ...comparison(result), ...field },
        `${MEANINGFUL}; the field's error is stated, under 0.1 m (a pixel is 9 cm here)`,
        agrees(result) &&
          field["field error, m"] >= 0 &&
          field["field error, m"] < 0.1 &&
          field["carrier lattice (1: the draw had none)"] === (warped ? 0 : 1),
      );
      s.dispose();
    }

    // --- 3. a curved plane and a rigid one in one view -----------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      const draw = plate(s);
      look(view, [0, 0, PLATE + 40], [0, 0, -1], [0, 1, 0]);
      const curved = curvedPlane(s);
      const rigid: ClipSet = {
        frame: s.itrf,
        shapes: [{ kind: "plane", point: [5, 0, PLATE], normal: [1, 0, 0] }],
      };
      view.setClips([world.addClip(curved), world.addClip(rigid)]);
      await s.settle([draw], true);
      const pixels = await s.capture();
      show("3. the curved plane and a rigid one (x ≤ 5 m)", pixels);
      const point = trueOf(s, false);
      const inside = (px: number, py: number): boolean => {
        const p = point(px, py);
        return (
          p !== undefined &&
          onPlate(p) &&
          clipSetKeeps(curved, s.toDesign(p)) &&
          clipSetKeeps(rigid, p)
        );
      };
      const result = compare(pixels, inside);
      add(
        "a curved plane (fitted) and a rigid one (tested at the true point), in one view",
        comparison(result),
        MEANINGFUL,
        agrees(result),
      );
      s.dispose();
    }

    // --- 4. a box window in the design frame, keep outside ---------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      const draw = plate(s);
      look(view, [0, 0, PLATE + 40], [0, 0, -1], [0, 1, 0]);
      const window: ClipSet = {
        frame: s.design,
        shapes: [
          {
            kind: "box",
            center: [1, -1, PLATE],
            halfExtents: [6, 4, 2],
          },
        ],
        keep: "outside",
      };
      view.setClips([world.addClip(window)]);
      await s.settle([draw], true);
      const pixels = await s.capture();
      show("4. a box window in the design frame (keep outside)", pixels);
      const point = trueOf(s, false);
      const inside = (px: number, py: number): boolean => {
        const p = point(px, py);
        return (
          p !== undefined && onPlate(p) && clipSetKeeps(window, s.toDesign(p))
        );
      };
      const field = fieldOf(s, draw);
      // Within the field's stated error of the window's boundary the cut is not promised.
      const stated = field["field error, m"];
      const result = compare(pixels, inside, (px, py) => {
        const p = point(px, py);
        return (
          p !== undefined &&
          onPlate(p) &&
          Math.abs(clipSetDistance(window, s.toDesign(p))) <= stated
        );
      });
      add(
        "a box window named in the bent design frame, keep outside (a distance with kinks)",
        { ...comparison(result), ...field },
        `${MEANINGFUL}, outside the stated error of the boundary (the box's kinks cost more than a plane's)`,
        agrees(result),
      );
      s.dispose();
    }

    // --- 5. picks through the cut ------------------------------------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      const front = plate(s, "front");
      world.addDraw({
        mesh: world.addMesh(gridMesh(HALF * 2, 8)),
        parent: s.earth,
        origin: Float64Array.from([0, 0, PLATE - 3]),
        color: WHITE,
        unlit: true,
        doubleSided: true,
        name: "back",
      });
      look(view, [0, 0, PLATE + 40], [0, 0, -1], [0, 1, 0]);
      const set = curvedPlane(s);
      const point = trueOf(s, false);
      const kept = (px: number, py: number) => {
        const p = point(px, py);
        return (
          p !== undefined && onPlate(p) && clipSetKeeps(set, s.toDesign(p))
        );
      };
      // A pixel well inside a kept region, and one well inside a cut one: its 7 × 7 block agrees.
      const solid = (want: boolean) => {
        for (let py = 100; py < HEIGHT - 100; py += 3) {
          for (let px = 100; px < WIDTH - 100; px += 3) {
            const p = point(px, py);
            if (!p || !onPlate(p)) {
              continue;
            }
            let all = true;
            for (let dy = -3; dy <= 3 && all; dy++) {
              for (let dx = -3; dx <= 3; dx++) {
                const q = point(px + dx, py + dy);
                if (!q || !onPlate(q) || kept(px + dx, py + dy) !== want) {
                  all = false;
                  break;
                }
              }
            }
            if (all) {
              return [px, py] as const;
            }
          }
        }
        throw new Error("no solid block to pick at");
      };
      const keptAt = solid(true);
      const cutAt = solid(false);
      view.setClips([world.addClip(set)]);
      await s.settle([front], true);
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
      const inKept = await pickAt(keptAt[0], keptAt[1]);
      const inCut = await pickAt(cutAt[0], cutAt[1]);
      view.clipMask = 0;
      await s.settle([front]);
      const unclipped = await pickAt(cutAt[0], cutAt[1]);
      add(
        "a pick through the curved cut hits what is behind it",
        {
          'where the clip keeps the plate (1: "front")':
            inKept === "front" ? 1 : 0,
          'through the cut (1: "back")': inCut === "back" ? 1 : 0,
          'the same pixel without the clip (1: "front")':
            unclipped === "front" ? 1 : 0,
        },
        "the pick variant discards by the same fitted distance as the drawn image",
        inKept === "front" && inCut === "back" && unclipped === "front",
      );
      s.dispose();
    }

    // --- 6. clearing the mask restores the image and the draw ---------------------
    {
      const s = scene(engine, false, lost);
      const { world, view } = s;
      const draw = plate(s);
      look(view, [0, 0, PLATE + 40], [0, 0, -1], [0, 1, 0]);
      await s.settle([draw]);
      const plain = await s.capture();
      const placedBefore = world.scene.drawPlacements[draw.index] !== undefined;
      view.setClips([world.addClip(curvedPlane(s))]);
      await s.settle([draw], true);
      const cut = await s.capture();
      const carrying = world.warps.curved.status(draw)?.carrier ? 1 : 0;
      view.clipMask = 0;
      await s.settle([draw]);
      await s.frames(3);
      const restored = await s.capture();
      const stillActive = world.warps.curved.active ? 1 : 0;
      const placedAfter = world.scene.drawPlacements[draw.index] !== undefined;
      add(
        "clearing the mask restores the image and removes the carrier",
        {
          "white pixels, no mask": whitePixels(plain),
          "white pixels, curved clip": whitePixels(cut),
          "white pixels, mask cleared": whitePixels(restored),
          "the draw carried a field (1: yes)": carrying,
          "the world's field still active (1: yes)": stillActive,
          "the draw is placed before / after (1: yes)":
            (placedBefore ? 10 : 0) + (placedAfter ? 1 : 0),
        },
        "the cut removes white pixels; clearing the mask restores the image exactly and the draw to unplaced",
        carrying === 1 &&
          stillActive === 0 &&
          !placedBefore &&
          !placedAfter &&
          whitePixels(cut) < whitePixels(plain) &&
          whitePixels(restored) === whitePixels(plain),
      );
      s.dispose();
    }
  } finally {
    engine.gpu.device.removeEventListener("uncapturederror", onError);
    add(
      "no GPU validation error in any case",
      { "uncaptured errors": gpuErrors.length },
      "the placement rows' w, the widened varying and the clipped pipelines are valid",
      gpuErrors.length === 0,
    );
    if (gpuErrors.length > 0) {
      console.error(
        `[curvedClips] GPU errors: ${gpuErrors.slice(0, 3).join(" | ")}`,
      );
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
        `[curvedClips] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    pass: checks.length === 7 && checks.every((c) => c.pass),
  };
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runCurvedClips, dispose: () => stop(active) };
  },
};
