// A route across a warp on the GPU against the float64 route (plan §13.26,
// increment 1, slice D; the Node test is test/warpWorld.test.ts). The
// Earth's anchor is placed in `exaggerated`, a smooth frame under ITRF that
// multiplies height over a sphere by 10 (and by a scale, a world's placement parameter: the
// slider). Three quads anchored in ITRF at the north pole, a metre up, are
// drawn unlit into an offscreen target. Nothing is set per item: the engine
// fits the route over each draw and the shader displaces its vertices
// (shaders/placement.slang).
//
// Three captures: the scale at 0 (the warp at no strength, which is the
// measurement itself), at 1 (height × 10), and at 0.4 (height × 4.6), the last
// two by writing one float, with no refit. Each vertex is measured from the
// image (as spikes/placement.ts: each edge fitted from its pixels'
// coverage, neighbouring edges intersected), and must land within half a
// pixel, plus the fit's own error in pixels, of where the float64 route
// (`routeForward`) and the view's projection (`View.toPixel`) put it.
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
import { weightOf } from "../src/scene/warpEvaluate.ts";
import type { CubicLattice } from "../src/scene/warpTerms.ts";
import type { AnchorHandle, DrawHandle } from "../src/scene/world/types.ts";

const TEMPLATE = `
<h1>A route across a warp against the float64 route</h1>
<p>
  Three quads anchored in ITRF, placed in a frame whose edge to ITRF
  multiplies height by 10 (with a scale, one float). Their
  vertices, measured from the image, against where the route
  (<code>routeForward</code>) and the view's projection put them: within
  half a pixel plus the fit's own error.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 512;
const HEIGHT = 512;
/** The warp's sphere, m: the ellipsoid's equatorial radius. */
const SPHERE = 6_378_137;
/** The exaggeration at scale 1. */
const K = 10;
/** The camera's height above the sphere in render space, m, over the quads' middle. */
const EYE_HEIGHT = 36;
/** The camera's turn about its axis, radians (7°). */
const TURN = (7 * Math.PI) / 180;
/** Half a pixel. */
const LIMIT = 0.5;
/** The least the warp must move a vertex at scale 1, px. */
const MOVED = 5;

/** Each quad: its east offset from the pole and its height above the sphere, m. */
const QUADS = [
  { x: -8, h: 0.6 },
  { x: 0, h: 0.8 },
  { x: 8, h: 1.0 },
] as const;
/** The corners in model coordinates, counterclockwise, off z = 0 so the heights differ. */
const CORNERS = [
  [-3, -3, 0.15],
  [3, -3, -0.2],
  [3, 3, 0.25],
  [-3, 3, -0.1],
] as const;

const quad: MeshData = {
  positions: Float32Array.from(CORNERS.flat()),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
};

interface Check {
  id: number;
  name: string;
  /** Each measured value, by what it measures. */
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface WarpRouteResult {
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

/** Where quad `q` sits in ITRF: at the pole, `x` east and `h` above the sphere. */
const origin = (q: (typeof QUADS)[number]): [number, number, number] => [
  q.x,
  0,
  SPHERE + q.h,
];

async function runWarpRoute(): Promise<WarpRouteResult> {
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
  let coverageMode = "";
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
    // The warp, as an application defines it: a frame under ITRF, with a
    // scale the page moves. The Earth's anchor is placed in it; the quads say nothing.
    const catalog = createFrameCatalog();
    const itrf = catalog.get("ITRF");
    const scale = world.createPlacementParameter(0);
    const exaggerated = smoothFrame("exaggerated", itrf, {
      revision: 1,
      description: `height × ${K}`,
      scale,
      forward: (p, out, jacobian) => exaggerate(K, p, out, jacobian),
    });
    catalog.add(exaggerated);
    const resolver = createFramesResolver(catalog);
    engine.cameras.setResolver(world, resolver);
    const earth = world.bodyAnchor(EARTH);
    resolver.bindAnchor(earth, exaggerated);
    engine.cameras.setRig(view, {
      position: { frame: itrf },
      orientation: { kind: "free" },
    });
    // Above the quads, in render space, looking down; turned 7° about its
    // axis so no edge lies along a pixel row.
    view.camera.position.set([0, 0, SPHERE + EYE_HEIGHT]);
    view.camera.orient(Float64Array.of(Math.sin(TURN), Math.cos(TURN), 0));
    view.camera.version++;
    const mesh = world.addMesh(quad);
    const draws: DrawHandle[] = QUADS.map((q) =>
      world.addDraw({
        mesh,
        parent: earth,
        origin: Float64Array.from(origin(q)),
        color: [1, 1, 1, 1],
        unlit: true,
        doubleSided: true,
      }),
    );
    // Fits run by the cache: three, one per draw, however the scale moves.
    let fits = 0;
    const cache = world.warps.cache;
    const run = cache.run.bind(cache);
    cache.run = (budget, now) => {
      const n = run(budget, now);
      fits += n;
      return n;
    };

    const cases: Array<[string, number]> = [
      ["scale 0: the warp at no strength (the measurement itself)", 0],
      [`scale 1: height × ${K}`, 1],
      [`scale 0.4: height × ${1 + 0.4 * (K - 1)}, one float written`, 0.4],
    ];
    let unwarped: Array<Array<[number, number]>> | undefined;
    let id = 1;
    for (const [name, s] of cases) {
      scale.value = s;
      engine.renderFrame();
      lost();
      const pixels = await target.read();
      lost();
      const route = project(view, earth);
      const expected = route.pixels;
      unwarped ??= expected;
      const measured: Record<string, number> = {};
      let worstOver = -Infinity;
      let least = Infinity;
      const fitPx = fitError(view, world, draws, route.nearest);
      for (let qi = 0; qi < QUADS.length; qi++) {
        const { corners, mode } = measureCorners(pixels, expected[qi]!);
        coverageMode = mode;
        for (let i = 0; i < corners.length; i++) {
          const c = corners[i]!;
          const e = Math.hypot(
            c[0] - expected[qi]![i]![0],
            c[1] - expected[qi]![i]![1],
          );
          measured[`quad ${qi} vertex ${i}: GPU − route, px`] = e;
          worstOver = Math.max(worstOver, e - fitPx[qi]!);
          least = Math.min(
            least,
            Math.hypot(
              expected[qi]![i]![0] - unwarped[qi]![i]![0],
              expected[qi]![i]![1] - unwarped[qi]![i]![1],
            ),
          );
        }
      }
      measured["the fit's error bound, px (largest)"] = Math.max(...fitPx);
      measured["least move by the warp, px"] = least;
      show(name, pixels, expected.flat());
      checks.push({
        id: id++,
        name,
        measured,
        limit:
          s === 0
            ? `each vertex within ${LIMIT} px of the route`
            : s === 1
              ? `each vertex within ${LIMIT} px plus the fit's error of the route; moved more than ${MOVED} px`
              : `each vertex within ${LIMIT} px plus the fit's error of the route`,
        pass: worstOver <= LIMIT && (s !== 1 || least > MOVED),
      });
    }
    const fitted = draws.filter(
      (d) => world.warps.status(d)?.state === "fitted",
    ).length;
    checks.push({
      id: id++,
      name: "the scale is a weight: three captures, three fits",
      measured: {
        "fits run, in all": fits,
        "draws drawn at a current fit": fitted,
      },
      limit: `one fit per draw (${draws.length}), however the scale moves; every draw fitted`,
      pass: fits === draws.length && fitted === draws.length,
    });
  } finally {
    $("adapter").textContent = `Adapter: ${describe(engine)}`;
    stop(engine);
    render(checks);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
    if (failed.length) {
      // The benchmark runner (bench/run.mjs) fails a suite on console errors.
      console.error(
        `[warpRoute] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    coverage: coverageMode,
    checks,
    pass: checks.length === 4 && checks.every((c) => c.pass),
  };
}

/**
 * Each quad's corners on screen as the route puts them (`routeForward`, then
 * the projection), px, and how near the camera the nearest of them is, m.
 */
function project(
  view: View,
  earth: AnchorHandle,
): { pixels: Array<Array<[number, number]>>; nearest: number[] } {
  const route = view.anchorRoute(earth);
  if (!route) {
    throw new Error(
      "the Earth's anchor has no route: it is not placed in a smooth frame",
    );
  }
  const eye = view.camera.position;
  const nearest: number[] = [];
  const pixels = QUADS.map((q) => {
    let near = Infinity;
    const corners = CORNERS.map((corner) => {
      const o = origin(q);
      const drawn = routeForward(route, [
        o[0] + corner[0],
        o[1] + corner[1],
        o[2] + corner[2],
      ]);
      near = Math.min(
        near,
        Math.hypot(
          drawn[0]! - eye[0]!,
          drawn[1]! - eye[1]!,
          drawn[2]! - eye[2]!,
        ),
      );
      const p = view.toPixel(drawn, view.world.root);
      if (!p) {
        throw new Error("a corner is behind the camera");
      }
      return [p[0]!, p[1]!] as [number, number];
    });
    nearest.push(near);
    return corners;
  });
  return { pixels, nearest };
}

/**
 * Each draw's fit error in pixels: its lattice's bound times the weight (the
 * scale), over the distance of its nearest corner to the camera, times the
 * focal length: the most the fit can move a vertex on screen.
 */
function fitError(
  view: View,
  world: World,
  draws: readonly DrawHandle[],
  nearest: readonly number[],
): number[] {
  const focal = HEIGHT / 2 / Math.tan(view.camera.fovy(WIDTH / HEIGHT) / 2);
  return draws.map((draw, qi) => {
    const last = world.scene.drawPlacements[draw.index]?.terms.at(-1);
    if (!last || last.term.kind !== "cubic") {
      return 0;
    }
    const lattice: CubicLattice = last.term;
    return (
      (lattice.errorBound * Math.abs(weightOf(last.weight)) * focal) /
      Math.max(nearest[qi]!, 1)
    );
  });
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
    return { run: runWarpRoute, dispose: () => stop(active) };
  },
};
