// B-rep patches diced on the GPU (plan §13.33, "Step 5 redirected", part 1):
// faces the rect completes (no trim test) drawn from span records and control
// points, the grid per view. An analytic cylinder face, a dome (a sphere's
// span) and a free-form weighted rational Bézier patch, and one of degree 5 × 4 (the wide
// evaluation path), each at two
// distances, drawn alone with a shader that writes what the fragment stage
// sees into the image as bytes (each value as two 8-bit levels, high and low,
// as exact sRGB levels, and a check byte: where two triangles share a pixel
// the multisampled resolve averages their bytes, and the check, the value
// modulo 251, tells those pixels, which are dropped), read back:
//   a. every interior pixel's drawn point is within the stated pixel error of
//      the true surface: a closed form for the analytic faces, the float64
//      CPU reference (`evaluateSpan`) at the pixel's own (u, v) for the
//      patch, over the pixels' depth (pixels per metre), against the
//      target (default half a pixel);
//   b. the cells grow as the camera approaches, and each span's counts, read
//      from the draw's chunk list, are the CPU twin's (`diceCounts`);
//   c. no pixel inside a face's silhouette (eroded by 2 px) is left
//      uncovered: no cracks between a face's spans;
//   d. under a warp (a fitted lattice) the drawn position at each pixel is
//      the placed true surface's, the CPU twin (`placeWithTerms`) within the
//      target, with the grid made finer for the warp's bends.
// And the feature a pick and the feature image read is the face, shadows,
// ambient occlusion and the depth passes raise no GPU error, and, for 200
// faces, the triangles and the GPU's time against `tessellateBrep` at the
// same error.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  BrepBuilder,
  diceCounts,
  evaluateSpan,
  prepareGpuPatches,
  tessellateBrep,
  type BrepForm,
  type GpuPatches,
  type GpuSpan,
  type NurbsSurface,
} from "../src/brep/index.ts";
import {
  CustomShader,
  Engine,
  OffscreenTarget,
  UNITLESS_EXPOSURE,
  type View,
  type World,
} from "../src/index.ts";
import { placeWithTerms } from "../src/scene/warpEvaluate.ts";
import { PATCH_CHUNK_CELLS } from "../src/render/layout.ts";
import { fitLattice } from "../src/scene/warpFit.ts";
import type { WarpTerms } from "../src/scene/warpTerms.ts";
import { setPlacement } from "../src/scene/world/placements.ts";
import type { DrawHandle } from "../src/scene/world/types.ts";
import type { BrepHandle } from "../src/scene/world/brep.ts";

const TEMPLATE = `
<h1>B-rep patches diced on the GPU</h1>
<p>
  Faces drawn from patch records, the grid chosen per view in pixels of error.
  An analytic cylinder, a dome, a weighted rational Bézier patch and one of
  degree 5 × 4 at two
  distances, read back as bytes the fragment stage writes: each pixel's drawn
  point against the true surface, the cells the dice chose against the CPU
  twin, cracks between spans, and a warped patch against its CPU twin. Then 200
  faces against the CPU tessellator.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>
<table data-id="performance"></table>
<div class="images" data-id="images"></div>`;

const WIDTH = 256;
const HEIGHT = 256;
/** Where the form's coordinates are, m (render space): a draw 6,378 km from the table's origin. */
const ORIGIN: [number, number, number] = [6_378_137, 0, 0];
const ORIGIN_VECTOR = Float64Array.from(ORIGIN);
/** The error a cell may leave, pixels. */
const TARGET = 0.5;
/** What a pixel's error may exceed the target by (the cell counts round up; reading is 16-bit). */
const SLACK = 0.03;
/** The camera's distance from the form's center along z, m: far, then near. */
const DISTANCES = [20, 5.5] as const;
/** Half the range the bytes hold: model space, camera-relative, (u, v) minus the corner. */
const RANGE_MC = 8;
const RANGE_EC = 16;
const RANGE_UV = 8;

type Vec3 = readonly [number, number, number];

const FRAGMENT = `fn level(b: f32) -> f32 {
  let c = b / 255.0;
  return select(c / 12.92, pow((c + 0.055) / 1.055, 2.4), c > 0.04045);
}

// Three values in [0, 1) as 16-bit integers k, one byte of each: the high bytes (part 0),
// the low ones (1) or k mod 251 (2), each the linear value whose sRGB level is the byte.
fn bytes(v: vec3f, part: i32) -> vec3f {
  let k = floor(clamp(v, vec3f(0.0), vec3f(0.99999)) * 65536.0);
  let hi = floor(k / 256.0);
  var b = hi;
  if (part == 1) {
    b = k - hi * 256.0;
  } else if (part == 2) {
    b = k - 251.0 * floor(k / 251.0);
  }
  return vec3f(level(b.x), level(b.y), level(b.z));
}

fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  let mode = i32(uniforms.mode + 0.5);
  var c = vec3f(1.0, 1.0, 0.5);
  if (mode >= 1 && mode <= 3) {
    c = bytes((fsInput.positionMC + vec3f(${RANGE_MC}.0)) / ${2 * RANGE_MC}.0, mode - 1);
  } else if (mode >= 4 && mode <= 6) {
    c = bytes((fsInput.positionEC + vec3f(${RANGE_EC}.0)) / ${2 * RANGE_EC}.0, mode - 4);
  } else if (mode >= 7 && mode <= 9) {
    c = bytes(vec3f(fsInput.texCoord0 / ${RANGE_UV}.0, 0.0), mode - 7);
  } else if (mode == 10) {
    let local = fsInput.featureId - u32(uniforms.first);
    c = vec3f(level(f32(local & 255u)), level(f32((local >> 8u) & 255u)), 0.0);
  }
  (*material).baseColor = c;
  (*material).alpha = 1.0;
  (*material).unlit = true;
}`;

const MODE = {
  mask: 0,
  modelHigh: 1,
  modelLow: 2,
  modelCheck: 3,
  cameraHigh: 4,
  cameraLow: 5,
  cameraCheck: 6,
  uvHigh: 7,
  uvLow: 8,
  uvCheck: 9,
  feature: 10,
} as const;

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface BrepPatchesResult {
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

// The forms.

/** A face over the (u, v) box with a rectangular loop: every edge a line (the form is for drawing, not validating). */
function rectFace(
  b: BrepBuilder,
  surface: number,
  box: readonly [number, number, number, number],
  at: Vec3,
): void {
  const [u0, u1, v0, v1] = box;
  const v = [0, 1, 2, 3].map(() => b.vertex([...at]));
  const e = [0, 1, 2, 3].map((i) => b.edge(v[i]!, v[(i + 1) % 4]!));
  const corners = [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ] as const;
  b.face(surface, [
    e.map((edge, i) => ({
      edge,
      pcurve: [corners[i]!, corners[(i + 1) % 4]!] as const,
    })),
  ]);
}

/** A weighted bicubic NURBS surface over [−1.5, 1.5]², a hill and a hollow, one weight 2 and one 0.6. */
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

/** A weighted NURBS surface of degree 5 in u and 4 in v over [−1.5, 1.5]², two patches each way: the hill and hollow with a ripple, weights 0.5 to 2.4. */
function highSurface(): NurbsSurface {
  const degreeU = 5;
  const degreeV = 4;
  const countU = degreeU + 2;
  const countV = degreeV + 2;
  const clamped = (degree: number) =>
    Float64Array.from([
      ...new Array<number>(degree + 1).fill(0),
      0.5,
      ...new Array<number>(degree + 1).fill(1),
    ]);
  const points = new Float64Array(countU * countV * 3);
  const weights = new Float64Array(countU * countV).fill(1);
  for (let j = 0; j < countV; j++) {
    for (let i = 0; i < countU; i++) {
      const x = -1.5 + (3 * i) / (countU - 1);
      const y = -1.5 + (3 * j) / (countV - 1);
      points.set(
        [
          x,
          y,
          0.55 * Math.cos(1.3 * x) * Math.sin(1.1 * y + 0.4) +
            0.12 * Math.sin(2.9 * i + 1.3 * j),
        ],
        (j * countU + i) * 3,
      );
    }
  }
  weights[3 * countU + 2] = 2.4;
  weights[1 * countU + 5] = 0.5;
  weights[4 * countU + 4] = 1.7;
  return {
    degreeU,
    degreeV,
    knotsU: clamped(degreeU),
    knotsV: clamped(degreeV),
    countU,
    countV,
    points,
    weights,
  };
}

interface Scene {
  name: string;
  form: BrepForm;
  /** The distance of a form-space point to the true surface, m; undefined for a free-form face, which is compared at its own (u, v). */
  distance: ((p: Vec3) => number) | undefined;
  /** What the camera looks at, form space. */
  target: Vec3;
}

const CYLINDER_R = 1.5;
const DOME_R = 1.5;

function scenes(): Scene[] {
  const cylinder = (() => {
    const b = new BrepBuilder();
    // The axis is +y, and u = 0 points at +z, toward the camera.
    const s = b.cylinder([0, 0, 0], [0, 0, 1], [1, 0, 0], CYLINDER_R);
    rectFace(b, s, [0, 2 * Math.PI, 0, 3], [0, 1.5, 0]);
    return b.build();
  })();
  const dome = (() => {
    const b = new BrepBuilder();
    const s = b.sphere([0, 0, 0], [1, 0, 0], [0, 1, 0], DOME_R);
    rectFace(b, s, [0, 2 * Math.PI, 0.15, Math.PI / 2], [0, 0, 1]);
    return b.build();
  })();
  const patch = (() => {
    const b = new BrepBuilder();
    rectFace(b, b.nurbsSurface(patchSurface()), [0, 1, 0, 1], [0, 0, 0]);
    return b.build();
  })();
  const high = (() => {
    const b = new BrepBuilder();
    rectFace(b, b.nurbsSurface(highSurface()), [0, 1, 0, 1], [0, 0, 0]);
    return b.build();
  })();
  return [
    {
      name: "cylinder face (analytic, 4 spans)",
      form: cylinder,
      distance: (p) => Math.abs(Math.hypot(p[0], p[2]) - CYLINDER_R),
      target: [0, 1.5, CYLINDER_R],
    },
    {
      name: "dome (a sphere's span, 4 spans)",
      form: dome,
      distance: (p) => Math.abs(Math.hypot(p[0], p[1], p[2]) - DOME_R),
      target: [0, 0, DOME_R],
    },
    {
      name: "weighted rational Bézier patch (9 spans)",
      form: patch,
      distance: undefined,
      target: [0, 0, 0.2],
    },
    {
      name: "weighted rational Bézier patch of degree 5 × 4 (4 spans)",
      form: high,
      distance: undefined,
      target: [0, 0, 0.2],
    },
  ];
}

/** A wall of `columns × rows` faces of four kinds, each its own surface. */
function wall(columns: number, rows: number): BrepForm {
  const b = new BrepBuilder();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const x = (i - (columns - 1) / 2) * 1.2;
      const y = (j - (rows - 1) / 2) * 1.2;
      const at: Vec3 = [x, y, 0];
      switch ((i + 2 * j) % 4) {
        case 0:
          rectFace(
            b,
            b.plane([x - 0.5, y - 0.5, 0], [1, 0, 0], [0, 1, 0]),
            [0, 1, 0, 1],
            at,
          );
          break;
        case 1:
          // A half cylinder bulging toward +z, its axis +y.
          rectFace(
            b,
            b.cylinder([x, y - 0.5, 0], [0, 0, 1], [1, 0, 0], 0.5),
            [-1.2, 1.2, 0, 1],
            at,
          );
          break;
        case 2:
          rectFace(
            b,
            b.sphere([x, y, -0.2], [1, 0, 0], [0, 1, 0], 0.55),
            [0, 2 * Math.PI, 0.3, 1.5],
            at,
          );
          break;
        default:
          rectFace(
            b,
            b.cone([x, y, 0], [1, 0, 0], [0, 1, 0], 0.5, 0.3),
            [0, 2 * Math.PI, 0, 0.8],
            at,
          );
      }
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

/** The camera, m render space: `distance` in front of `target` (form space + the form's draw origin). */
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

/** Pixels per metre at `depth` m along the view axis. */
function pixelsPerMetre(view: View, depth: number): number {
  const fovy = view.camera.fovy(WIDTH / HEIGHT);
  return HEIGHT / 2 / (Math.tan(fovy / 2) * depth);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Each image asked for (`MODE`), drawn alone: the shader's pipelines compile in the background, and white shows until they have. */
async function capture(
  env: Environment,
  modes: readonly number[],
): Promise<Map<number, Uint8ClampedArray>> {
  const out = new Map<number, Uint8ClampedArray>();
  const read = async (): Promise<Uint8ClampedArray> => {
    env.engine.renderFrame();
    env.lost();
    const pixels = await env.target.read();
    env.lost();
    return pixels;
  };
  for (const mode of modes) {
    env.shader.setUniform("mode", mode);
    const give = Date.now() + 30_000;
    for (;;) {
      const pixels = await read();
      // The mask's blue is 188, never the default material's 255.
      const center = (HEIGHT / 2) * WIDTH + WIDTH / 2;
      if (
        mode !== MODE.mask ||
        pixels[center * 4 + 2] !== 255 ||
        Date.now() > give
      ) {
        out.set(mode, pixels);
        break;
      }
      await sleep(50);
    }
  }
  return out;
}

/** The pixels whose 3 × 3 neighbourhood the mask covers entirely. */
function interior(mask: Uint8ClampedArray): number[] {
  const full = (x: number, y: number) => mask[(y * WIDTH + x) * 4 + 1]! >= 250;
  const out: number[] = [];
  for (let y = 1; y < HEIGHT - 1; y++) {
    for (let x = 1; x < WIDTH - 1; x++) {
      let all = true;
      for (let dy = -1; dy <= 1 && all; dy++) {
        for (let dx = -1; dx <= 1 && all; dx++) {
          all = full(x + dx, y + dy);
        }
      }
      if (all) {
        out.push(y * WIDTH + x);
      }
    }
  }
  return out;
}

/** Pixels inside the mask's silhouette (background reachable from the border excepted), 2 px from its edge, that aren't fully covered: cracks. */
function cracks(mask: Uint8ClampedArray): { inside: number; cracks: number } {
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
  return { inside, cracks: broken };
}

/**
 * A pixel's three values from its high, low and check images, in [0, 1);
 * false where the check says the levels are from two triangles' average.
 */
function fixed(
  images: Map<number, Uint8ClampedArray>,
  modes: readonly [number, number, number],
  pixel: number,
  out: Float64Array,
  count = 3,
): boolean {
  const [high, low, check] = modes.map((m) => images.get(m)!) as [
    Uint8ClampedArray,
    Uint8ClampedArray,
    Uint8ClampedArray,
  ];
  for (let k = 0; k < count; k++) {
    const value = high[pixel * 4 + k]! * 256 + low[pixel * 4 + k]!;
    if (value % 251 !== check[pixel * 4 + k]!) {
      return false;
    }
    out[k] = value / 65536;
  }
  return true;
}

/** What the images hold of the interior pixels. */
interface Pixels {
  index: number;
  face: number;
  /** Model space, relative to the draw's origin. */
  model: Float64Array;
  /** Camera-relative. */
  camera: Float64Array;
  /** (u, v) in the face's parameter space. */
  u: number;
  v: number;
}

/** The interior pixels each of whose values reads whole (not an average of two triangles'). */
function decode(
  images: Map<number, Uint8ClampedArray>,
  patches: GpuPatches,
  pixels: readonly number[],
): { read: Pixels[]; mixed: number } {
  const feature = images.get(MODE.feature)!;
  const tmp = new Float64Array(3);
  const out: Pixels[] = [];
  let mixed = 0;
  for (const index of pixels) {
    const face = feature[index * 4]! + feature[index * 4 + 1]! * 256;
    const info = patches.faces[face];
    if (!info?.rect) {
      continue;
    }
    if (
      !fixed(
        images,
        [MODE.modelHigh, MODE.modelLow, MODE.modelCheck],
        index,
        tmp,
      )
    ) {
      mixed++;
      continue;
    }
    const model = Float64Array.from(tmp, (x) => x * 2 * RANGE_MC - RANGE_MC);
    if (
      !fixed(
        images,
        [MODE.cameraHigh, MODE.cameraLow, MODE.cameraCheck],
        index,
        tmp,
      )
    ) {
      mixed++;
      continue;
    }
    const camera = Float64Array.from(tmp, (x) => x * 2 * RANGE_EC - RANGE_EC);
    if (
      !fixed(images, [MODE.uvHigh, MODE.uvLow, MODE.uvCheck], index, tmp, 2)
    ) {
      mixed++;
      continue;
    }
    out.push({
      index,
      face,
      model,
      camera,
      u: tmp[0]! * RANGE_UV + info.rect[0],
      v: tmp[1]! * RANGE_UV + info.rect[2],
    });
  }
  return { read: out, mixed };
}
/** The span of a face holding (u, v). */
function spanAt(
  patches: GpuPatches,
  face: number,
  u: number,
  v: number,
): GpuSpan | undefined {
  const f = patches.faces[face]!;
  const eps = 1e-6;
  return patches.spans
    .slice(f.first, f.first + f.count)
    .find(
      (s) =>
        u >= s.rect[0] - eps &&
        u <= s.rect[1] + eps &&
        v >= s.rect[2] - eps &&
        v <= s.rect[3] + eps,
    );
}

/** The cells each span of a patch draw has in the view's chunk list, from the GPU. */
async function readCells(
  env: Environment,
  draw: DrawHandle,
): Promise<Map<number, { nu: number; nv: number; chunks: number }>> {
  const { device } = env.engine.gpu;
  const raster = env.world.raster;
  const patch = raster.patchDraws.get(draw.index)!;
  const read = async (source: GPUBuffer, offset: number, size: number) => {
    const buffer = device.createBuffer({
      size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyBufferToBuffer(source, offset, buffer, 0, size);
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const data = new Uint32Array(buffer.getMappedRange().slice(0));
    buffer.unmap();
    buffer.destroy();
    return data;
  };
  // The draw's arguments: vertex count, then the chunks the dice listed.
  const args = await read(
    raster.drawArguments.buffer,
    raster.drawArguments.slotOf(draw.index),
    20,
  );
  const count = Math.min(args[1]!, patch.capacity);
  const spans = new Map<number, { nu: number; nv: number; chunks: number }>();
  if (count > 0) {
    const chunks = await read(patch.chunks, 0, count * 16);
    for (let c = 0; c < count; c++) {
      const span = chunks[c * 4 + 1]!;
      const packed = chunks[c * 4 + 2]!;
      const entry = spans.get(span) ?? {
        nu: (packed >>> 16) & 255,
        nv: (packed >>> 24) & 255,
        chunks: 0,
      };
      entry.chunks++;
      spans.set(span, entry);
    }
  }
  if (args[0] !== 6 * PATCH_CHUNK_CELLS * PATCH_CHUNK_CELLS) {
    throw new Error(
      `a patch draw's arguments hold ${args[0]} indices; expected ${6 * PATCH_CHUNK_CELLS * PATCH_CHUNK_CELLS}`,
    );
  }
  return spans;
}

interface Setup {
  scene: Scene;
  patches: GpuPatches;
  brep: BrepHandle;
  draw: DrawHandle;
}

function add(env: Environment, scene: Scene): Setup {
  const brep = env.world.addBrep(scene.form, {
    origin: ORIGIN_VECTOR,
    shader: env.shader,
    errorPixels: TARGET,
    doubleSided: true,
  });
  if (!brep.patches || brep.cpuFaces.length > 0) {
    throw new Error(
      `${scene.name}: not all of it is drawn by the GPU (${brep.unsupported.map((u) => u.reason).join(", ")})`,
    );
  }
  return {
    scene,
    patches: prepareGpuPatches(scene.form),
    brep,
    draw: brep.patches,
  };
}

/** The GPU passes this scene runs: the cull pass holds the dice (smoothed ms, by label; empty without timestamp queries). */
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

const sum = <T>(items: Iterable<T>, f: (item: T) => number) => {
  let total = 0;
  for (const item of items) {
    total += f(item);
  }
  return total;
};

async function runBrepPatches(): Promise<BrepPatchesResult> {
  const status = root.querySelector(".status")!;
  $("results").replaceChildren();
  $("performance").replaceChildren();
  $("images").replaceChildren();
  status.textContent = "checking…";
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
  const performance: BrepPatchesResult["performance"] = {};
  try {
    let id = 1;
    const shader = new CustomShader({
      label: "brep patches",
      fragment: FRAGMENT,
      uniforms: {
        mode: { type: "f32", value: 0 },
        first: { type: "f32", value: 0 },
      },
    });
    const target = new OffscreenTarget(WIDTH, HEIGHT);
    const modes = Object.values(MODE);

    for (const scene of scenes()) {
      const world = engine.createWorld({
        maxDraws: 8,
        vertexBytes: 1 << 20,
        indexBytes: 1 << 16,
      });
      const view = engine.addView({
        target,
        world,
        background: "color",
        clearColor: [0, 0, 0],
        observer: { exposure: UNITLESS_EXPOSURE },
      });
      const env: Environment = { engine, world, view, target, shader, lost };
      const setup = add(env, scene);
      shader.setUniform(
        "first",
        world.scene.drawFeatureFirst[setup.draw.index]!,
      );
      const origin = setup.patches.origin;
      const worldOf = (p: ArrayLike<number>): Vec3 => [
        ORIGIN[0] + origin[0]! + p[0]!,
        ORIGIN[1] + origin[1]! + p[1]!,
        ORIGIN[2] + origin[2]! + p[2]!,
      ];
      const cells: Array<
        Map<number, { nu: number; nv: number; chunks: number }>
      > = [];
      const total: number[] = [];

      for (const distance of DISTANCES) {
        placeCamera(
          view,
          [
            scene.target[0] + origin[0]!,
            scene.target[1] + origin[1]!,
            scene.target[2] + origin[2]!,
          ] as unknown as Vec3,
          distance,
        );
        // The face's own target is form space; the camera is relative to ORIGIN.
        const images = await capture(env, modes);
        const inside = interior(images.get(MODE.mask)!);
        const { read: pixels, mixed } = decode(images, setup.patches, inside);
        const eye = view.camera.position;

        // a. the drawn point against the true surface, in pixels.
        let worstPx = 0;
        let worstParametricPx = 0;
        let faceWrong = 0;
        for (const p of pixels) {
          const form = [0, 1, 2].map(
            (k) => p.model[k]! + origin[k]!,
          ) as unknown as Vec3;
          const depth = eye[2]! - (ORIGIN[2] + p.model[2]! + origin[2]!);
          const ppm = pixelsPerMetre(view, depth);
          const span = spanAt(setup.patches, p.face, p.u, p.v);
          if (!span || p.face !== 0) {
            faceWrong++;
            continue;
          }
          const surface = evaluateSpan(span, p.u, p.v).position;
          const parametric =
            Math.hypot(
              p.model[0]! - surface[0]!,
              p.model[1]! - surface[1]!,
              p.model[2]! - surface[2]!,
            ) * ppm;
          worstParametricPx = Math.max(worstParametricPx, parametric);
          worstPx = Math.max(
            worstPx,
            scene.distance ? scene.distance(form) * ppm : parametric,
          );
        }

        // b. the cells, against the CPU twin's.
        const counted = await readCells(env, setup.draw);
        cells.push(counted);
        total.push(sum(counted.values(), (c) => c.nu * c.nv));
        let apart = 0;
        for (const [index, c] of counted) {
          const span = setup.patches.spans[index]!;
          const sphere = span.faceSphere;
          const w = worldOf(sphere);
          const near = eye[2]! - w[2] - sphere[3];
          const error = TARGET / pixelsPerMetre(view, near);
          const twin = diceCounts(span, error);
          apart = Math.max(
            apart,
            Math.abs(twin.nu - c.nu),
            Math.abs(twin.nv - c.nv),
          );
        }

        // c. no cracks inside the silhouette.
        const crack = cracks(images.get(MODE.mask)!);

        checks.push({
          id: id++,
          name: `${scene.name}, ${distance} m`,
          measured: {
            "pixels measured": pixels.length,
            "pixels dropped (two triangles' average)": mixed,
            "worst error vs the surface, px": worstPx,
            "worst parametric error vs evaluateSpan, px": worstParametricPx,
            "spans drawn": counted.size,
            "cells (n_u · n_v summed)": total[total.length - 1]!,
            "GPU − CPU twin cells, largest per side": apart,
            "uncovered pixels inside the silhouette": crack.cracks,
            "pixels with the wrong face or span": faceWrong,
          },
          limit: `error at most ${TARGET} px (+ ${SLACK}); cells within 1 of the twin's; no cracks; the face is the face`,
          pass:
            pixels.length > 100 &&
            worstPx <= TARGET + SLACK &&
            apart <= 1 &&
            crack.cracks === 0 &&
            faceWrong === 0,
        });
      }

      // b. the cells grow as the camera approaches.
      const [far, near] = cells as [
        (typeof cells)[number],
        (typeof cells)[number],
      ];
      let shrank = 0;
      let grew = 0;
      for (const [index, c] of near) {
        const f = far.get(index);
        if (f) {
          shrank += Number(c.nu < f.nu || c.nv < f.nv);
          grew += Number(c.nu * c.nv > f.nu * f.nv);
        }
      }
      checks.push({
        id: id++,
        name: `${scene.name}: cells as the camera approaches`,
        measured: {
          [`cells at ${DISTANCES[0]} m`]: total[0]!,
          [`cells at ${DISTANCES[1]} m`]: total[1]!,
          "spans with fewer cells near": shrank,
          "spans with more cells near": grew,
        },
        limit: "more cells near, in total; none fewer",
        pass: total[1]! > total[0]! && shrank === 0 && grew > 0,
      });
      engine.removeView(view);
      world.removeBrep(setup.brep);
      world.destroy();
    }

    // d. a warped patch against its CPU twin.
    {
      const scene = scenes()[2]!;
      const world = engine.createWorld({
        maxDraws: 8,
        vertexBytes: 1 << 20,
        indexBytes: 1 << 16,
      });
      const view = engine.addView({
        target,
        world,
        background: "color",
        clearColor: [0, 0, 0],
        observer: { exposure: UNITLESS_EXPOSURE },
      });
      const env: Environment = { engine, world, view, target, shader, lost };
      const setup = add(env, scene);
      shader.setUniform(
        "first",
        world.scene.drawFeatureFirst[setup.draw.index]!,
      );
      const origin = setup.patches.origin;
      const wave = (p: ArrayLike<number>, out: Float64Array): void => {
        out[0] = 0.05 * Math.sin(2.1 * p[1]! + 0.4);
        out[1] = 0.04 * Math.cos(1.7 * p[2]! + 1.1 * p[0]!);
        out[2] = 0.12 * Math.sin(2.3 * p[0]! + 0.7) * Math.cos(1.9 * p[1]!);
      };
      const lattice = fitLattice(
        wave,
        { center: [0, 0, 0], scale: 2.4 },
        { tolerance: 1e-4, operation: "wave" },
      );
      const terms: WarpTerms = [
        { term: lattice, weight: { scale: 1, factors: [] } },
      ];
      const distance = 5.5;
      const place = (look: Vec3) =>
        placeCamera(
          view,
          [
            look[0] + origin[0]!,
            look[1] + origin[1]!,
            look[2] + origin[2]!,
          ] as unknown as Vec3,
          distance,
        );
      place(scene.target);
      const unwarped = await (async () => {
        await capture(env, [MODE.mask]);
        return readCells(env, setup.draw);
      })();
      setPlacement(world, setup.draw, terms);
      const images = await capture(env, modes);
      const warped = await readCells(env, setup.draw);
      const inside = interior(images.get(MODE.mask)!);
      const { read: pixels } = decode(images, setup.patches, inside);
      const eye = view.camera.position;
      let worstPx = 0;
      let moved = 0;
      const placed = new Float64Array(3);
      for (const p of pixels) {
        const span = spanAt(setup.patches, p.face, p.u, p.v);
        if (!span) {
          continue;
        }
        const surface = evaluateSpan(span, p.u, p.v).position;
        placeWithTerms(terms, surface, undefined, placed);
        const twin = [0, 1, 2].map(
          (k) => ORIGIN[k]! + origin[k]! + placed[k]! - eye[k]!,
        );
        const depth = -twin[2]!;
        const ppm = pixelsPerMetre(view, depth);
        worstPx = Math.max(
          worstPx,
          Math.hypot(
            p.camera[0]! - twin[0]!,
            p.camera[1]! - twin[1]!,
            p.camera[2]! - twin[2]!,
          ) * ppm,
        );
        moved = Math.max(
          moved,
          Math.hypot(
            placed[0]! - surface[0]!,
            placed[1]! - surface[1]!,
            placed[2]! - surface[2]!,
          ),
        );
      }
      const crack = cracks(images.get(MODE.mask)!);
      const cellsOf = (c: Map<number, { nu: number; nv: number }>) =>
        sum(c.values(), (e) => e.nu * e.nv);
      checks.push({
        id: id++,
        name: "weighted patch under a warp (fitted lattice), 5.5 m",
        measured: {
          "pixels measured": pixels.length,
          "drawn − placed true surface, worst, px": worstPx,
          "the farthest the warp moves the surface, m": moved,
          "cells without the warp": cellsOf(unwarped),
          "cells with it": cellsOf(warped),
          "uncovered pixels inside the silhouette": crack.cracks,
        },
        limit: `within ${TARGET} px (+ ${SLACK}, + 0.1 for the position read back from the depth); more cells than unwarped; no cracks`,
        pass:
          pixels.length > 100 &&
          worstPx <= TARGET + SLACK + 0.1 &&
          moved > 0.02 &&
          cellsOf(warped) > cellsOf(unwarped) &&
          crack.cracks === 0,
      });
      engine.removeView(view);
      world.removeBrep(setup.brep);
      world.destroy();
    }

    // The passes that aren't the colour: shadows, ambient occlusion (the depth and normal prepass), a pick.
    {
      const scene = scenes()[0]!;
      const world = engine.createWorld({
        maxDraws: 8,
        vertexBytes: 1 << 20,
        indexBytes: 1 << 16,
      });
      const view = engine.addView({
        target,
        world,
        background: "color",
        clearColor: [0, 0, 0],
        shadows: true,
        ambientOcclusion: true,
        observer: { exposure: UNITLESS_EXPOSURE },
      });
      const before = gpuErrors.length;
      const brep = world.addBrep(scene.form, {
        origin: ORIGIN_VECTOR,
        doubleSided: true,
      });
      const first = world.scene.drawFeatureFirst[brep.patches!.index]!;
      placeCamera(view, scene.target, DISTANCES[1]);
      for (let k = 0; k < 4; k++) {
        engine.renderFrame();
        lost();
        await target.read();
      }
      const picked = view.pick(WIDTH / 2, HEIGHT / 2);
      for (let k = 0; k < 4; k++) {
        engine.renderFrame();
      }
      const hit = await Promise.race([
        picked,
        sleep(5000).then(() => undefined),
      ]);
      checks.push({
        id: id++,
        name: "shadows, ambient occlusion and a pick on a patch draw",
        measured: {
          "GPU errors": gpuErrors.length - before,
          "picked feature − the draw's first": hit
            ? hit.featureId - first
            : Number.NaN,
        },
        limit: "no GPU errors; the pick is the face (feature 0)",
        pass: gpuErrors.length === before && hit?.featureId === first,
      });
      engine.removeView(view);
      world.removeBrep(brep);
      world.destroy();
    }

    // 200 faces: triangles and time, against the CPU tessellator at the same error.
    {
      const form = wall(20, 10);
      const world = engine.createWorld({
        maxDraws: 8,
        vertexBytes: 1 << 24,
        indexBytes: 1 << 24,
      });
      const view = engine.addView({
        target: new OffscreenTarget(768, 384),
        world,
        background: "color",
        clearColor: [0, 0, 0],
        observer: { exposure: UNITLESS_EXPOSURE },
      });
      const distance = 26;
      placeCamera(view, [0, 0, 0], distance);
      /** Renders, then waits for the timers' readbacks (their smoothing runs on them). */
      const frames = async (count: number) => {
        for (let k = 0; k < count; k++) {
          engine.renderFrame();
          await sleep(0);
          lost();
        }
        for (let k = 0; k < 8; k++) {
          await sleep(100);
          engine.renderFrame();
        }
      };
      const prepareStart = globalThis.performance.now();
      const prepared = prepareGpuPatches(form);
      const prepareMs = globalThis.performance.now() - prepareStart;
      const addStart = globalThis.performance.now();
      const brep = world.addBrep(form, {
        origin: ORIGIN_VECTOR,
        errorPixels: TARGET,
        maxChunks: 1 << 16,
      });
      const addMs = globalThis.performance.now() - addStart;
      await frames(90);
      const draw = brep.patches!;
      const env: Environment = {
        engine,
        world,
        view,
        target: view.target as OffscreenTarget,
        shader,
        lost,
      };
      const counted = await readCells(env, draw);
      const cellCount = sum(counted.values(), (c) => c.nu * c.nv);
      const chunkCount = sum(counted.values(), (c) => c.chunks);
      // The dice's own counts, read back (`World.readPatchStats`), against the chunk list's.
      const [diced] = await world.readPatchStats();
      // What 8 × 8 chunks drawn without indices would have cost on the same spans.
      const oldChunks = sum(
        counted.values(),
        (c) => Math.ceil(c.nu / 8) * Math.ceil(c.nv / 8),
      );
      const passes = { ...engine.gpuPasses };
      const gpuMs = engine.stats.gpuMs;
      const cpuMs = engine.stats.cpuMs;
      // The tessellator at the error the pixels allow at the wall's nearest depth.
      const aspect = 768 / 384;
      const fovy = view.camera.fovy(aspect);
      const ppm = 384 / 2 / (Math.tan(fovy / 2) * (distance - 0.8));
      const tolerance = TARGET / ppm;
      const meshStart = globalThis.performance.now();
      const mesh = tessellateBrep(form, { tolerance });
      const tessellateMs = globalThis.performance.now() - meshStart;
      const triangles = mesh.faces.indices.length / 3;
      engine.removeView(view);
      world.removeBrep(brep);
      world.destroy();

      const meshWorld = engine.createWorld({
        maxDraws: 8,
        vertexBytes: 1 << 26,
        indexBytes: 1 << 26,
      });
      const meshView = engine.addView({
        target: new OffscreenTarget(768, 384),
        world: meshWorld,
        background: "color",
        clearColor: [0, 0, 0],
        observer: { exposure: UNITLESS_EXPOSURE },
      });
      placeCamera(meshView, [0, 0, 0], distance);
      meshWorld.addDraw({
        mesh: meshWorld.addMesh({
          positions: mesh.faces.positions,
          normals: mesh.faces.normals,
          indices: mesh.faces.indices,
        }),
        origin: Float64Array.from(ORIGIN.map((o, k) => o + mesh.origin[k]!)),
        doubleSided: true,
      });
      await frames(90);
      const meshGpuMs = engine.stats.gpuMs;
      const meshCpuMs = engine.stats.cpuMs;
      engine.removeView(meshView);
      meshWorld.destroy();

      const round = (x: number) => Number(x.toFixed(3));
      const side = PATCH_CHUNK_CELLS + 1;
      performance["GPU dicing"] = {
        faces: form.faceSurface.length,
        spans: prepared.spans.length,
        "target error, px": TARGET,
        "cells diced": cellCount,
        triangles: 2 * cellCount,
        [`chunks (${PATCH_CHUNK_CELLS} × ${PATCH_CHUNK_CELLS} cells, ${side * side} shared vertices)`]:
          chunkCount,
        "vertex invocations, indexed chunks": chunkCount * side * side,
        "vertex invocations per cell, indexed chunks": round(
          (chunkCount * side * side) / cellCount,
        ),
        "before: 8 × 8 chunks, 6 vertices a cell, invocations": oldChunks * 384,
        "before: invocations per cell": round((oldChunks * 384) / cellCount),
        "readback of the dice: cells": diced?.cells ?? 0,
        "readback of the dice: chunks": diced?.chunks ?? 0,
        "readback of the dice: spans diced": diced?.spansDiced ?? 0,
        "CPU: prepare spans, ms": round(prepareMs),
        "CPU: addBrep (prepare, pack, upload), ms": round(addMs),
        "CPU: frame (renderFrame), ms": round(cpuMs),
        "GPU frame, ms": Number.isNaN(gpuMs)
          ? "n/a (no timestamp-query)"
          : round(gpuMs),
        ...passTimes(passes),
      };
      performance["tessellateBrep"] = {
        faces: form.faceSurface.length,
        "tolerance, mm": round(tolerance * 1000),
        triangles,
        "CPU: tessellate, ms": round(tessellateMs),
        "CPU: frame (renderFrame), ms": round(meshCpuMs),
        "GPU frame, ms": Number.isNaN(meshGpuMs)
          ? "n/a (no timestamp-query)"
          : round(meshGpuMs),
      };
      checks.push({
        id: id++,
        name: "200 faces drawn by the GPU",
        measured: {
          "triangles diced": 2 * cellCount,
          "triangles tessellated (same error)": triangles,
          "dice readback agrees with the chunk list":
            diced?.cells === cellCount && diced?.chunks === chunkCount ? 1 : 0,
          "GPU errors": gpuErrors.length,
        },
        limit:
          "no GPU errors; the diced faces draw; the dice's counts read back are the chunk list's (see the table for the times)",
        pass:
          cellCount > 0 &&
          gpuErrors.length === 0 &&
          diced?.cells === cellCount &&
          diced?.chunks === chunkCount,
      });
    }
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
        `[brepPatches] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
      );
    }
    if (gpuErrors.length) {
      console.error(
        `[brepPatches] GPU errors: ${gpuErrors.slice(0, 3).join(" | ")}`,
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

function renderPerformance(
  performance: BrepPatchesResult["performance"],
): void {
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
    return { run: runBrepPatches, dispose: () => stop(active) };
  },
};
