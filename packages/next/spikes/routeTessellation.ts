// GPU tessellation of meshes under smooth routes (plan 2026-11-12, task 5):
// a prototype. A straight triangle edge of a mesh is drawn as a curve when a
// smooth edge of the route bends it: a long edge across a 50 km tile under
// ×10 vertical exaggeration, or across a lens-distorted image. Vertices are
// transformed, so the pixels in between are interpolated along the chord, and
// the chord's error is M₂L²/8 (M₂ the route's second-derivative bound over
// the draw, `src/transform/curvature.ts`, L the edge's length), which falls
// as 1/n² under n-fold subdivision. So:
//   - per draw (CPU, float64): M₂ from the route's Jacobian over the draw's
//     box (27 samples, ×1.25 for an estimate) and the tolerance in metres, a
//     fraction of a pixel at the draw's nearest distance;
//   - per triangle (GPU, `subdivide`): n = ceil(√(M₂L²/8 / tolerance)), 1 to
//     64, uniform over the triangle, from its longest edge in local metres;
//   - the draw's one indirect draw (`writeArgs`): n² sub-triangles per
//     triangle in chunks of 16 (48 vertices, one instance each), written
//     the way dice.slang's `dicePatches` and `writePatchArgs` write a b-rep
//     draw's chunks (an atomic counter reserves a triangle's chunks; one
//     thread writes the arguments); the vertex stage would decode (triangle,
//     n, first sub-triangle) from the instance and the vertex index to
//     lattice points, interpolate in local space and call `transformPoint`.
// Here a compute pass (`evaluate`) stands in for that vertex stage and the
// arguments are read back. Checked against float64: the GPU's positions of
// the triangle edges' lattice points (mm), and the distance from the float64
// curve (the route of the straight local edge) to the polyline of those
// points, in pixels, with and without subdividing. Pass: within 0.5 px.
//
// Run: node scripts/runSpike.mjs "http://127.0.0.1:5190/spikes/routeTessellation.html?bench&nohmr" runRouteTessellation
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  geocentricToGeographic,
  utm,
  verticalExaggeration,
} from "../src/georeference/index.ts";
import { Ellipsoid, cartographic } from "../src/math/ellipsoid.ts";
import { compileRoute, type CompiledRoute } from "../src/transform/compile.ts";
import {
  affine,
  chordError,
  curvatureOver,
  routeBetween,
  subdivisionFor,
  TransformGraph,
  type Route,
} from "../src/transform/index.ts";
import { radialDistortion } from "../src/transforms/index.ts";

const TEMPLATE = `
<h1>Route tessellation</h1>
<p>
  A mesh's long edges under a smooth route are curves; a compute pass picks
  each triangle's subdivision from the route's curvature and writes the
  indirect draw. Edges against the float64 curve, in pixels.
</p>
<div class="status">Run to measure on this GPU.</div>
<div data-id="adapter"></div>
<pre data-id="results"></pre>`;

interface Check {
  name: string;
  measured: Record<string, number | string>;
  pass: boolean;
}

const WGS84 = Ellipsoid.WGS84;
const RAD = Math.PI / 180;
const SUBS_PER_CHUNK = 16;
const MAX_LEVEL = 64;
const CAPACITY = 16384;
/** The estimate of M₂ is from samples: take it this much larger. */
const CURVATURE_MARGIN = 1.25;
/** The share of the 0.5 px budget the subdivision tolerance takes (float32 vertices and the estimate have the rest). */
const TOLERANCE_PIXELS = 0.25;
const BUDGET_PIXELS = 0.5;

function ecef(lon: number, lat: number, h: number): Float64Array {
  return WGS84.cartographicToCartesian(
    cartographic(lon * RAD, lat * RAD, h),
    new Float64Array(3),
  );
}

/** Column-major local-to-ECEF at a point: east, north, up and the point. */
function enu(lon: number, lat: number, h: number): Float64Array {
  const l = lon * RAD;
  const p = lat * RAD;
  const t = ecef(lon, lat, h);
  // prettier-ignore
  return Float64Array.from([
    -Math.sin(l), Math.cos(l), 0, 0,
    -Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p), 0,
    Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p), 0,
    t[0]!, t[1]!, t[2]!, 1,
  ]);
}

function rigid(angle: number, t: ArrayLike<number>): Float64Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // prettier-ignore
  return Float64Array.from([
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    t[0]!, t[1]!, t[2]!, 1,
  ]);
}

interface Scenario {
  name: string;
  route: Route;
  /** The draw's centre in the route's local frame, and the half extents of its box. */
  centre: Float64Array;
  half: readonly [number, number, number];
  /** A grid of `cells` × `cells` squares across the box's top face, two triangles each. */
  cells: number;
  /** The camera's nearest distance to the draw, in the route's output units. */
  distance: number;
  /** The step the curvature is read over (about 1/1000 of the draw), in local units. */
  step: number;
  positionBudgetMm: number;
}

const VIEW = { fovy: 50 * RAD, height: 1080 };

function exaggerationScenario(cells: number): Scenario {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const view = graph.add(
    "view",
    world,
    affine({ matrix: rigid(0.5, [1000, -2000, 500]) }),
  );
  const ex = graph.add(
    "ex",
    view,
    verticalExaggeration({ factor: 10, ceiling: 9000 }),
  );
  const content = graph.add(
    "content",
    ex,
    affine({ matrix: enu(8.5, 46.5, 0) }),
  );
  return {
    name: `×10 exaggeration over a 50 km tile, ${cells === 1 ? "2 triangles" : `${2 * cells * cells} triangles`}`,
    route: routeBetween(content, world),
    centre: Float64Array.of(0, 0, 1500),
    half: [25000, 25000, 1],
    cells,
    distance: 10000,
    step: 25,
    positionBudgetMm: 60,
  };
}

function utmScenario(cells: number): Scenario {
  const graph = new TransformGraph();
  const world = graph.root("utm");
  const geo = graph.add("geo", world, utm({ zone: 31 }));
  const earth = graph.add("earth", geo, geocentricToGeographic());
  const ex = graph.add(
    "ex",
    earth,
    verticalExaggeration({ factor: 3, ceiling: 9000 }),
  );
  const content = graph.add("content", ex, affine({ matrix: enu(5, 46, 0) }));
  return {
    name: `UTM 31 · ×3 exaggeration over a 50 km tile, ${2 * cells * cells} triangles`,
    route: routeBetween(content, world),
    centre: Float64Array.of(0, 0, 1500),
    half: [25000, 25000, 1],
    cells,
    distance: 10000,
    step: 25,
    positionBudgetMm: 60,
  };
}

function lensScenario(cells: number): Scenario {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const camera = graph.add(
    "camera",
    world,
    affine({ matrix: enu(2.35, 48.85, 35) }),
  );
  const lens = graph.add(
    "lens",
    camera,
    radialDistortion({
      k1: -0.18,
      k2: 0.04,
      k3: -0.005,
      p1: 0.001,
      p2: -0.0008,
    }),
  );
  const content = graph.add(
    "content",
    lens,
    affine({ matrix: rigid(0, [0, 0, 0]) }),
  );
  return {
    name: `radial lens distortion across the frame (±50° of a 60 m plane), ${cells === 1 ? "2 triangles" : `${2 * cells * cells} triangles`}`,
    route: routeBetween(content, world),
    centre: Float64Array.of(0, 0, 60),
    half: [70, 45, 1],
    cells,
    distance: 40,
    step: 0.05,
    positionBudgetMm: 2,
  };
}

interface Gpu {
  device: GPUDevice;
  adapter: GPUAdapter;
}

async function openGpu(): Promise<Gpu> {
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    throw new Error("no WebGPU adapter");
  }
  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: Math.min(
        adapter.limits.maxStorageBufferBindingSize,
        1 << 29,
      ),
      maxBufferSize: Math.min(adapter.limits.maxBufferSize, 1 << 29),
    },
  });
  device.addEventListener("uncapturederror", (e) =>
    console.error(
      "[routeTessellation] GPU error:",
      (e as GPUUncapturedErrorEvent).error.message,
    ),
  );
  return { device, adapter };
}

function upload(
  device: GPUDevice,
  data: ArrayBufferView,
  usage: number,
): GPUBuffer {
  const buffer = device.createBuffer({
    size: Math.max(16, Math.ceil(data.byteLength / 16) * 16),
    usage: usage | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  device.queue.writeBuffer(
    buffer,
    0,
    data.buffer as ArrayBuffer,
    data.byteOffset,
    data.byteLength,
  );
  return buffer;
}

async function read(
  device: GPUDevice,
  source: GPUBuffer,
  bytes: number,
): Promise<ArrayBuffer> {
  const staging = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(source, 0, staging, 0, bytes);
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const out = staging.getMappedRange().slice(0);
  staging.unmap();
  staging.destroy();
  return out;
}

async function compileModule(
  device: GPUDevice,
  code: string,
  label: string,
): Promise<GPUShaderModule> {
  const module = device.createShaderModule({ code, label });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === "error");
  if (errors.length > 0) {
    const lines = code.split("\n");
    throw new Error(
      `${label}: WGSL errors\n${errors
        .slice(0, 5)
        .map(
          (m) =>
            `${m.lineNum}:${m.linePos} ${m.message}\n    ${(lines[m.lineNum - 1] ?? "").slice(0, 200)}`,
        )
        .join("\n")}`,
    );
  }
  return module;
}

// The kernels. The route's fragment (`DrawCentre`, `RouteUniforms`,
// `transformPoint`) comes first.
const KERNELS = `
struct TessParams {
  curvature: f32,
  tolerance: f32,
  maxLevel: u32,
  triangles: u32,
  capacity: u32,
  pad0: u32,
  pad1: u32,
  pad2: u32,
};

const SUBS_PER_CHUNK = ${SUBS_PER_CHUNK}u;
const VERTS_PER_CHUNK = ${3 * SUBS_PER_CHUNK}u;

@group(0) @binding(0) var<uniform> u: RouteUniforms;
@group(0) @binding(1) var<storage, read> draws: array<DrawCentre>;
// Three corners per triangle, offsets from the draw's centre.
@group(0) @binding(2) var<storage, read> tris: array<vec4f>;
@group(0) @binding(3) var<uniform> tess: TessParams;
// (triangle, level, first sub-triangle, 0), one per chunk (instance).
@group(0) @binding(4) var<storage, read_write> chunks: array<vec4u>;
// 0: chunks asked for, 1: sub-triangles, 2: chunks drawn.
@group(0) @binding(5) var<storage, read_write> counters: array<atomic<u32>, 4>;
// DrawIndirect: vertexCount, instanceCount, firstVertex, firstInstance.
@group(0) @binding(6) var<storage, read_write> args: array<u32, 4>;
@group(0) @binding(7) var<storage, read_write> outP: array<vec4f>;
@group(0) @binding(8) var<storage, read_write> outB: array<vec4u>;
@group(0) @binding(9) var<storage, read_write> levels: array<u32>;

fn longestEdge(i: u32) -> f32 {
  let a = tris[3u * i].xyz;
  let b = tris[3u * i + 1u].xyz;
  let c = tris[3u * i + 2u].xyz;
  return max(length(b - a), max(length(c - b), length(a - c)));
}

@compute @workgroup_size(64)
fn subdivide(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= tess.triangles) {
    return;
  }
  let l = longestEdge(i);
  let err = tess.curvature * l * l * 0.125;
  var n = 1u;
  if (err > tess.tolerance) {
    n = min(u32(ceil(sqrt(err / tess.tolerance))), tess.maxLevel);
  }
  levels[i] = n;
  let subs = n * n;
  let count = (subs + SUBS_PER_CHUNK - 1u) / SUBS_PER_CHUNK;
  let first = atomicAdd(&counters[0], count);
  atomicAdd(&counters[1], subs);
  for (var c = 0u; c < count; c++) {
    if (first + c >= tess.capacity) {
      break;
    }
    chunks[first + c] = vec4u(i, n, c * SUBS_PER_CHUNK, 0u);
  }
}

@compute @workgroup_size(1)
fn writeArgs() {
  let asked = atomicLoad(&counters[0]);
  let drawn = min(asked, tess.capacity);
  atomicStore(&counters[2], drawn);
  args[0] = VERTS_PER_CHUNK;
  args[1] = drawn;
  args[2] = 0u;
  args[3] = 0u;
}

// The vertex stage's decode: sub-triangle s of an n × n subdivision, rows by
// b, row r holding 2(n − r) − 1 triangles (up, down, up, …), to the lattice
// points (a, b) of its corner k, with a + b ≤ n.
fn lattice(s: u32, n: u32, k: u32) -> vec2u {
  var r = 0u;
  while (r + 1u < n && (r + 1u) * (2u * n - (r + 1u)) <= s) {
    r++;
  }
  let within = s - r * (2u * n - r);
  let j = within / 2u;
  let up = (within & 1u) == 0u;
  if (up) {
    // (j, r), (j + 1, r), (j, r + 1)
    if (k == 0u) { return vec2u(j, r); }
    if (k == 1u) { return vec2u(j + 1u, r); }
    return vec2u(j, r + 1u);
  }
  // (j + 1, r), (j + 1, r + 1), (j, r + 1)
  if (k == 0u) { return vec2u(j + 1u, r); }
  if (k == 1u) { return vec2u(j + 1u, r + 1u); }
  return vec2u(j, r + 1u);
}

@compute @workgroup_size(64)
fn evaluate(@builtin(global_invocation_id) gid: vec3u) {
  let g = gid.x;
  let drawn = atomicLoad(&counters[2]);
  let chunk = g / VERTS_PER_CHUNK;
  if (chunk >= drawn) {
    return;
  }
  let v = g % VERTS_PER_CHUNK;
  let record = chunks[chunk];
  let s = record.z + v / 3u;
  let n = record.y;
  if (s >= n * n) {
    outB[g] = vec4u(0xffffffffu, 0u, 0u, n);
    return;
  }
  let ab = lattice(s, n, v % 3u);
  let t = record.x;
  let v0 = tris[3u * t].xyz;
  let v1 = tris[3u * t + 1u].xyz;
  let v2 = tris[3u * t + 2u].xyz;
  let lp = v0 + (v1 - v0) * (f32(ab.x) / f32(n)) + (v2 - v0) * (f32(ab.y) / f32(n));
  outP[g] = vec4f(transformPoint(lp, draws[0], u), 1.0);
  outB[g] = vec4u(t, ab.x, ab.y, n);
}
`;

interface Pipelines {
  layout: GPUBindGroupLayout;
  subdivide: GPUComputePipeline;
  writeArgs: GPUComputePipeline;
  evaluate: GPUComputePipeline;
}

async function makePipelines(
  device: GPUDevice,
  compiled: CompiledRoute,
): Promise<Pipelines> {
  const entry = (
    binding: number,
    type: GPUBufferBindingType,
  ): GPUBindGroupLayoutEntry => ({
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type },
  });
  const layout = device.createBindGroupLayout({
    entries: [
      entry(0, "uniform"),
      entry(1, "read-only-storage"),
      entry(2, "read-only-storage"),
      entry(3, "uniform"),
      entry(4, "storage"),
      entry(5, "storage"),
      entry(6, "storage"),
      entry(7, "storage"),
      entry(8, "storage"),
      entry(9, "storage"),
    ],
  });
  const module = await compileModule(
    device,
    compiled.wgsl + KERNELS,
    "route tessellation",
  );
  const make = (entryPoint: string) =>
    device.createComputePipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
      compute: { module, entryPoint },
    });
  const [subdivide, writeArgs, evaluate] = await Promise.all([
    make("subdivide"),
    make("writeArgs"),
    make("evaluate"),
  ]);
  return { layout, subdivide, writeArgs, evaluate };
}

/** A grid of `cells` × `cells` squares over the box's top face, two triangles each, as offsets from the centre (float32). */
function gridTriangles(scenario: Scenario): Float32Array {
  const { cells, half } = scenario;
  const out: number[] = [];
  const at = (i: number, j: number) => [
    Math.fround(half[0] * (2 * (i / cells) - 1)),
    Math.fround(half[1] * (2 * (j / cells) - 1)),
    0,
    0,
  ];
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);
      out.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  }
  return Float32Array.from(out);
}

/** The corners of a box, for sampling M₂: a 3 × 3 × 3 grid. */
function boxSamples(scenario: Scenario): number[] {
  const { centre, half } = scenario;
  const out: number[] = [];
  for (const i of [-1, 0, 1]) {
    for (const j of [-1, 0, 1]) {
      for (const k of [-1, 0, 1]) {
        out.push(
          centre[0]! + i * half[0],
          centre[1]! + j * half[1],
          centre[2]! + k * half[2],
        );
      }
    }
  }
  return out;
}

/** The distance from `q` to the polyline through `points` (flat, n × 3). */
function distanceToPolyline(q: Float64Array, points: Float64Array[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const e = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const l2 = e[0]! ** 2 + e[1]! ** 2 + e[2]! ** 2;
    const f =
      l2 > 0
        ? Math.min(
            1,
            Math.max(
              0,
              ((q[0]! - a[0]!) * e[0]! +
                (q[1]! - a[1]!) * e[1]! +
                (q[2]! - a[2]!) * e[2]!) /
                l2,
            ),
          )
        : 0;
    best = Math.min(
      best,
      Math.hypot(
        q[0]! - a[0]! - f * e[0]!,
        q[1]! - a[1]! - f * e[1]!,
        q[2]! - a[2]! - f * e[2]!,
      ),
    );
  }
  return best;
}

async function tessellate(
  gpu: Gpu,
  scenario: Scenario,
  checks: Check[],
): Promise<void> {
  const { device } = gpu;
  const { route } = scenario;
  const compiled = compileRoute(route, {
    normals: false,
    centreCompute: false,
  });
  if (!compiled.ok) {
    throw new Error(compiled.reason);
  }
  const pipes = await makePipelines(device, compiled);
  const triangles = gridTriangles(scenario);
  const count = triangles.length / 12;
  const pixel = (2 * scenario.distance * Math.tan(VIEW.fovy / 2)) / VIEW.height;
  const curvature =
    CURVATURE_MARGIN *
    curvatureOver(route, boxSamples(scenario), scenario.step);
  const tolerance = TOLERANCE_PIXELS * pixel;

  const eye = route.forward(scenario.centre, new Float64Array(3));
  const uniforms = new Float32Array(compiled.uniformsLayout.floats);
  compiled.fillUniforms(route, uniforms, eye);
  const record = new Float32Array(compiled.perDrawLayout.floats);
  compiled.centreConstants(scenario.centre, undefined, route, record);
  const params = new ArrayBuffer(32);
  new Float32Array(params, 0, 2).set([curvature, tolerance]);
  new Uint32Array(params, 8, 3).set([MAX_LEVEL, count, CAPACITY]);

  const uniformsBuffer = upload(device, uniforms, GPUBufferUsage.UNIFORM);
  const drawBuffer = upload(device, record, GPUBufferUsage.STORAGE);
  const triBuffer = upload(device, triangles, GPUBufferUsage.STORAGE);
  const paramBuffer = upload(
    device,
    new Uint8Array(params),
    GPUBufferUsage.UNIFORM,
  );
  const chunkBuffer = device.createBuffer({
    size: 16 * CAPACITY,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const counterBuffer = upload(
    device,
    new Uint32Array(4),
    GPUBufferUsage.STORAGE,
  );
  const argBuffer = upload(device, new Uint32Array(4), GPUBufferUsage.STORAGE);
  const vertexCount = CAPACITY * 3 * SUBS_PER_CHUNK;
  const outP = device.createBuffer({
    size: 16 * vertexCount,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const outB = device.createBuffer({
    size: 16 * vertexCount,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const levelBuffer = device.createBuffer({
    size: 4 * Math.max(count, 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const buffers = [
    uniformsBuffer,
    drawBuffer,
    triBuffer,
    paramBuffer,
    chunkBuffer,
    counterBuffer,
    argBuffer,
    outP,
    outB,
    levelBuffer,
  ];
  const group = device.createBindGroup({
    layout: pipes.layout,
    entries: buffers.map((buffer, binding) => ({
      binding,
      resource: { buffer },
    })),
  });
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setBindGroup(0, group);
  pass.setPipeline(pipes.subdivide);
  pass.dispatchWorkgroups(Math.ceil(count / 64));
  pass.setPipeline(pipes.writeArgs);
  pass.dispatchWorkgroups(1);
  pass.setPipeline(pipes.evaluate);
  pass.dispatchWorkgroups(Math.ceil(vertexCount / 64));
  pass.end();
  device.queue.submit([encoder.finish()]);
  const counters = new Uint32Array(await read(device, counterBuffer, 16));
  const args = new Uint32Array(await read(device, argBuffer, 16));
  const levels = new Uint32Array(await read(device, levelBuffer, 4 * count));
  const asked = counters[0]!;
  const drawn = counters[2]!;
  const total = drawn * 3 * SUBS_PER_CHUNK;
  const gotP = new Float32Array(await read(device, outP, 16 * total));
  const gotB = new Uint32Array(await read(device, outB, 16 * total));
  for (const b of buffers) {
    b.destroy();
  }

  // What the CPU expects of the same decisions.
  const expectLevels: number[] = [];
  let expectChunks = 0;
  let expectSubs = 0;
  for (let t = 0; t < count; t++) {
    const v = (k: number) =>
      triangles.subarray(12 * t + 4 * k, 12 * t + 4 * k + 3);
    const edge = (a: Float32Array, b: Float32Array) =>
      Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!);
    const longest = Math.max(
      edge(v(0), v(1)),
      edge(v(1), v(2)),
      edge(v(2), v(0)),
    );
    const n = subdivisionFor(curvature, longest, tolerance, MAX_LEVEL);
    expectLevels.push(n);
    expectChunks += Math.ceil((n * n) / SUBS_PER_CHUNK);
    expectSubs += n * n;
  }
  const levelsMatch = Array.from(levels).every(
    (n, t) => Math.abs(n - expectLevels[t]!) <= 1,
  );

  // The lattice points of each triangle's edges, as the GPU placed them.
  const points = new Map<string, Float64Array>();
  for (let g = 0; g < total; g++) {
    if (gotB[4 * g]! === 0xffffffff) {
      continue;
    }
    const key = `${gotB[4 * g]}:${gotB[4 * g + 1]}:${gotB[4 * g + 2]}`;
    if (!points.has(key)) {
      points.set(
        key,
        Float64Array.of(gotP[4 * g]!, gotP[4 * g + 1]!, gotP[4 * g + 2]!),
      );
    }
  }
  let positionMm = 0;
  let chordPx = 0;
  let unsubdividedPx = 0;
  let boundOverActual = Infinity;
  let worstEdge = 0;
  const local = new Float64Array(3);
  const truthAt = (t: number, k0: number, k1: number, s: number) => {
    for (let a = 0; a < 3; a++) {
      const p0 = scenario.centre[a]! + triangles[12 * t + 4 * k0 + a]!;
      const p1 = scenario.centre[a]! + triangles[12 * t + 4 * k1 + a]!;
      local[a] = p0 + s * (p1 - p0);
    }
    const q = route.forward(local, new Float64Array(3));
    return Float64Array.of(q[0]! - eye[0]!, q[1]! - eye[1]!, q[2]! - eye[2]!);
  };
  for (let t = 0; t < count; t++) {
    const n = levels[t]!;
    // Edges v0→v1 (b = 0), v0→v2 (a = 0), v1→v2 (a + b = n).
    const edges: Array<[number, number, (i: number) => [number, number]]> = [
      [0, 1, (i) => [i, 0]],
      [0, 2, (i) => [0, i]],
      [1, 2, (i) => [n - i, i]],
    ];
    for (const [k0, k1, ab] of edges) {
      const polyline: Float64Array[] = [];
      for (let i = 0; i <= n; i++) {
        const [a, b] = ab(i);
        const p = points.get(`${t}:${a}:${b}`);
        if (!p) {
          throw new Error(`triangle ${t}: no vertex at lattice (${a}, ${b})`);
        }
        polyline.push(p);
        const q = truthAt(t, k0, k1, i / n);
        positionMm = Math.max(positionMm, apart(p, q) * 1000);
      }
      let worst = 0;
      const samples = Math.max(64, 16 * n);
      for (let i = 0; i <= samples; i++) {
        worst = Math.max(
          worst,
          distanceToPolyline(truthAt(t, k0, k1, i / samples), polyline),
        );
      }
      chordPx = Math.max(chordPx, worst / pixel);
      // The same edge as two vertices.
      const ends = [polyline[0]!, polyline[n]!];
      let plain = 0;
      for (let i = 0; i <= samples; i++) {
        plain = Math.max(
          plain,
          distanceToPolyline(truthAt(t, k0, k1, i / samples), ends),
        );
      }
      unsubdividedPx = Math.max(unsubdividedPx, plain / pixel);
      if (plain > worstEdge) {
        worstEdge = plain;
        const length = Math.hypot(
          triangles[12 * t + 4 * k1]! - triangles[12 * t + 4 * k0]!,
          triangles[12 * t + 4 * k1 + 1]! - triangles[12 * t + 4 * k0 + 1]!,
        );
        boundOverActual = chordError(curvature, length) / plain;
      }
    }
  }
  const histogram = new Map<number, number>();
  for (const n of levels) {
    histogram.set(n, (histogram.get(n) ?? 0) + 1);
  }
  checks.push({
    name: scenario.name,
    measured: {
      triangles: count,
      curvature: Number(curvature.toExponential(2)),
      pixelMetres: Number(pixel.toFixed(3)),
      toleranceMetres: Number(tolerance.toFixed(3)),
      levels: [...histogram]
        .sort((a, b) => a[0] - b[0])
        .map(([n, c]) => `${n}×${c}`)
        .join(" "),
      subTriangles: counters[1]!,
      chunks: `${drawn} of ${asked}`,
      indirect: `${args[0]} vertices × ${args[1]} instances`,
      unsubdividedPx: Number(unsubdividedPx.toFixed(2)),
      chordPx: Number(chordPx.toFixed(3)),
      boundOverActual: Number(boundOverActual.toFixed(2)),
      positionMm: Number(positionMm.toFixed(2)),
    },
    pass:
      chordPx <= BUDGET_PIXELS &&
      positionMm <= scenario.positionBudgetMm &&
      levelsMatch &&
      asked === expectChunks &&
      counters[1] === expectSubs &&
      args[0] === 3 * SUBS_PER_CHUNK &&
      args[1] === drawn &&
      drawn === asked,
  });
}

function apart(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
}

export async function runRouteTessellation() {
  const gpu = await openGpu();
  const info = gpu.adapter.info;
  const checks: Check[] = [];
  for (const scenario of [
    exaggerationScenario(1),
    exaggerationScenario(8),
    utmScenario(4),
    lensScenario(1),
    lensScenario(8),
  ]) {
    await tessellate(gpu, scenario, checks);
  }
  return {
    adapter: `${info.vendor} ${info.architecture} ${info.description}`.trim(),
    checks,
  };
}

export const harness: Harness = {
  mount(root) {
    root.innerHTML = TEMPLATE;
    return { run: runRouteTessellation };
  },
};
