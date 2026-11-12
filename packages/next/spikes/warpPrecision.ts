// A placed draw's order-0 displacement against the float64 route, at the
// millimetre (plan §13.26, the second review's flaw 3; the Node test is
// test/warpPrecision.test.ts). The fit's constant term used to be added to
// each vertex in model space, before the camera-relative transform, so two
// large float32 numbers cancelled: 4 mm at a 36 km displacement, 0.25 to
// 0.5 m for a whole-world map at street level. The cull kernel now adds it
// to the camera-relative translation, summed exactly (cullTables.slang
// `drawnTranslation`).
//
// The Earth's anchor is placed in a smooth frame under ITRF, and the camera
// on ITRF is 3 m above a 0.6 m quad's drawn place, looking down through a 15° field of view (1.5 mm a pixel). Two
// warps: height × 10 over a sphere, with the quad 4 km up (a 36 km
// displacement), and a translation of (3,000, 2,000) km. Each of the four
// corners, measured from the image (as spikes/warpRoute.ts), must land
// within 0.5 mm of where the float64 route (`routeForward`) and the view's
// projection put it, plus the fit's own error.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { routeForward } from "../src/camera/route.ts";
import {
  createFrameCatalog,
  createFramesResolver,
  smoothFrame,
} from "../src/frames/index.ts";
import {
  EARTH,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type MeshData,
  type View,
  type World,
} from "../src/index.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";

const TEMPLATE = `
<h1>A placed draw's large displacement against the float64 route</h1>
<p>
  A 0.6 m quad anchored in ITRF at the north pole, placed in a frame
  whose edge to ITRF is a warp, drawn 3 m below the camera, which sits where
  the warp puts it. The warp moves it
  by 36 km (height × 10, the quad 4 km up) or by thousands of kilometers (a
  translation). Its corners, measured from the image at 1.5 mm a pixel,
  against where <code>routeForward</code> and the view's projection put
  them: within half a millimeter.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 512;
const HEIGHT = 512;
/** The exaggeration's sphere, m: the ellipsoid's equatorial radius. */
const SPHERE = 6_378_137;
/** The exaggeration. */
const K = 10;
/** The camera's height over the quad's drawn place, m. */
const EYE_HEIGHT = 3;
/** The field of view, radians (15°). */
const FOV = (15 * Math.PI) / 180;
/** The camera's turn about its axis, radians (7°). */
const TURN = (7 * Math.PI) / 180;
/** The most a corner may be off, mm. */
const LIMIT_MM = 0.5;

/** The corners in model coordinates, counterclockwise, off z = 0. */
const CORNERS = [
  [-0.3, -0.3, 0.02],
  [0.3, -0.3, -0.03],
  [0.3, 0.3, 0.025],
  [-0.3, 0.3, -0.01],
] as const;

const quad: MeshData = {
  positions: Float32Array.from(CORNERS.flat()),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
};

interface Case {
  name: string;
  /** Where the quad's origin sits in ITRF, m. */
  origin: [number, number, number];
  /** The warp: `forward` and its description. */
  forward: (
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ) => Float64Array;
  description: string;
}

/** Height over the sphere times `k`, along the radial, with its Jacobian. */
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
  const f = SPHERE + k * (r - SPHERE);
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

const SHIFT = [3_000_000.37, 2_000_000.61, 1234.567] as const;

const CASES: readonly Case[] = [
  {
    name: `height × ${K}, the quad 4.1 km up (37 km displacement)`,
    origin: [0.4, 0, SPHERE + 4123.37],
    forward: (p, out, jacobian) => exaggerate(K, p, out, jacobian),
    description: `height × ${K}`,
  },
  {
    name: "a translation of 3,000 and 2,000 km",
    origin: [0.4, 0, SPHERE + 1.5],
    forward: (p, out, jacobian) => {
      out[0] = p[0]! + SHIFT[0];
      out[1] = p[1]! + SHIFT[1];
      out[2] = p[2]! + SHIFT[2];
      if (jacobian) {
        jacobian.set([1, 0, 0, 0, 1, 0, 0, 0, 1]);
      }
      return out;
    },
    description: "a translation",
  },
];

interface Check {
  id: number;
  name: string;
  /** Each measured value, by what it measures. */
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface WarpPrecisionResult {
  adapter: string;
  /** How pixel values were read as coverage. */
  coverage: string;
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

async function runWarpPrecision(): Promise<WarpPrecisionResult> {
  const status = root.querySelector(".status")!;
  $("images").replaceChildren();
  $("results").replaceChildren();
  status.textContent = "checking…";
  const checks: Check[] = [];
  let coverageMode = "";
  let adapter = "";
  let id = 1;
  const runCase = async (c: Case): Promise<void> => {
    const engine = await Engine.create();
    active = engine;
    adapter = describe(engine);
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
    try {
      const world: World = engine.createWorld({
        maxDraws: 8,
        vertexBytes: 1 << 16,
        indexBytes: 1 << 16,
      });
      const target = new OffscreenTarget(WIDTH, HEIGHT);
      const view = engine.addView({
        target,
        world,
        background: "color",
        clearColor: [0, 0, 0],
        observer: { exposure: UNITLESS_EXPOSURE },
      });
      const catalog = createFrameCatalog();
      const itrf = catalog.get("ITRF");
      const warped = smoothFrame("warped", itrf, {
        revision: 1,
        description: c.description,
        forward: c.forward,
      });
      catalog.add(warped);
      const resolver = createFramesResolver(catalog);
      engine.cameras.setResolver(world, resolver);
      const earth = world.bodyAnchor(EARTH);
      resolver.bindAnchor(earth, warped);
      engine.cameras.setRig(view, {
        position: { frame: itrf },
        orientation: { kind: "free" },
      });
      // Over the quad's drawn place (the route's image of its origin),
      // looking down, turned so no edge lies along a pixel row.
      const drawnOrigin = c.forward(c.origin, new Float64Array(3));
      view.camera.fov = FOV;
      view.camera.position.set([
        drawnOrigin[0]!,
        drawnOrigin[1]!,
        drawnOrigin[2]! + EYE_HEIGHT,
      ]);
      view.camera.orient(Float64Array.of(Math.sin(TURN), Math.cos(TURN), 0));
      view.camera.version++;
      const mesh = world.addMesh(quad);
      const draw: DrawHandle = world.addDraw({
        mesh,
        parent: earth,
        origin: Float64Array.from(c.origin),
        color: [1, 1, 1, 1],
        unlit: true,
        doubleSided: true,
      });
      for (let tries = 0; tries < 20; tries++) {
        engine.renderFrame();
        lost();
        if (world.warps.status(draw)?.state === "fitted") {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      engine.renderFrame();
      lost();
      const pixels = await target.read();
      lost();
      const route = project(view, earth, c.origin);
      const { corners, mode } = measureCorners(pixels, route.pixels);
      coverageMode = mode;
      const mmPerPixel =
        (route.nearest *
          2 *
          Math.tan(view.camera.fovy(WIDTH / HEIGHT) / 2) *
          1000) /
        HEIGHT;
      const measured: Record<string, number> = {};
      let worst = 0;
      corners.forEach((corner, i) => {
        const e = Math.hypot(
          corner[0] - route.pixels[i]![0],
          corner[1] - route.pixels[i]![1],
        );
        measured[`corner ${i}: GPU − route, mm`] = e * mmPerPixel;
        worst = Math.max(worst, e * mmPerPixel);
      });
      measured["the displacement, m"] = Math.hypot(
        drawnOrigin[0]! - c.origin[0],
        drawnOrigin[1]! - c.origin[1],
        drawnOrigin[2]! - c.origin[2],
      );
      measured["mm a pixel"] = mmPerPixel;
      const fitted = world.scene.drawPlacements[draw.index]?.terms.at(-1);
      const fitMm =
        fitted && fitted.term.kind === "cubic"
          ? fitted.term.errorBound * 1000
          : 0;
      measured["the fit's error bound, mm"] = fitMm;
      show(c.name, pixels, route.pixels);
      checks.push({
        id: id++,
        name: c.name,
        measured,
        limit: `each corner within ${LIMIT_MM} mm plus the fit's error of the route`,
        pass: worst <= LIMIT_MM + fitMm,
      });
    } finally {
      stop(engine);
    }
  };
  for (const c of CASES) {
    await runCase(c);
  }
  $("adapter").textContent = `Adapter: ${adapter}`;
  render(checks);
  const failed = checks.filter((c) => !c.pass);
  status.textContent = failed.length
    ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
    : `pass: all ${checks.length} checks`;
  if (failed.length) {
    console.error(
      `[warpPrecision] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
    );
  }
  return {
    adapter,
    coverage: coverageMode,
    checks,
    pass: checks.length === CASES.length && checks.every((c) => c.pass),
  };
}

/**
 * The quad's corners on screen as the route puts them (`routeForward`, then
 * the projection), px, and how far the nearest is from the camera, m.
 */
function project(
  view: View,
  earth: AnchorHandle,
  origin: readonly [number, number, number],
): { pixels: Array<[number, number]>; nearest: number } {
  const route = view.anchorRoute(earth);
  if (!route) {
    throw new Error(
      "the Earth's anchor has no route: it is not placed in a smooth frame",
    );
  }
  const eye = view.camera.position;
  let near = Infinity;
  const pixels = CORNERS.map((corner) => {
    const drawn = routeForward(route, [
      origin[0] + corner[0],
      origin[1] + corner[1],
      origin[2] + corner[2],
    ]);
    near = Math.min(
      near,
      Math.hypot(drawn[0]! - eye[0]!, drawn[1]! - eye[1]!, drawn[2]! - eye[2]!),
    );
    const p = view.toPixel(drawn, view.world.root);
    if (!p) {
      throw new Error("a corner is behind the camera");
    }
    return [p[0]!, p[1]!] as [number, number];
  });
  return { pixels, nearest: near };
}

/** sRGB-encoded 8-bit to linear. */
function linear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Each pixel's coverage, 0 to 1, from its green channel: with 4×
 * multisampling an unlit quad on black shows five values, read by rank;
 * otherwise sRGB-decoded and scaled between the background and the quad.
 */
function coverage(
  pixels: Uint8ClampedArray,
  inside: readonly [number, number],
): { c: Float32Array; mode: string } {
  const at = (x: number, y: number) => pixels[(y * WIDTH + x) * 4 + 1]!;
  const background = at(0, 0);
  const full = at(Math.floor(inside[0]), Math.floor(inside[1]));
  const levels = new Set<number>();
  for (let i = 1; i < pixels.length; i += 4) {
    levels.add(pixels[i]!);
  }
  const sorted = [...levels].sort((a, b) => a - b);
  const c = new Float32Array(WIDTH * HEIGHT);
  if (sorted.length === 5 && sorted[0] === background && sorted[4] === full) {
    const rank = new Map(sorted.map((v, i) => [v, i / 4]));
    for (let i = 0; i < c.length; i++) {
      c[i] = rank.get(pixels[i * 4 + 1]!)!;
    }
    return { c, mode: "five levels by rank (4× multisampling)" };
  }
  const lo = linear(background);
  const hi = linear(full);
  for (let i = 0; i < c.length; i++) {
    c[i] = Math.min(
      1,
      Math.max(0, (linear(pixels[i * 4 + 1]!) - lo) / (hi - lo)),
    );
  }
  return { c, mode: `sRGB-decoded (${sorted.length} levels)` };
}

/**
 * One quad's corners measured from the image: each edge's points from
 * coverage across it, a line fitted through them, and neighbouring lines
 * intersected. `expected` (the route's corners) says roughly where the
 * edges are and which side is inside.
 */
function measureCorners(
  pixels: Uint8ClampedArray,
  expected: ReadonlyArray<readonly [number, number]>,
): { corners: Array<[number, number]>; mode: string } {
  const center = [0, 1].map(
    (k) => expected.reduce((s, e) => s + e[k]!, 0) / expected.length,
  ) as [number, number];
  const { c, mode } = coverage(pixels, center);
  const cov = (x: number, y: number) =>
    x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT ? 0 : c[y * WIDTH + x]!;
  const HALF = 4;
  const lines = expected.map((a, i) => {
    const b = expected[(i + 1) % expected.length]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    const points: Array<[number, number]> = [];
    const alongX = Math.abs(dy) >= Math.abs(dx); // a steep edge: scan rows
    for (let s = 0.15; s <= 0.85; s += 0.5 / length) {
      const qx = a[0] + s * dx;
      const qy = a[1] + s * dy;
      if (alongX) {
        const row = Math.floor(qy);
        const x0 = Math.floor(qx) - HALF;
        const x1 = Math.floor(qx) + HALF + 1;
        let sum = 0;
        for (let x = x0; x < x1; x++) {
          sum += cov(x, row);
        }
        const x = center[0] > qx ? x1 - sum : x0 + sum;
        points.push([x, row + 0.5]);
      } else {
        const column = Math.floor(qx);
        const y0 = Math.floor(qy) - HALF;
        const y1 = Math.floor(qy) + HALF + 1;
        let sum = 0;
        for (let y = y0; y < y1; y++) {
          sum += cov(column, y);
        }
        const y = center[1] > qy ? y1 - sum : y0 + sum;
        points.push([column + 0.5, y]);
      }
    }
    return fitLine(points);
  });
  const corners = expected.map((_, i) => {
    const before = lines[(i + lines.length - 1) % lines.length]!;
    return intersect(before, lines[i]!);
  });
  return { corners, mode };
}

/** A line through points (total least squares): a point and a direction. */
function fitLine(points: ReadonlyArray<readonly [number, number]>) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p[0], 0) / n;
  const my = points.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const [x, y] of points) {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (y - my);
    syy += (y - my) ** 2;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { x: mx, y: my, dx: Math.cos(angle), dy: Math.sin(angle) };
}

function intersect(
  a: ReturnType<typeof fitLine>,
  b: ReturnType<typeof fitLine>,
): [number, number] {
  // a.x + s a.d = b.x + u b.d
  const det = a.dx * -b.dy - a.dy * -b.dx;
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const s = (rx * -b.dy - ry * -b.dx) / det;
  return [a.x + s * a.dx, a.y + s * a.dy];
}

/** Shows an image under a caption, the route's corners marked. */
function show(
  caption: string,
  pixels: Uint8ClampedArray,
  expected: ReadonlyArray<readonly [number, number]>,
): void {
  const figure = document.createElement("figure");
  const label = document.createElement("figcaption");
  label.textContent = caption;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.borderRadius = "4px";
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), WIDTH), 0, 0);
  ctx.strokeStyle = "#e5484d";
  for (const [x, y] of expected) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.stroke();
  }
  figure.append(label, canvas);
  $("images").append(figure);
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
}

function format(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }
  return value.toFixed(3);
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

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runWarpPrecision, dispose: () => stop(active) };
  },
};
