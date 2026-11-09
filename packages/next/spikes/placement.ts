// A draw's placement on the GPU against its float64 CPU twin (plan 5a,
// Task 19; the Node test is test/drawPlacement.test.ts). A quad 6,378 km from
// the transform table's origin is drawn with each placement kind, alone,
// unlit, into an offscreen target. Its four vertices are where
// shaders/placement.slang put them; the CPU twin (`placePosition`) and the
// view's projection (`View.toPixel`) say where they should be.
//
// The vertices are measured from the image: each edge of the quad is a
// straight line between two placed vertices on screen, whatever the
// placement does between them. Along each edge (away from its corners),
// a row or column of pixels across it gives the edge's position from its
// pixels' coverage (4× multisampling: five levels, 0 to 1); a line fitted
// through those positions, intersected with its neighbours', gives the
// vertices to a small fraction of a pixel. Each must land within half a
// pixel of the twin's. The unplaced quad is checked the same way (the
// measurement itself), and each placement must move its vertices by more
// than 5 px (the check isn't vacuous).
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  Engine,
  OffscreenTarget,
  PLACEMENT_TERMS,
  UNITLESS_EXPOSURE,
  placePosition,
  type FittedOperation,
  type MeshData,
  type Placement,
  type PlacementParameter,
  type View,
  type World,
} from "../src/index.ts";

const TEMPLATE = `
<h1>A draw's placement against its CPU twin</h1>
<p>
  A quad at the Earth's radius from the origin, drawn with each placement
  kind. Its vertices, measured from the image (its edges fitted from their
  pixels' coverage and intersected), against where the float64 CPU twin
  and the view's projection put them: within half a pixel.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 256;
const HEIGHT = 256;
/** The quad's origin, m (render space: the transform table's root). */
const ORIGIN: [number, number, number] = [6_378_137, 0, 0];
/** The camera, relative to the origin: 3.2 m in front, looking down −z. */
const EYE = [0.15, -0.1, 3.2];
/** The camera's turn about its axis, radians (7°). */
const TURN = (7 * Math.PI) / 180;
/** Half a pixel. */
const LIMIT = 0.5;
/** The least a placement must move a vertex, px. */
const MOVED = 5;
const PARTNER = "_PARTNER";

/**
 * The quad's corners in model coordinates, counterclockwise, off z = 0 so
 * the fitted operations' z terms count.
 */
const CORNERS = [
  [-1, -1, 0.15],
  [1, -1, -0.2],
  [1, 1, 0.25],
  [-1, 1, -0.1],
] as const;
/** Each corner's dual position. */
const PARTNERS = [
  [-1.2, -0.85, 0.3],
  [1.1, -1.25, -0.2],
  [1.3, 0.9, 0.25],
  [-0.8, 1.2, -0.3],
] as const;

const quad: MeshData = {
  positions: Float32Array.from(CORNERS.flat()),
  indices: Uint32Array.of(0, 1, 2, 0, 2, 3),
  attributes: {
    [PARTNER]: { data: Float32Array.from(PARTNERS.flat()), components: 3 },
  },
};

interface Check {
  id: number;
  name: string;
  /** Each measured value, by what it measures. */
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface PlacementResult {
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

/** A fitted operation over the quad (its radius about 1.44) with every order used. */
function fitted(scale: number, sign = 1): FittedOperation {
  const coefficients = new Float64Array(PLACEMENT_TERMS * 3);
  const set = (k: number, x: number, y: number, z: number) =>
    coefficients.set([sign * x, sign * y, sign * z], k * 3);
  set(0, 0.1, -0.05, 0); // 1
  set(1, 0.15, 0.05, 0); // u.x
  set(2, 0, 0.1, 0.2); // u.y
  set(4, 0, 0.08, 0); // u.x²
  set(5, 0.12, 0, 0.05); // u.x u.y
  set(10, 0.05, 0.05, 0); // u.x³
  set(14, 0.3, 0.3, 0.3); // u.x u.y u.z
  set(3, 0, 0.4, 0); // u.z
  set(9, 0.5, 0, 0); // u.z²
  set(16, -0.1, 0, 0.1); // u.y³
  set(13, 0, -0.06, 0); // u.x u.y²
  return {
    kind: "fitted",
    center: [0, 0, 0],
    scale,
    coefficients,
    errorBound: 0.01,
  };
}

async function runPlacement(): Promise<PlacementResult> {
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
      maxDraws: 4,
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
    view.camera.position.set(ORIGIN.map((o, i) => o + EYE[i]!));
    // Turned 7° about its axis, so no edge lies along a pixel row.
    view.camera.orient(Float64Array.of(Math.sin(TURN), Math.cos(TURN), 0));
    view.camera.version++;
    const draw = world.addDraw({
      mesh: world.addMesh(quad),
      origin: Float64Array.from(ORIGIN),
      color: [1, 1, 1, 1],
      unlit: true,
      doubleSided: true,
    });
    const t = (value: number): PlacementParameter =>
      world.createPlacementParameter(value);
    const dualT = t(1.5);
    const blendT = t(0.75);
    const twoT = t(-0.5);
    const maxDistance = Math.max(
      ...PARTNERS.map((p, i) =>
        Math.hypot(...p.map((v, k) => v - CORNERS[i]![k]!)),
      ),
    );
    const cases: Array<[string, Placement]> = [
      ["no placement (the measurement itself)", { kind: "affine" }],
      [
        "dual position, t = 1.5 (extrapolating)",
        { kind: "dual", semantic: PARTNER, t: dualT, maxDistance },
      ],
      ["fitted operation (orders 0 to 3)", fitted(1.5)],
      [
        "blend of the identity and a fitted operation, t = 0.75",
        { kind: "blend", from: "identity", to: fitted(1.5), t: blendT },
      ],
      [
        "blend of two fitted operations, t = −0.5",
        {
          kind: "blend",
          from: fitted(1.5),
          to: fitted(2, -1),
          t: twoT,
        },
      ],
    ];
    const unplaced = project(view, { kind: "affine" });
    let id = 1;
    for (const [name, placement] of cases) {
      world.setPlacement(draw, placement);
      engine.renderFrame();
      lost();
      const pixels = await target.read();
      lost();
      const expected = project(view, placement);
      const { corners, mode } = measureCorners(pixels, expected);
      coverageMode = mode;
      show(name, pixels, expected);
      const errors = corners.map((c, i) =>
        Math.hypot(c[0] - expected[i]![0], c[1] - expected[i]![1]),
      );
      const moved = expected.map((e, i) =>
        Math.hypot(e[0] - unplaced[i]![0], e[1] - unplaced[i]![1]),
      );
      const measured: Record<string, number> = {};
      errors.forEach((e, i) => (measured[`vertex ${i}: GPU − twin, px`] = e));
      measured["least move by the placement, px"] = Math.min(...moved);
      const placed = placement.kind !== "affine";
      checks.push({
        id: id++,
        name,
        measured,
        limit: placed
          ? `each vertex within ${LIMIT} px of the twin; moved more than ${MOVED} px`
          : `each vertex within ${LIMIT} px of the twin`,
        pass:
          errors.every((e) => e <= LIMIT) &&
          (!placed || Math.min(...moved) > MOVED),
      });
    }
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
        `[placement] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    coverage: coverageMode,
    checks,
    pass: checks.length === 5 && checks.every((c) => c.pass),
  };
}

/** The quad's corners on screen as the CPU twin places them, px. */
function project(view: View, placement: Placement): Array<[number, number]> {
  const out = new Float64Array(3);
  return CORNERS.map((corner, i) => {
    placePosition(placement, corner, PARTNERS[i], out);
    const p = view.toPixel(
      [ORIGIN[0] + out[0]!, ORIGIN[1] + out[1]!, ORIGIN[2] + out[2]!],
      view.world.root,
    );
    if (!p) {
      throw new Error("a corner is behind the camera");
    }
    return [p[0]!, p[1]!];
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
 * The quad's corners measured from the image: each edge's points from
 * coverage across it, a line fitted through them, and neighbouring lines
 * intersected. `expected` (the twin's corners) says roughly where the
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

/** Shows an image under a caption, the twin's corners marked. */
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
    return { run: runPlacement, dispose: () => stop(active) };
  },
};
