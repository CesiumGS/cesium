// Per-pixel trimming of b-rep faces on the GPU (plan Â§13.33, "Step 5
// redirected", part 2): every face is a patch draw, and a face whose trim is
// not its rect tests the pixel against its loops' pcurves (src/brep/gpuTrims.ts,
// shaders/coverage.slang) in the fragment stage, which discards outside it
// (kept within half a pixel, so seams between faces close). Shown as a flat
// colour, read back:
//   a. a plate with circular, rectangular and triangular holes, a cylinder
//      drilled across, and a B-spline face with a curved outer edge and a
//      hole, each at two distances: every pixel inside the face's projected
//      region is drawn where the CPU's classification (`faceTrim`) says the
//      whole pixel is inside, and not drawn where it says the pixel and its
//      3 Ã— 3 neighbourhood are outside: they differ only within 1 px of a
//      boundary;
//   b. closed solids, a box minus a cylinder built here, the same from Open
//      CASCADE and the NIST CTC-05 part (STEP, from the dev server's
//      /step-samples), at three distances, each from a slanted view: no
//      background pixels enclosed by the silhouette (pinholes along face
//      seams), against the same count for the CPU tessellator's mesh, which
//      shows the see-through gaps the shape has;
//   c. shadows, ambient occlusion (the depth and normal prepass) and picks on
//      a trimmed face: no GPU errors, a pick through a hole finds the face
//      behind it, a pick on the material the face;
//   c2. translucent faces (alpha 0.4, in "exact" and "moments"): an untrimmed
//      and a trimmed face blend as alpha * face + (1 - alpha) * background,
//      and a hole in the trimmed one shows the background alone;
//   d. the CPU time to prepare spans and trims, the GPU passes, and the same
//      for `tessellateBrep` at a comparable error, for CTC-05's 208 faces
//      (200 drilled plates without it); and the GPU against the old split
//      (`cpuFaces: "trimmed"`, trimmed faces from a CPU mesh).
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  BrepBuilder,
  buildFaceTrim,
  evaluateSpan,
  faceTrim,
  prepareGpuPatches,
  tessellateBrep,
  type BrepForm,
  type GpuPatches,
  type NurbsCurve,
  type NurbsSurface,
} from "../src/brep/index.ts";
import { OcctKernel } from "../src/brep/occt.ts";
import {
  CustomShader,
  Engine,
  MaterialFlags,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type View,
  type World,
} from "../src/index.ts";
import type { BrepHandle } from "../src/scene/world/brep.ts";

const TEMPLATE = `
<h1>B-rep faces trimmed per pixel on the GPU</h1>
<p>
  Every face is diced on the GPU; faces with a trim test the pixel against
  their pcurves, banded as Slug does for glyphs. A plate with holes, a drilled
  cylinder and a B-spline face with curved trims against the CPU's
  classification; closed solids for pinholes along the seams; shadows, ambient
  occlusion and picks; then the times against the CPU tessellator.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<table data-id="performance"></table>`;

const WIDTH = 256;
const HEIGHT = 256;
/** Where the form's coordinates are, m (render space): a draw 6,378 km from the table's origin. */
const ORIGIN: [number, number, number] = [6_378_137, 0, 0];
const ORIGIN_VECTOR = Float64Array.from(ORIGIN);
/** The camera's distance from the face's center along z, m: far, then near. */
const DISTANCES = [20, 5.5] as const;
/** The tessellator's error and the GPU's, pixels. */
const TARGET = 0.5;
const TAU = 2 * Math.PI;

type Vec3 = readonly [number, number, number];
type Pair = readonly [number, number];

/** A flat colour for the mask; the feature for a pick's check. */
const FRAGMENT = `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor = vec3f(1.0, 1.0, 0.5);
  (*material).alpha = 1.0;
  (*material).unlit = true;
}`;

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface BrepTrimsResult {
  adapter: string;
  checks: Check[];
  performance: Record<string, Record<string, number | string>>;
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `work`, or an error naming the stage if it doesn't settle in `seconds`:
 * a readback, a frame or a load that never answers (a hung device, a
 * throttled tab) fails here with where, not silently.
 */
async function within<T>(
  stage: string,
  seconds: number,
  work: PromiseLike<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `${stage}: no answer in ${seconds} s (a readback or a frame that never finished: the device may have hung, or the tab is in the background)`,
        ),
      );
    }, seconds * 1000);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** The stage the run is in, for the status line and the console (what a failure or a stall is named by). */
let stage = "";
let stageStart = 0;
function progress(name: string): void {
  const now = globalThis.performance.now();
  if (stage) {
    console.info(
      `[brepTrims] ${stage} took ${((now - stageStart) / 1000).toFixed(1)} s`,
    );
  }
  stage = name;
  stageStart = now;
  const status = root.querySelector(".status");
  if (status) {
    status.textContent = `running: ${name}…`;
  }
  console.info(`[brepTrims] ${name}`);
}

// The forms. Pcurves are written in (u, v) as the form wants them: outer
// loops counter-clockwise, inner ones clockwise.

type Use = Parameters<BrepBuilder["face"]>[1][number][number];

/** The uses of a polygon of straight lines in (u, v). */
function polygon(edge: number, corners: readonly Pair[]): Use[] {
  return corners.map((a, i) => ({
    edge,
    pcurve: [a, corners[(i + 1) % corners.length]!] as const,
  }));
}

/** A rational quadratic circle in (u, v). */
function circle(
  cx: number,
  cy: number,
  r: number,
  clockwise: boolean,
): NurbsCurve {
  const s = Math.SQRT1_2;
  const ring = [
    [1, 0, 1],
    [1, 1, s],
    [0, 1, 1],
    [-1, 1, s],
    [-1, 0, 1],
    [-1, -1, s],
    [0, -1, 1],
    [1, -1, s],
    [1, 0, 1],
  ];
  const points = new Float64Array(18);
  ring.forEach(([x, y], i) => {
    points.set([cx + r * x!, cy + (clockwise ? -1 : 1) * r * y!], i * 2);
  });
  return {
    degree: 2,
    knots: Float64Array.from([
      0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1,
    ]),
    count: 9,
    dimension: 2,
    points,
    weights: Float64Array.from(ring.map((p) => p[2]!)),
  };
}

/** A curve through f(0..1) as `pieces` cubic BÃ©ziers from Hermite ends. */
function cubic(f: (t: number) => Pair, pieces: number): NurbsCurve {
  const d = (t: number): Pair => {
    const h = 1e-6;
    const a = f(t + h);
    const b = f(t - h);
    return [(a[0] - b[0]) / (2 * h), (a[1] - b[1]) / (2 * h)];
  };
  const points: number[] = [];
  for (let k = 0; k < pieces; k++) {
    const t0 = k / pieces;
    const t1 = (k + 1) / pieces;
    const p0 = f(t0);
    const p3 = f(t1);
    const d0 = d(t0);
    const d1 = d(t1);
    const w = 1 / pieces / 3;
    if (k === 0) {
      points.push(p0[0], p0[1]);
    }
    points.push(
      p0[0] + d0[0] * w,
      p0[1] + d0[1] * w,
      p3[0] - d1[0] * w,
      p3[1] - d1[1] * w,
      p3[0],
      p3[1],
    );
  }
  const knots = [0, 0, 0, 0];
  for (let k = 1; k < pieces; k++) {
    knots.push(k, k, k);
  }
  knots.push(pieces, pieces, pieces, pieces);
  return {
    degree: 3,
    knots: Float64Array.from(knots),
    count: pieces * 3 + 1,
    dimension: 2,
    points: Float64Array.from(points),
  };
}

/** One edge every use refers to (the forms are for drawing, not validating). */
function oneEdge(b: BrepBuilder): number {
  const v = b.vertex([0, 0, 0]);
  return b.edge(v, v, { tolerance: 1e-5 });
}

interface Scene {
  name: string;
  form: BrepForm;
  /** What the camera looks at, form space. */
  target: Vec3;
}

/** A 3.2 Ã— 2.4 m plate with a round, a rectangular and a triangular hole, in the xy plane. */
function plateScene(): Scene {
  const b = new BrepBuilder();
  const e = oneEdge(b);
  const s = b.plane([-1.6, -1.2, 0], [1, 0, 0], [0, 1, 0]);
  b.face(s, [
    polygon(e, [
      [0, 0],
      [3.2, 0],
      [3.2, 2.4],
      [0, 2.4],
    ]),
    [{ edge: e, pcurve: circle(1, 1.2, 0.55, true) }],
    polygon(e, [
      [1.9, 0.5],
      [1.9, 1.7],
      [2.8, 1.7],
      [2.8, 0.5],
    ]),
    polygon(e, [
      [0.4, 1.85],
      [0.7, 2.25],
      [1.0, 1.85],
    ]),
  ]);
  return {
    name: "plate with round, rectangular, triangular holes",
    form: b.build(),
    target: [0, 0, 0],
  };
}

const CYLINDER_R = 1;
const CYLINDER_H = 3;
const DRILL_R = 0.4;

/**
 * A cylinder (axis +y, u = 0 at +x, Ï€ / 2 at âˆ’z) drilled by a 0.4 m cylinder
 * along z at mid height: a hole at the front (u = 3Ï€ / 2) and one at the
 * back, whose curves are saddle-shaped in (u, v); the seam is at the right edge.
 */
function drilledScene(): Scene {
  const b = new BrepBuilder();
  const e = oneEdge(b);
  const s = b.cylinder([0, 0, 0], [1, 0, 0], [0, 0, -1], CYLINDER_R);
  const front = (t: number): Pair => {
    const phi = TAU * t;
    return [
      TAU - Math.acos((DRILL_R * Math.cos(phi)) / CYLINDER_R),
      CYLINDER_H / 2 + DRILL_R * Math.sin(phi),
    ];
  };
  const back = (t: number): Pair => {
    const [u, v] = front(t);
    return [TAU - u, v];
  };
  const clockwise = (f: (t: number) => Pair, pieces: number): NurbsCurve => {
    let twice = 0;
    for (let k = 0; k < 200; k++) {
      const p = f(k / 200);
      const q = f((k + 1) / 200);
      twice += p[0] * q[1] - q[0] * p[1];
    }
    return twice > 0 ? cubic((t) => f(1 - t), pieces) : cubic(f, pieces);
  };
  b.face(s, [
    polygon(e, [
      [0, 0],
      [TAU, 0],
      [TAU, CYLINDER_H],
      [0, CYLINDER_H],
    ]),
    [{ edge: e, pcurve: clockwise(front, 3) }],
    [{ edge: e, pcurve: clockwise(back, 5) }],
  ]);
  return {
    name: "cylinder drilled across (saddle-shaped holes)",
    form: b.build(),
    target: [0, CYLINDER_H / 2, CYLINDER_R],
  };
}

/** A weighted bicubic NURBS surface over [âˆ’1.5, 1.5]Â², a hill and a hollow, one weight 2 and one 0.6. */
function patchSurface(): NurbsSurface {
  const n = 6;
  const clamped = [0, 0, 0, 0, 1 / 3, 2 / 3, 1, 1, 1, 1];
  const points = new Float64Array(n * n * 3);
  const weights = new Float64Array(n * n).fill(1);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -1.5 + (3 * i) / (n - 1);
      const y = -1.5 + (3 * j) / (n - 1);
      points.set(
        [x, y, 0.55 * Math.cos(1.3 * x) * Math.sin(1.1 * y + 0.4)],
        (j * n + i) * 3,
      );
    }
  }
  weights[3 * n + 2] = 2;
  weights[1 * n + 4] = 0.6;
  return {
    degreeU: 3,
    degreeV: 3,
    knotsU: Float64Array.from(clamped),
    knotsV: Float64Array.from(clamped),
    countU: n,
    countV: n,
    points,
    weights,
  };
}

/** The weighted patch with a curved top edge (a cubic dip) and a hole bounded by an off-axis ellipse. */
function splineScene(): Scene {
  const b = new BrepBuilder();
  const e = oneEdge(b);
  const s = b.nurbsSurface(patchSurface());
  const top = cubic((t) => [1 - t, 0.86 - 0.3 * Math.sin(Math.PI * t)], 2);
  const ellipse = (t: number): Pair => {
    const a = -TAU * t;
    const x = 0.28 * Math.cos(a);
    const y = 0.16 * Math.sin(a);
    const c = Math.cos(0.5);
    const sn = Math.sin(0.5);
    return [0.5 + c * x - sn * y, 0.45 + sn * x + c * y];
  };
  b.face(s, [
    [
      {
        edge: e,
        pcurve: [
          [0, 0],
          [1, 0],
        ] as const,
      },
      {
        edge: e,
        pcurve: [
          [1, 0],
          [1, 0.86],
        ] as const,
      },
      { edge: e, pcurve: top },
      {
        edge: e,
        pcurve: [
          [0, 0.86],
          [0, 0],
        ] as const,
      },
    ],
    [{ edge: e, pcurve: cubic(ellipse, 4) }],
  ]);
  return {
    name: "B-spline face, curved edge and hole",
    form: b.build(),
    target: [0, 0, 0.2],
  };
}

/** A 2 m box with a 0.6 m hole through it along z, closed: planes, two with a round hole, and the hole's wall. */
function drilledBox(): BrepForm {
  const b = new BrepBuilder();
  const e = oneEdge(b);
  const rect = polygon(e, [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
  ]);
  const hole = (): Use[] => [{ edge: e, pcurve: circle(1, 1, 0.6, true) }];
  b.face(b.plane([-1, -1, 1], [1, 0, 0], [0, 1, 0]), [rect, hole()]);
  b.face(b.plane([-1, -1, -1], [0, 1, 0], [1, 0, 0]), [rect, hole()]);
  b.face(b.plane([1, -1, -1], [0, 1, 0], [0, 0, 1]), [rect]);
  b.face(b.plane([-1, -1, -1], [0, 0, 1], [0, 1, 0]), [rect]);
  b.face(b.plane([-1, 1, -1], [0, 0, 1], [1, 0, 0]), [rect]);
  b.face(b.plane([-1, -1, -1], [1, 0, 0], [0, 0, 1]), [rect]);
  b.face(
    b.cylinder([0, 0, -1], [1, 0, 0], [0, 1, 0], 0.6),
    [
      polygon(e, [
        [0, 0],
        [TAU, 0],
        [TAU, 2],
        [0, 2],
      ]),
    ],
    { reversed: true },
  );
  return b.build();
}

/** A wall of drilled plates, for the timings when there is no STEP file. */
function plates(columns: number, rows: number): BrepForm {
  const b = new BrepBuilder();
  const e = oneEdge(b);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const x = (i - (columns - 1) / 2) * 1.2;
      const y = (j - (rows - 1) / 2) * 1.2;
      b.face(b.plane([x - 0.5, y - 0.5, 0], [1, 0, 0], [0, 1, 0]), [
        polygon(e, [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]),
        [
          {
            edge: e,
            pcurve: circle(0.5, 0.5, 0.2 + 0.1 * ((i + j) % 3), true),
          },
        ],
      ]);
    }
  }
  return b.build();
}

// The scene and what is read of it.

interface Environment {
  engine: Engine;
  world: World;
  view: View;
  target: OffscreenTarget;
  shader: CustomShader;
  lost: () => void;
}

/** The camera, m render space: `distance` in front of `target` (form space + the form's draw origin) along z. */
function placeCamera(view: View, target: Vec3, distance: number): void {
  view.camera.position.set([
    ORIGIN[0] + target[0],
    ORIGIN[1] + target[1],
    ORIGIN[2] + target[2] + distance,
  ]);
  view.camera.direction.set([0, 0, -1]);
  view.camera.orient(Float64Array.of(0, 1, 0));
  view.camera.version++;
}

/** The camera `distance` from `target` (form space) looking along `direction`. */
function lookFrom(
  view: View,
  target: Vec3,
  direction: Vec3,
  distance: number,
): void {
  const n = Math.hypot(...direction);
  const d = direction.map((x) => x / n) as unknown as Vec3;
  view.camera.position.set([
    ORIGIN[0] + target[0] - d[0] * distance,
    ORIGIN[1] + target[1] - d[1] * distance,
    ORIGIN[2] + target[2] - d[2] * distance,
  ]);
  view.camera.direction.set(d);
  view.camera.orient(Float64Array.of(0, 1, 0));
  view.camera.version++;
}

/** One frame drawn alone with the mask shader and read: the shader's pipelines compile in the background, and the default material's white shows until they have. */
async function capture(env: Environment): Promise<Uint8ClampedArray> {
  const give = Date.now() + 30_000;
  for (;;) {
    env.engine.renderFrame();
    env.lost();
    const pixels = await within(
      `${stage}: reading the frame`,
      30,
      env.target.read(),
    );
    env.lost();
    // The mask's blue is 188 after the flat colour's encoding, the default material's 255.
    let ready = false;
    for (let i = 0; i < WIDTH * HEIGHT && !ready; i++) {
      if (pixels[i * 4 + 1]! >= 250) {
        ready = pixels[i * 4 + 2]! < 250;
        break;
      }
    }
    if (ready) {
      return pixels;
    }
    if (Date.now() > give) {
      throw new Error(
        `${stage}: the mask shader's pipelines weren't ready, or nothing was drawn, after 30 s (the frame still shows the default material, or is empty)`,
      );
    }
    await sleep(50);
  }
}

/**
 * Pixels inside the silhouette (background reachable from the border
 * excepted), 2 px from its edge, that aren't fully covered: pinholes.
 */
function pinholes(mask: Uint8ClampedArray): { inside: number; holes: number } {
  const green = (i: number) => mask[i * 4 + 1]!;
  const outside = new Uint8Array(WIDTH * HEIGHT);
  const queue: number[] = [];
  const visit = (x: number, y: number) => {
    const i = y * WIDTH + x;
    if (!outside[i] && green(i) <= 8) {
      outside[i] = 1;
      queue.push(i);
    }
  };
  for (let x = 0; x < WIDTH; x++) {
    visit(x, 0);
    visit(x, HEIGHT - 1);
  }
  for (let y = 0; y < HEIGHT; y++) {
    visit(0, y);
    visit(WIDTH - 1, y);
  }
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % WIDTH;
    const y = (i / WIDTH) | 0;
    if (x > 0) {
      visit(x - 1, y);
    }
    if (x < WIDTH - 1) {
      visit(x + 1, y);
    }
    if (y > 0) {
      visit(x, y - 1);
    }
    if (y < HEIGHT - 1) {
      visit(x, y + 1);
    }
  }
  let inside = 0;
  let broken = 0;
  const R = 2;
  for (let y = R; y < HEIGHT - R; y++) {
    for (let x = R; x < WIDTH - R; x++) {
      let all = true;
      for (let dy = -R; dy <= R && all; dy++) {
        for (let dx = -R; dx <= R && all; dx++) {
          all = !outside[(y + dy) * WIDTH + x + dx];
        }
      }
      if (all) {
        inside++;
        if (green(y * WIDTH + x) < 250) {
          broken++;
        }
      }
    }
  }
  return { inside, holes: broken };
}

/** The scene's one view and world, with the mask shader. */
function environment(
  engine: Engine,
  shader: CustomShader,
  target: OffscreenTarget,
  lost: () => void,
  extra: {
    shadows?: boolean;
    ambientOcclusion?: boolean;
    vertexBytes?: number;
    indexBytes?: number;
    clearColor?: [number, number, number];
    translucencyMethod?: View["translucencyMethod"];
  } = {},
): Environment {
  const world = engine.createWorld({
    maxDraws: 16,
    vertexBytes: extra.vertexBytes ?? 1 << 24,
    indexBytes: extra.indexBytes ?? 1 << 22,
  });
  const view = engine.addView({
    target,
    world,
    background: "color",
    clearColor: [0, 0, 0],
    observer: { exposure: UNITLESS_EXPOSURE },
    ...extra,
  });
  return { engine, world, view, target, shader, lost };
}

function pixelsPerMetre(view: View, depth: number): number {
  const fovy = view.camera.fovy(WIDTH / HEIGHT);
  return HEIGHT / 2 / (Math.tan(fovy / 2) * depth);
}

/** The bytes of the pixel at `at` in a read frame. */
function pixelOf(pixels: Uint8ClampedArray, at: Pair): number[] {
  const i = (Math.round(at[1]) * WIDTH + Math.round(at[0])) * 4;
  return [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
}

/** An sRGB level (0 to 255) from a linear value. */
function encodeLevel(linear: number): number {
  return (
    255 *
    (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055)
  );
}

// a. the classification.

interface Projected {
  /** Samples of the face's rect per pixel, and those inside its trim. */
  total: Uint32Array;
  inside: Uint32Array;
  /** Samples inside the trim that face away: the far wall seen through a hole of a drawn-both-sides face. */
  behind: Uint32Array;
}

/**
 * The face's (u, v) rect sampled densely and projected to the pixels by the
 * camera on the z axis (`placeCamera`), the samples facing it, each
 * classified by the CPU (`faceTrim`).
 */
function project(
  form: BrepForm,
  patches: GpuPatches,
  eye: Vec3,
  fy: number,
): Projected {
  const total = new Uint32Array(WIDTH * HEIGHT);
  const inside = new Uint32Array(WIDTH * HEIGHT);
  const behind = new Uint32Array(WIDTH * HEIGHT);
  const trim = faceTrim(form, 0)!;
  const origin = patches.origin;
  const f = HEIGHT / 2 / Math.tan(fy / 2);
  for (const span of patches.spans) {
    const [u0, u1, v0, v1] = span.rect;
    const longest = Math.max(u1 - u0, v1 - v0);
    const nu = Math.max(2, Math.ceil((600 * (u1 - u0)) / longest));
    const nv = Math.max(2, Math.ceil((600 * (v1 - v0)) / longest));
    for (let j = 0; j < nv; j++) {
      const v = v0 + ((j + 0.5) / nv) * (v1 - v0);
      for (let i = 0; i < nu; i++) {
        const u = u0 + ((i + 0.5) / nu) * (u1 - u0);
        const { position, normal } = evaluateSpan(span, u, v);
        const x = origin[0]! + position[0]! - eye[0];
        const y = origin[1]! + position[1]! - eye[1];
        const z = origin[2]! + position[2]! - eye[2];
        // Facing the camera, which looks along −z.
        if (z >= 0) {
          continue;
        }
        if (normal[0]! * -x + normal[1]! * -y + normal[2]! * -z <= 0) {
          const bx = Math.floor(WIDTH / 2 + (f * x) / -z);
          const by = Math.floor(HEIGHT / 2 - (f * y) / -z);
          if (
            bx >= 0 &&
            by >= 0 &&
            bx < WIDTH &&
            by < HEIGHT &&
            trim.contains(u, v)
          ) {
            behind[by * WIDTH + bx]!++;
          }
          continue;
        }
        const px = Math.floor(WIDTH / 2 + (f * x) / -z);
        const py = Math.floor(HEIGHT / 2 - (f * y) / -z);
        if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) {
          continue;
        }
        total[py * WIDTH + px]!++;
        if (trim.contains(u, v)) {
          inside[py * WIDTH + px]!++;
        }
      }
    }
  }
  return { total, inside, behind };
}

/** Compares the pixels with the CPU's classification. */
function compare(
  mask: Uint8ClampedArray,
  p: Projected,
): Record<string, number> {
  const drawn = (i: number) => mask[i * 4 + 1]! >= 250;
  const clear = (i: number) => mask[i * 4 + 1]! <= 5;
  let insidePixels = 0;
  let missing = 0;
  let outsidePixels = 0;
  let spurious = 0;
  let boundary = 0;
  let nearest = 0;
  for (let y = 2; y < HEIGHT - 2; y++) {
    for (let x = 2; x < WIDTH - 2; x++) {
      const i = y * WIDTH + x;
      let all = true;
      // Any pixel around that has a sample inside the trim, or the far wall seen through the hole.
      let near = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const k = (y + dy) * WIDTH + x + dx;
          all &&= p.total[k]! > 0;
          near ||= p.inside[k]! > 0 || p.behind[k]! > 0;
        }
      }
      if (!all || p.total[i]! === 0) {
        continue;
      }
      if (p.inside[i] === p.total[i]) {
        insidePixels++;
        if (!drawn(i)) {
          missing++;
        }
      } else if (p.inside[i] === 0 && !near) {
        outsidePixels++;
        if (!clear(i)) {
          spurious++;
        }
      } else {
        boundary++;
        nearest += Number(drawn(i));
      }
    }
  }
  return {
    "pixels inside the trim": insidePixels,
    "of them not drawn": missing,
    "pixels outside, clear of a boundary": outsidePixels,
    "of them drawn": spurious,
    "pixels within 1 px of a boundary": boundary,
    "of them drawn (the dilation)": nearest,
  };
}

// b. closed solids.

interface Solid {
  name: string;
  form: BrepForm;
}

async function occtSolids(): Promise<{ solids: Solid[]; notes: string[] }> {
  const solids: Solid[] = [];
  const notes: string[] = [];
  let kernel: OcctKernel;
  progress("Open CASCADE: loading");
  try {
    kernel = await within("Open CASCADE: loading", 90, OcctKernel.load());
  } catch (error) {
    notes.push(
      `Open CASCADE isn't served (${error instanceof Error ? error.message : String(error)}): run npm run setup`,
    );
    return { solids, notes };
  }
  const box = kernel.box([-1, -1, -1], [2, 2, 2]);
  const bore = kernel.cylinder([0.2, 0.1, -2], 0.5, 4);
  const cut = kernel.boolean("difference", box, bore);
  solids.push({
    name: "box minus cylinder (Open CASCADE)",
    form: kernel.toForm(cut).form,
  });
  cut.delete();
  bore.delete();
  box.delete();
  try {
    progress("CTC-05: fetching and importing the STEP file");
    const response = await within(
      "fetching /step-samples/nist_ctc_05_asme1_rd.stp",
      60,
      fetch("/step-samples/nist_ctc_05_asme1_rd.stp"),
    );
    if (!response.ok) {
      throw new Error(`${response.status}`);
    }
    const imported = kernel.importStep(
      new Uint8Array(
        await within("reading the STEP file", 60, response.arrayBuffer()),
      ),
    );
    const forms = imported.map((s) => kernel.toForm(s).form);
    const biggest = forms.reduce((a, b) =>
      a.faceSurface.length >= b.faceSurface.length ? a : b,
    );
    solids.push({ name: "NIST CTC-05 (STEP)", form: biggest });
  } catch (error) {
    notes.push(
      `CTC-05 isn't served at /step-samples (${error instanceof Error ? error.message : String(error)}): skipped`,
    );
  }
  return { solids, notes };
}

// d. times.

const round = (x: number) => Number(x.toFixed(3));

/** Renders, then waits for the timers' readbacks (their smoothing runs on them). */
async function frames(env: Environment, count: number): Promise<void> {
  const { device } = env.engine.gpu;
  for (let k = 0; k < count; k++) {
    env.engine.renderFrame();
    // The GPU's own answer, not a timer (a background tab's timers crawl).
    await within(
      `${stage}: frame ${k + 1} of ${count}`,
      60,
      device.queue.onSubmittedWorkDone(),
    );
    env.lost();
  }
  for (let k = 0; k < 8; k++) {
    await sleep(100);
    env.engine.renderFrame();
  }
}

function passTimes(passes: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [label, name] of [
    ["cull", "GPU cull pass, ms"],
    ["dice", "GPU dice pass, ms"],
    ["opaque", "GPU opaque pass (its depth first), ms"],
  ] as const) {
    if (label in passes) {
      out[name] = Number(passes[label]!.toFixed(3));
    }
  }
  return out;
}

async function runBrepTrims(): Promise<BrepTrimsResult> {
  const status = root.querySelector(".status")!;
  $("results").replaceChildren();
  $("performance").replaceChildren();
  status.textContent = "checkingâ€¦";
  const engine = await Engine.create();
  active = engine;
  let lostReason: string | undefined;
  void engine.gpu.device.lost.then((info) => {
    lostReason = info.message || info.reason;
  });
  const gpuErrors: string[] = [];
  const onError = (event: Event) => {
    gpuErrors.push((event as GPUUncapturedErrorEvent).error.message);
  };
  engine.gpu.device.addEventListener("uncapturederror", onError);
  const lost = () => {
    if (lostReason !== undefined) {
      throw new Error(`the GPU device was lost (${lostReason}); stopped`);
    }
    if (active !== engine) {
      throw new Error("stopped");
    }
  };
  const checks: Check[] = [];
  const performance: BrepTrimsResult["performance"] = {};
  try {
    let id = 1;
    const shader = new CustomShader({
      label: "brep trims",
      fragment: FRAGMENT,
    });
    const target = new OffscreenTarget(WIDTH, HEIGHT);
    const addMasked = (env: Environment, form: BrepForm): BrepHandle =>
      env.world.addBrep(form, {
        origin: ORIGIN_VECTOR,
        shader: env.shader,
        errorPixels: TARGET,
        doubleSided: true,
      });

    // a. the classification, per pixel, against the CPU's.
    progress("a. classification");
    for (const scene of [plateScene(), drilledScene(), splineScene()]) {
      const env = environment(engine, shader, target, lost);
      const brep = addMasked(env, scene.form);
      const patches = prepareGpuPatches(scene.form);
      const face = patches.faces[0]!;
      const stats = face.trim;
      for (const distance of DISTANCES) {
        placeCamera(env.view, scene.target, distance);
        const mask = await capture(env);
        const eye: Vec3 = [
          ...scene.target.slice(0, 2),
          scene.target[2] + distance,
        ] as unknown as Vec3;
        const fy = env.view.camera.fovy(WIDTH / HEIGHT);
        const measured = compare(mask, project(scene.form, patches, eye, fy));
        const ppm = pixelsPerMetre(env.view, distance);
        checks.push({
          id: id++,
          name: `${scene.name}, ${distance} m`,
          measured: {
            ...measured,
            "trim pieces": stats?.pieces ?? 0,
            bands: stats?.bands ?? 0,
            "most pieces in a band": stats?.maxPerBand ?? 0,
            "pixels per metre": ppm,
            "faces drawn from a CPU mesh": brep.cpuFaces.length,
          },
          limit:
            "every pixel the CPU puts wholly inside is drawn, none is drawn that the CPU puts, with its neighbours, outside: they differ only within 1 px of a boundary",
          pass:
            brep.cpuFaces.length === 0 &&
            measured["pixels inside the trim"]! > 500 &&
            measured["pixels outside, clear of a boundary"]! > 10 &&
            measured["of them not drawn"] === 0 &&
            measured["of them drawn"] === 0,
        });
      }
      engine.removeView(env.view);
      env.world.removeBrep(brep);
      env.world.destroy();
    }

    // b. closed solids: pinholes along the seams.
    progress("b. closed solids: building and loading");
    const built: Solid[] = [
      { name: "box minus cylinder (built here)", form: drilledBox() },
    ];
    const kernel = await occtSolids();
    const solids = [...built, ...kernel.solids];
    for (const solid of solids) {
      progress(`b. closed solid: ${solid.name}`);
      const patches = prepareGpuPatches(solid.form);
      const [cx, cy, cz, radius] = patches.sphere;
      const center: Vec3 = [
        patches.origin[0]! + cx,
        patches.origin[1]! + cy,
        patches.origin[2]! + cz,
      ];
      const tolerance = radius / 1000;
      const mesh = tessellateBrep(solid.form, { tolerance });
      for (const factor of [1.1, 2.5, 4]) {
        // The CPU mesh at radius/1000 is the pinhole baseline; CTC-05's needs room.
        const env = environment(engine, shader, target, lost, {
          vertexBytes: 1 << 27,
          indexBytes: 1 << 26,
        });
        const gpu = addMasked(env, solid.form);
        const fovy = env.view.camera.fovy(WIDTH / HEIGHT);
        const distance = (radius / Math.sin(fovy / 2)) * factor;
        lookFrom(env.view, center, [-0.45, -0.35, -1], distance);
        const gpuMask = await capture(env);
        const withGpu = pinholes(gpuMask);
        env.world.removeBrep(gpu);
        const meshHandle = env.world.addDraw({
          mesh: env.world.addMesh({
            positions: mesh.faces.positions,
            normals: mesh.faces.normals,
            indices: mesh.faces.indices,
          }),
          origin: Float64Array.from(ORIGIN.map((o, k) => o + mesh.origin[k]!)),
          doubleSided: true,
          shader: env.shader,
        });
        void meshHandle;
        const cpuMask = await capture(env);
        const withMesh = pinholes(cpuMask);
        checks.push({
          id: id++,
          name: `${solid.name}, ${round(distance)} m (${solid.form.faceSurface.length} faces, ${gpu.trimmedFaces.length} trimmed)`,
          measured: {
            "pixels inside the silhouette": withGpu.inside,
            "pinholes, GPU faces": withGpu.holes,
            "pinholes, the CPU mesh (same view)": withMesh.holes,
            "faces the GPU can't draw (CPU mesh)": gpu.cpuFaces.length,
          },
          limit:
            "no more background pixels enclosed by the silhouette than the CPU mesh's view has (the shape's own gaps)",
          pass: withGpu.inside > 50 && withGpu.holes <= withMesh.holes,
        });
        engine.removeView(env.view);
        env.world.destroy();
      }
    }
    for (const note of kernel.notes) {
      checks.push({
        id: id++,
        name: "closed solids from Open CASCADE",
        measured: { skipped: 1 },
        limit: note,
        pass: true,
      });
    }

    // c. shadows, ambient occlusion and picks on a trimmed face.
    progress("c. shadows, ambient occlusion and picks");
    {
      const b = new BrepBuilder();
      const e = oneEdge(b);
      b.face(b.plane([-1.6, -1.2, 0], [1, 0, 0], [0, 1, 0]), [
        polygon(e, [
          [0, 0],
          [3.2, 0],
          [3.2, 2.4],
          [0, 2.4],
        ]),
        [{ edge: e, pcurve: circle(1.6, 1.2, 0.5, true) }],
      ]);
      b.face(b.plane([-3, -3, -1], [1, 0, 0], [0, 1, 0]), [
        polygon(e, [
          [0, 0],
          [6, 0],
          [6, 6],
          [0, 6],
        ]),
      ]);
      const form = b.build();
      const env = environment(engine, shader, target, lost, {
        shadows: true,
        ambientOcclusion: true,
      });
      const before = gpuErrors.length;
      const brep = env.world.addBrep(form, {
        origin: ORIGIN_VECTOR,
        doubleSided: true,
      });
      placeCamera(env.view, [0, 0, 0], 6);
      for (let k = 0; k < 4; k++) {
        env.engine.renderFrame();
        lost();
        await within("c. reading the frame", 30, target.read());
      }
      const firstTrimmed =
        env.world.scene.drawFeatureFirst[brep.trimmed!.index]!;
      const firstBehind =
        env.world.scene.drawFeatureFirst[brep.patches!.index]!;
      const ppm = pixelsPerMetre(env.view, 6);
      const atPixel = (u: number, v: number): Pair => [
        WIDTH / 2 + u * ppm,
        HEIGHT / 2 - v * ppm,
      ];
      const pick = async (at: Pair) => {
        const picked = env.view.pick(at[0], at[1]);
        for (let k = 0; k < 4; k++) {
          env.engine.renderFrame();
        }
        return Promise.race([picked, sleep(5000).then(() => undefined)]);
      };
      const throughHole = await pick(atPixel(0, 0));
      const onMaterial = await pick(atPixel(1.1, 0.6));
      checks.push({
        id: id++,
        name: "shadows, ambient occlusion and picks on a trimmed face",
        measured: {
          "GPU errors": gpuErrors.length - before,
          "pick through the hole: the face behind (1) or not (0)":
            throughHole?.featureId === firstBehind + 1 ? 1 : 0,
          "pick on the material: the plate (1) or not (0)":
            onMaterial?.featureId === firstTrimmed ? 1 : 0,
        },
        limit:
          "no GPU errors; a pick through a hole finds the face behind; on the material, the plate",
        pass:
          gpuErrors.length === before &&
          throughHole?.featureId === firstBehind + 1 &&
          onMaterial?.featureId === firstTrimmed,
      });
      engine.removeView(env.view);
      env.world.removeBrep(brep);
      env.world.destroy();
    }

    // c2. blended b-rep faces, in both translucency methods.
    progress("c2. translucent faces");
    {
      const alpha = 0.4;
      const square = new BrepBuilder();
      const squareEdge = oneEdge(square);
      square.face(square.plane([-3, -0.5, 0], [1, 0, 0], [0, 1, 0]), [
        polygon(squareEdge, [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]),
      ]);
      const forms = [plateScene().form, square.build()];
      for (const method of ["exact", "moments"] as const) {
        const env = environment(engine, shader, target, lost, {
          clearColor: [1, 0, 0],
          translucencyMethod: method,
        });
        placeCamera(env.view, [0, 0, 0], 6);
        const ppm = pixelsPerMetre(env.view, 6);
        const at = (u: number, v: number): Pair => [
          WIDTH / 2 + u * ppm,
          HEIGHT / 2 - v * ppm,
        ];
        // The trimmed plate's material, the untrimmed square, the plate's round and rectangular holes.
        const solid = [at(-1.2, -0.8), at(-2.5, 0)];
        const holes = [at(-0.6, 0), at(0.75, -0.1)];
        const frame = async (
          baseColor: [number, number, number, number],
          flags: number,
        ) => {
          const material = env.world.addMaterial({ baseColor, flags });
          const handles = forms.map((form) =>
            env.world.addBrep(form, {
              origin: ORIGIN_VECTOR,
              material,
              doubleSided: true,
            }),
          );
          const give = Date.now() + 30_000;
          let pixels: Uint8ClampedArray;
          for (;;) {
            env.engine.renderFrame();
            lost();
            pixels = await within("c2. reading the frame", 30, target.read());
            const first = pixelOf(pixels, solid[0]!);
            const clear = pixelOf(pixels, holes[0]!);
            // The pipelines compile in the background: until then the faces are missing.
            if (first.some((c, k) => c !== clear[k]) || Date.now() > give) {
              break;
            }
            await sleep(50);
          }
          // A few more, for the lists' and the moments' passes to settle.
          for (let k = 0; k < 3; k++) {
            env.engine.renderFrame();
            pixels = await within("c2. reading the frame", 30, target.read());
          }
          for (const handle of handles) {
            env.world.removeBrep(handle);
          }
          return pixels;
        };
        const opaque = await frame([0, 0, 1, 1], MaterialFlags.unlit);
        const blended = await frame(
          [0, 0, 1, alpha],
          MaterialFlags.unlit |
            MaterialFlags.alphaBlend |
            MaterialFlags.blendedOnly,
        );
        const background = pixelOf(opaque, holes[0]!);
        // The scene's red is the clear color's, 1 in light, which the exposure and the tone map show as 241.
        const face = [0, 0, 1];
        const red = [1, 0, 0];
        let worstSolid = 0;
        let worstHole = 0;
        let leastShown = 255;
        for (const point of solid) {
          const seen = pixelOf(blended, point);
          for (let k = 0; k < 3; k++) {
            const wanted = encodeLevel(
              alpha * face[k]! + (1 - alpha) * red[k]!,
            );
            worstSolid = Math.max(worstSolid, Math.abs(seen[k]! - wanted));
          }
          // Blue is the face's alone: its share is the alpha's, not the face's or the background's.
          leastShown = Math.min(leastShown, seen[2]!);
        }
        for (const point of holes) {
          const seen = pixelOf(blended, point);
          for (let k = 0; k < 3; k++) {
            worstHole = Math.max(
              worstHole,
              Math.abs(seen[k]! - background[k]!),
            );
          }
        }
        checks.push({
          id: id++,
          name: `translucent trimmed and untrimmed faces (alpha ${alpha}), "${method}"`,
          measured: {
            "worst level off alpha * face + (1 - alpha) * red, on the faces":
              worstSolid,
            "worst level off red, in the holes": worstHole,
            "blue on the faces (0 would be red alone)": leastShown,
            "red on the plate": pixelOf(blended, solid[0]!)[0]!,
            "red in a hole": background[0]!,
            "GPU errors": gpuErrors.length,
          },
          limit:
            "the faces blend as alpha * face + (1 - alpha) * background within 8 levels; a trimmed face's holes show the background alone (within 1 level); no GPU errors",
          pass:
            worstSolid <= 8 &&
            worstHole <= 1 &&
            leastShown > 40 &&
            gpuErrors.length === 0,
        });
        engine.removeView(env.view);
        env.world.destroy();
      }
    }

    // d. times.
    progress("d. times");
    {
      const ctc = kernel.solids.find((s) => s.name.startsWith("NIST"));
      const form = ctc?.form ?? plates(20, 10);
      const name = ctc ? "CTC-05" : "200 drilled plates";
      const view3 = (world: World, bigTarget: OffscreenTarget) => {
        const view = engine.addView({
          target: bigTarget,
          world,
          background: "color",
          clearColor: [0, 0, 0],
          observer: { exposure: UNITLESS_EXPOSURE },
        });
        return view;
      };
      const prepareStart = globalThis.performance.now();
      const prepared = prepareGpuPatches(form);
      const prepareMs = globalThis.performance.now() - prepareStart;
      // The same at the model's own tolerance (the edges', as before the display tolerance).
      const tightStart = globalThis.performance.now();
      const tight = prepareGpuPatches(form, { trimTolerance: 0 });
      const tightMs = globalThis.performance.now() - tightStart;
      const shape = (p: GpuPatches) => {
        let pieces = 0;
        let bands = 0;
        let mostPerBand = 0;
        let meanSum = 0;
        let trimmed = 0;
        let loosened = 0;
        for (const f of p.faces) {
          if (f.trim) {
            trimmed++;
            pieces += f.trim.pieces;
            bands += f.trim.bands;
            mostPerBand = Math.max(mostPerBand, f.trim.maxPerBand);
            meanSum += f.trim.meanPerBand;
            loosened += Number(f.trim.loosened > 0);
          }
        }
        return { pieces, bands, mostPerBand, meanSum, trimmed, loosened };
      };
      const { pieces, bands, mostPerBand, meanSum, trimmed, loosened } =
        shape(prepared);
      const before = shape(tight);
      const trimStart = globalThis.performance.now();
      for (const f of prepared.faces) {
        if (f.trim && f.rect) {
          buildFaceTrim(form, f.face, f.rect, f.trim.tolerance, () => false);
        }
      }
      const trimMs = globalThis.performance.now() - trimStart;
      const [cx, cy, cz, radius] = prepared.sphere;
      const center: Vec3 = [
        prepared.origin[0]! + cx,
        prepared.origin[1]! + cy,
        prepared.origin[2]! + cz,
      ];
      const big = new OffscreenTarget(768, 384);
      const measure = async (split: "unsupported" | "trimmed") => {
        const world = engine.createWorld({
          maxDraws: 8,
          vertexBytes: 1 << 25,
          indexBytes: 1 << 25,
        });
        const view = view3(world, big);
        const fovy = view.camera.fovy(768 / 384);
        const distance = (radius * 1.3) / Math.sin(fovy / 2);
        lookFrom(view, center, [-0.45, -0.35, -1], distance);
        const start = globalThis.performance.now();
        const brep = world.addBrep(form, {
          origin: ORIGIN_VECTOR,
          errorPixels: TARGET,
          maxChunks: 1 << 17,
          cpuFaces: split,
        });
        const addMs = globalThis.performance.now() - start;
        const env: Environment = {
          engine,
          world,
          view,
          target: big,
          shader,
          lost,
        };
        await frames(env, 90);
        const diced = await within(
          "d. reading the dice's counts",
          30,
          world.readPatchStats(),
        );
        const out = {
          addMs,
          gpuMs: engine.stats.gpuMs,
          cpuMs: engine.stats.cpuMs,
          passes: { ...engine.gpuPasses },
          cells: diced.reduce((n, d) => n + d.cells, 0),
          chunks: diced.reduce((n, d) => n + d.chunks, 0),
          vertices: diced.reduce((n, d) => n + d.vertices, 0),
          brep,
          distance,
          fovy,
        };
        engine.removeView(view);
        world.removeBrep(brep);
        world.destroy();
        return out;
      };
      const all = await measure("unsupported");
      const split = await measure("trimmed");
      // The tessellator at the error the pixels allow at the form's nearest depth.
      const perMetre =
        384 /
        2 /
        (Math.tan(all.fovy / 2) * Math.max(all.distance - radius, 1e-3));
      const tolerance = TARGET / perMetre;
      const tessellateStart = globalThis.performance.now();
      const tessellated = tessellateBrep(form, { tolerance });
      const mesh = {
        tolerance,
        ms: globalThis.performance.now() - tessellateStart,
        triangles: tessellated.faces.indices.length / 3,
        mesh: tessellated,
      };
      const meshWorld = engine.createWorld({
        maxDraws: 8,
        vertexBytes: 1 << 26,
        indexBytes: 1 << 26,
      });
      const meshView = view3(meshWorld, big);
      lookFrom(meshView, center, [-0.45, -0.35, -1], all.distance);
      meshWorld.addDraw({
        mesh: meshWorld.addMesh({
          positions: mesh.mesh.faces.positions,
          normals: mesh.mesh.faces.normals,
          indices: mesh.mesh.faces.indices,
        }),
        origin: Float64Array.from(
          ORIGIN.map((o, k) => o + mesh.mesh.origin[k]!),
        ),
        doubleSided: true,
      });
      await frames(
        { engine, world: meshWorld, view: meshView, target: big, shader, lost },
        90,
      );
      const meshGpuMs = engine.stats.gpuMs;
      const meshCpuMs = engine.stats.cpuMs;
      engine.removeView(meshView);
      meshWorld.destroy();

      const ms = (x: number) =>
        Number.isNaN(x) ? "n/a (no timestamp-query)" : round(x);
      performance[`${name}: GPU faces with per-pixel trims`] = {
        faces: form.faceSurface.length,
        "faces with a trim test": trimmed,
        "faces drawn from a CPU mesh": all.brep.cpuFaces.length,
        "trim pieces": pieces,
        "bands (all faces)": bands,
        "pieces in the busiest band": mostPerBand,
        "mean pieces per band (mean over faces)": round(
          trimmed ? meanSum / trimmed : 0,
        ),
        "faces refitted looser to bring a band under the cap": loosened,
        "before (model tolerance): trim pieces": before.pieces,
        "before: bands (all faces)": before.bands,
        "before: pieces in the busiest band": before.mostPerBand,
        "before: mean pieces per band (mean over faces)": round(
          before.trimmed ? before.meanSum / before.trimmed : 0,
        ),
        "CPU: prepare spans and trims, ms": round(prepareMs),
        "before (model tolerance): prepare spans and trims, ms": round(tightMs),
        "of which trims, ms": round(trimMs),
        "CPU: addBrep (prepare, pack, upload), ms": round(all.addMs),
        "CPU: frame (renderFrame), ms": round(all.cpuMs),
        "cells diced": all.cells,
        "chunks (4 × 4 cells)": all.chunks,
        "vertex invocations": all.vertices,
        "vertex invocations per cell": round(
          all.cells > 0 ? all.vertices / all.cells : 0,
        ),
        "GPU frame, ms": ms(all.gpuMs),
        ...passTimes(all.passes),
      };
      performance[`${name}: the old split (trimmed faces as a CPU mesh)`] = {
        "faces drawn from a CPU mesh": split.brep.cpuFaces.length,
        "CPU: addBrep (spans, tessellate, upload), ms": round(split.addMs),
        "CPU: frame (renderFrame), ms": round(split.cpuMs),
        "GPU frame, ms": ms(split.gpuMs),
        ...passTimes(split.passes),
      };
      performance[`${name}: tessellateBrep, the CPU tessellator`] = {
        "tolerance, mm": round(mesh.tolerance * 1000),
        triangles: mesh.triangles,
        "CPU: tessellate, ms": round(mesh.ms),
        "CPU: frame (renderFrame), ms": round(meshCpuMs),
        "GPU frame, ms": ms(meshGpuMs),
      };
      checks.push({
        id: id++,
        name: `${name}: drawn by the GPU, timed`,
        measured: {
          "faces on the GPU": all.brep.gpuFaces.length,
          "faces on a CPU mesh": all.brep.cpuFaces.length,
          "GPU errors": gpuErrors.length,
        },
        limit: "no GPU errors; see the performance tables for the times",
        pass: all.brep.gpuFaces.length > 0 && gpuErrors.length === 0,
      });

      // A trimmed face filling the view: where the trim test's cost shows,
      // at the display tolerance and at the model's.
      progress("d. a trimmed face filling the view");
      const fillScene = plateScene();
      const fill = new OffscreenTarget(3840, 2160);
      const fillMeasure = async (trimTolerance: number | undefined) => {
        const fillWorld = engine.createWorld({
          maxDraws: 8,
          vertexBytes: 1 << 24,
          indexBytes: 1 << 22,
        });
        const fillView = view3(fillWorld, fill);
        const fovy = fillView.camera.fovy(3840 / 2160);
        placeCamera(fillView, fillScene.target, 1.25 / Math.tan(fovy / 2));
        const handle = fillWorld.addBrep(fillScene.form, {
          origin: ORIGIN_VECTOR,
          shader,
          errorPixels: TARGET,
          doubleSided: true,
          ...(trimTolerance !== undefined ? { trimTolerance } : {}),
        });
        await frames(
          {
            engine,
            world: fillWorld,
            view: fillView,
            target: fill,
            shader,
            lost,
          },
          90,
        );
        const out = {
          gpuMs: engine.stats.gpuMs,
          cpuMs: engine.stats.cpuMs,
          passes: { ...engine.gpuPasses },
        };
        engine.removeView(fillView);
        fillWorld.removeBrep(handle);
        fillWorld.destroy();
        return out;
      };
      // The first runs warm the GPU up; the median of three alternating runs of each is reported.
      await fillMeasure(undefined);
      await fillMeasure(0);
      const runs: {
        shown: Awaited<ReturnType<typeof fillMeasure>>[];
        exact: Awaited<ReturnType<typeof fillMeasure>>[];
      } = { shown: [], exact: [] };
      for (let k = 0; k < 3; k++) {
        runs.shown.push(await fillMeasure(undefined));
        runs.exact.push(await fillMeasure(0));
      }
      const median = (all: typeof runs.shown) =>
        all
          .slice()
          .sort((a, b) => (a.passes.opaque ?? 0) - (b.passes.opaque ?? 0))[1]!;
      const shown = median(runs.shown);
      const exact = median(runs.exact);
      const trimOf = (options: { trimTolerance?: number }) =>
        prepareGpuPatches(fillScene.form, options).faces[0]!.trim!;
      const displayTrim = trimOf({});
      const modelTrim = trimOf({ trimTolerance: 0 });
      const fillRow = (m: typeof shown, t: typeof displayTrim) => ({
        "trim pieces": t.pieces,
        bands: t.bands,
        "pieces in the busiest band": t.maxPerBand,
        "CPU: frame (renderFrame), ms": round(m.cpuMs),
        "GPU frame, ms": ms(m.gpuMs),
        ...passTimes(m.passes),
      });
      performance[
        "a plate with three holes filling a 3840 × 2160 view: display tolerance"
      ] = fillRow(shown, displayTrim);
      performance["the same at the model's tolerance (before)"] = fillRow(
        exact,
        modelTrim,
      );
    }
  } catch (error) {
    // A stall or a failure names its stage in the results, not only the console.
    const message = error instanceof Error ? error.message : String(error);
    checks.push({
      id: checks.length + 1,
      name: `stopped in stage: ${stage}`,
      measured: {},
      limit: message,
      pass: false,
    });
    console.error(`[brepTrims] stopped in "${stage}": ${message}`);
  } finally {
    engine.gpu.device.removeEventListener("uncapturederror", onError);
    $("adapter").textContent = `Adapter: ${describe(engine)}`;
    stop(engine);
    render(checks);
    renderPerformance(performance);
    const failed = checks.filter((c) => !c.pass);
    status.textContent = failed.length
      ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
      : `pass: all ${checks.length} checks`;
    if (failed.length) {
      // The benchmark runner (bench/run.mjs) fails a suite on console errors.
      console.error(
        `[brepTrims] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
    if (gpuErrors.length) {
      console.error(
        `[brepTrims] GPU errors: ${gpuErrors.slice(0, 3).join(" | ")}`,
      );
    }
  }
  return {
    adapter: describe(engine),
    checks,
    performance,
    pass: checks.length > 0 && checks.every((c) => c.pass),
  };
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
}

function format(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString("en-US");
  }
  return value.toFixed(4);
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

function renderPerformance(performance: BrepTrimsResult["performance"]): void {
  const table = $("performance");
  table.replaceChildren();
  for (const [name, values] of Object.entries(performance)) {
    const head = document.createElement("tr");
    const th = document.createElement("th");
    th.colSpan = 2;
    th.textContent = name;
    head.append(th);
    table.append(head);
    for (const [key, value] of Object.entries(values)) {
      const tr = document.createElement("tr");
      const k = document.createElement("td");
      k.className = "text";
      k.textContent = key;
      const v = document.createElement("td");
      v.textContent = typeof value === "number" ? format(value) : value;
      tr.append(k, v);
      table.append(tr);
    }
  }
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runBrepTrims, dispose: () => stop(active) };
  },
};
