// The transform graph's compiler on the GPU (plan 2026-11-12, task 4a): routes
// compiled to WGSL (`src/transform/compile.ts`) run over sample vertices and
// compared with the float64 route (`route.forward`, `route.jacobian`).
// Cases:
//  a. affine · verticalExaggeration ×10 · affine, tiles of 1, 2 and 8 km at
//     the Earth's radius (and a tile across the lift's blend band);
//  b. UTM zone 31 above geographic above ×3 exaggeration (nested smooth steps),
//     with exact normals and with linear ones (J at the draw's centre and its
//     first-order change, for the steps with no kink: task 4b);
//  c. a twist whose rate changes every frame: a dynamic parameter, the
//     centre constants recomputed per frame by the df64 compute pass;
//  d. Brown–Conrady lens distortion on a camera branch;
//  e. the renderer's glue (`routeVertex`, scene/routeVariant.ts): a draw's
//     block of the placements buffer, packed as the world packs it, read by
//     the glue with a stand-in view (eye, shading axes), against float64.
// Per case: the worst position error (mm) and normal angle error (degrees)
// against float64, with the centre constants from the CPU (float64) and from
// the GPU's df64 pass. Timing: 1M vertices through `transformPoint` and
// `transformVertex`, and the centre-constant pass for 1024 draws.
//
// Run: node scripts/runSpike.mjs "http://127.0.0.1:5190/spikes/transformGraph.html?bench&nohmr" runTransformGraph
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  geocentricToGeographic,
  utm,
  verticalExaggerationEdge,
} from "../src/georeference/index.ts";
import { Ellipsoid, cartographic } from "../src/math/ellipsoid.ts";
import {
  ROUTE_BODY,
  ROUTE_POINTER_ROWS,
  ROUTE_KIND,
  ROUTE_OWN_ROWS,
  routeBlockRows,
  routeUnitWgsl,
} from "../src/scene/routeVariant.ts";
import {
  compileRoute,
  type CompiledRoute,
  type ParamRecord,
} from "../src/transform/compile.ts";
import {
  affine,
  routeBetween,
  TransformGraph,
  type Route,
} from "../src/transform/index.ts";
import { radialDistortion, twist } from "../src/transforms/index.ts";

const TEMPLATE = `
<h1>Transform graph compiler</h1>
<p>
  Routes compiled to WGSL: centre constants in float64 (hi/lo), the residual
  F(c + δ) − F(c) in float32. Positions and normals against float64.
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

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

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
  /** Draw centres in the route's local frame. */
  centres: (count: number) => Float64Array[];
  /** Vertex offsets: horizontal radius and vertical half-extent. */
  radius: number;
  vertical: number;
  positionBudgetMm: number;
  /** Frames to run, each preceded by `frame(k)` (a dynamic parameter moving). */
  frames: number;
  frame?: (k: number) => void;
  /** How the normals' Jacobian is made (`CompileOptions.normals`; default exact). */
  normals?: "exact" | "linear";
}

function tileCentres(
  count: number,
  seed: number,
  spread: number,
  zLow: number,
  zHigh: number,
): Float64Array[] {
  const next = rng(seed);
  return Array.from({ length: count }, () =>
    Float64Array.from([
      (next() * 2 - 1) * spread,
      (next() * 2 - 1) * spread,
      zLow + next() * (zHigh - zLow),
    ]),
  );
}

function exaggerationScenario(radius: number, bandTile = false): Scenario {
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
    verticalExaggerationEdge({ factor: 10, ceiling: 9000 }),
  );
  const content = graph.add(
    "content",
    ex,
    affine({ matrix: enu(8.5, 46.5, 0) }),
  );
  return {
    name: bandTile
      ? `a. ×10 exaggeration, ${radius / 1000} km tiles across the lift band`
      : `a. ×10 exaggeration, ${radius / 1000} km tiles`,
    route: routeBetween(content, world),
    centres: (n) =>
      bandTile
        ? tileCentres(n, 11, 20000, 8300, 8700)
        : tileCentres(n, 7, 30000, 0, 3000),
    radius,
    vertical: bandTile ? 800 : Math.min(radius, 1000),
    positionBudgetMm: 10,
    frames: 1,
  };
}

function utmScenario(
  radius: number,
  vertical: number,
  budgetMm: number,
  normals: "exact" | "linear" = "exact",
): Scenario {
  const graph = new TransformGraph();
  const world = graph.root("utm");
  const geo = graph.add("geo", world, utm({ zone: 31 }));
  const earth = graph.add("earth", geo, geocentricToGeographic());
  const ex = graph.add(
    "ex",
    earth,
    verticalExaggerationEdge({ factor: 3, ceiling: 9000 }),
  );
  const content = graph.add("content", ex, affine({ matrix: enu(5, 46, 0) }));
  return {
    name: `b. UTM 31 · geographic · ×3 exaggeration, ${radius / 1000} km tiles${normals === "linear" ? ", linear normals" : ""}`,
    route: routeBetween(content, world),
    centres: (n) => tileCentres(n, 3, 30000, 0, 3000),
    radius,
    vertical,
    positionBudgetMm: budgetMm,
    frames: 1,
    normals,
  };
}

function twistScenario(): Scenario {
  const graph = new TransformGraph();
  const world = graph.root("world");
  const view = graph.add(
    "view",
    world,
    affine({ matrix: rigid(0.3, [6378137.25, 12345.678, -9876.5]) }),
  );
  const tw = graph.add("tw", view, twist({ rate: 0.001 }));
  const content = graph.add(
    "content",
    tw,
    affine({ matrix: rigid(0, [0, 0, 0]) }),
  );
  return {
    name: "c. twist, a rate that changes every frame",
    route: routeBetween(content, world),
    centres: (n) => tileCentres(n, 5, 3000, -1000, 3000),
    radius: 1000,
    vertical: 1000,
    positionBudgetMm: 1,
    frames: 5,
    frame(k) {
      graph.setParams(tw, { rate: 0.0006 + 0.0004 * Math.sin(1.3 * k) });
    },
  };
}

function lensScenario(): Scenario {
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
    affine({ matrix: rigid(0.2, [3, -2, 60]) }),
  );
  return {
    name: "d. radial lens distortion on a camera branch",
    route: routeBetween(content, world),
    centres: (n) => tileCentres(n, 9, 40, -20, 20),
    radius: 10,
    vertical: 10,
    positionBudgetMm: 1,
    frames: 1,
  };
}

interface Gpu {
  device: GPUDevice;
  adapter: GPUAdapter;
  timestamps: boolean;
}

async function openGpu(): Promise<Gpu> {
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    throw new Error("no WebGPU adapter");
  }
  const timestamps = adapter.features.has("timestamp-query");
  const device = await adapter.requestDevice({
    requiredFeatures: timestamps ? ["timestamp-query"] : [],
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
      "[transformGraph] GPU error:",
      (e as GPUUncapturedErrorEvent).error.message,
    ),
  );
  return { device, adapter, timestamps };
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
): Promise<Float32Array> {
  const staging = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(source, 0, staging, 0, bytes);
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(staging.getMappedRange().slice(0));
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
    const shown = errors
      .slice(0, 5)
      .map(
        (m) =>
          `${m.lineNum}:${m.linePos} ${m.message}\n    ${(lines[m.lineNum - 1] ?? "").slice(0, 200)}`,
      );
    throw new Error(`${label}: WGSL errors\n${shown.join("\n")}`);
  }
  return module;
}

const KERNEL = `
@group(0) @binding(0) var<uniform> u: RouteUniforms;
@group(0) @binding(1) var<storage, read> draws: array<DrawCentre>;
@group(0) @binding(2) var<storage, read> verts: array<vec4f>;
@group(0) @binding(3) var<storage, read> nrms: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> outP: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> outN: array<vec4f>;

@compute @workgroup_size(64)
fn pointsMain(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= arrayLength(&verts)) {
    return;
  }
  let v = verts[i];
  outP[i] = vec4f(transformPoint(v.xyz, draws[bitcast<u32>(v.w)], u), 0.0);
}
`;

const KERNEL_NORMALS = `
@compute @workgroup_size(64)
fn vertexMain(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= arrayLength(&verts)) {
    return;
  }
  let v = verts[i];
  let r = transformVertex(v.xyz, nrms[i].xyz, draws[bitcast<u32>(v.w)], u);
  outP[i] = vec4f(r.position, 0.0);
  outN[i] = vec4f(r.normal, 0.0);
}
`;

interface Pipelines {
  layout: GPUBindGroupLayout;
  points: GPUComputePipeline;
  vertex: GPUComputePipeline | undefined;
  centre: GPUComputePipeline | undefined;
  centreLayout: GPUBindGroupLayout;
}

const pipelineCache = new Map<string, Pipelines>();

async function makePipelines(
  device: GPUDevice,
  compiled: CompiledRoute,
  label: string,
): Promise<Pipelines> {
  const cached = pipelineCache.get(compiled.key);
  if (cached) {
    return cached;
  }
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
      entry(3, "read-only-storage"),
      entry(4, "storage"),
      entry(5, "storage"),
    ],
  });
  const hasNormals = compiled.wgsl.includes("fn transformVertex");
  const module = await compileModule(
    device,
    compiled.wgsl + KERNEL + (hasNormals ? KERNEL_NORMALS : ""),
    label,
  );
  const make = (
    m: GPUShaderModule,
    l: GPUBindGroupLayout,
    entryPoint: string,
  ) =>
    device.createComputePipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [l] }),
      compute: { module: m, entryPoint },
    });
  const centreLayout = device.createBindGroupLayout({
    entries: [
      entry(0, "uniform"),
      entry(1, "read-only-storage"),
      entry(2, "storage"),
    ],
  });
  // A route with linear normals has per-draw CPU data and no compute pass.
  const centreModule = compiled.centreConstantsWgsl
    ? await compileModule(
        device,
        compiled.centreConstantsWgsl,
        `${label} centres`,
      )
    : undefined;
  const [points, vertex, centre] = await Promise.all([
    make(module, layout, "pointsMain"),
    hasNormals
      ? make(module, layout, "vertexMain")
      : Promise.resolve(undefined),
    centreModule
      ? make(centreModule, centreLayout, "centreConstants")
      : Promise.resolve(undefined),
  ]);
  const made = { layout, points, vertex, centre, centreLayout };
  pipelineCache.set(compiled.key, made);
  return made;
}

interface Samples {
  /** xyz offset, then the draw index as float bits. */
  verts: Float32Array;
  normals: Float32Array;
  count: number;
  /** Local points and unit normals in float64, for the truth. */
  local: Float64Array | undefined;
  unit: Float64Array | undefined;
}

function sampleVertices(
  centres: readonly Float64Array[],
  perDraw: number,
  radius: number,
  vertical: number,
  seed: number,
  truth: boolean,
): Samples {
  const next = rng(seed);
  const count = centres.length * perDraw;
  const verts = new Float32Array(4 * count);
  const bits = new Uint32Array(verts.buffer);
  const normals = new Float32Array(4 * count);
  const local = truth ? new Float64Array(3 * count) : undefined;
  const unit = truth ? new Float64Array(3 * count) : undefined;
  let i = 0;
  centres.forEach((c, d) => {
    for (let k = 0; k < perDraw; k++, i++) {
      let x: number;
      let y: number;
      do {
        x = next() * 2 - 1;
        y = next() * 2 - 1;
      } while (x * x + y * y > 1);
      const delta = [x * radius, y * radius, (next() * 2 - 1) * vertical].map(
        Math.fround,
      );
      verts.set(delta, 4 * i);
      bits[4 * i + 3] = d;
      let nx: number;
      let ny: number;
      let nz: number;
      let l: number;
      do {
        nx = next() * 2 - 1;
        ny = next() * 2 - 1;
        nz = next() * 2 - 1;
        l = Math.hypot(nx, ny, nz);
      } while (l > 1 || l < 0.2);
      const nn = [nx / l, ny / l, nz / l].map(Math.fround);
      normals.set(nn, 4 * i);
      if (local && unit) {
        for (let a = 0; a < 3; a++) {
          local[3 * i + a] = c[a]! + delta[a]!;
          unit[3 * i + a] = nn[a]!;
        }
      }
    }
  });
  return { verts, normals, count, local, unit };
}

/** The unit normal of a surface with normal `n` through the map with column-major Jacobian `j`. */
function cofactorNormal(j: Float64Array, n: ArrayLike<number>): number[] {
  const col = (c: number) => [j[3 * c]!, j[3 * c + 1]!, j[3 * c + 2]!];
  const cross = (a: number[], b: number[]) => [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
  const cof = [
    cross(col(1), col(2)),
    cross(col(2), col(0)),
    cross(col(0), col(1)),
  ];
  const out = [0, 1, 2].map(
    (r) => cof[0]![r]! * n[0]! + cof[1]![r]! * n[1]! + cof[2]![r]! * n[2]!,
  );
  const l = Math.hypot(out[0]!, out[1]!, out[2]!);
  return out.map((v) => v / l);
}

interface Errors {
  positionMm: number;
  normalDeg: number;
}

/** The GPU's vertices against float64, each draw with its own eye (its centre's image). */
async function measure(
  gpu: Gpu,
  pipes: Pipelines,
  compiled: CompiledRoute,
  route: Route,
  centres: readonly Float64Array[],
  samples: Samples,
  perDraw: number,
  records: Float32Array,
): Promise<Errors> {
  const { device } = gpu;
  const uniformsBuffer = device.createBuffer({
    size: compiled.uniformsLayout.floats * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const recordBuffer = upload(device, records, GPUBufferUsage.STORAGE);
  const vertBuffer = upload(device, samples.verts, GPUBufferUsage.STORAGE);
  const normalBuffer = upload(device, samples.normals, GPUBufferUsage.STORAGE);
  const bytes = samples.count * 16;
  const outP = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const outN = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const buffers = [
    uniformsBuffer,
    recordBuffer,
    vertBuffer,
    normalBuffer,
    outP,
    outN,
  ];
  const group = device.createBindGroup({
    layout: pipes.layout,
    entries: buffers.map((buffer, binding) => ({
      binding,
      resource: { buffer },
    })),
  });
  let positionMm = 0;
  let normalDeg = 0;
  const jac = new Float64Array(9);
  const truth = new Float64Array(3);
  const eye = new Float64Array(3);
  const uniforms = new Float32Array(compiled.uniformsLayout.floats);
  for (let d = 0; d < centres.length; d++) {
    route.forward(centres[d]!, eye);
    compiled.fillUniforms(route, uniforms, eye);
    device.queue.writeBuffer(uniformsBuffer, 0, uniforms);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipes.vertex!);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(samples.count / 64));
    pass.end();
    device.queue.submit([encoder.finish()]);
    const got = await read(device, outP, bytes);
    const gotN = await read(device, outN, bytes);
    for (let k = 0; k < perDraw; k++) {
      const i = d * perDraw + k;
      const p = samples.local!.subarray(3 * i, 3 * i + 3);
      route.forward(p, truth);
      let e = 0;
      for (let a = 0; a < 3; a++) {
        e = Math.max(e, Math.abs(got[4 * i + a]! - (truth[a]! - eye[a]!)));
      }
      positionMm = Math.max(positionMm, e * 1000);
      route.jacobian(p, jac);
      const want = cofactorNormal(
        jac,
        samples.unit!.subarray(3 * i, 3 * i + 3),
      );
      const g = [gotN[4 * i]!, gotN[4 * i + 1]!, gotN[4 * i + 2]!];
      const dot = want[0]! * g[0]! + want[1]! * g[1]! + want[2]! * g[2]!;
      const cx = [
        want[1]! * g[2]! - want[2]! * g[1]!,
        want[2]! * g[0]! - want[0]! * g[2]!,
        want[0]! * g[1]! - want[1]! * g[0]!,
      ];
      normalDeg = Math.max(
        normalDeg,
        Math.atan2(Math.hypot(cx[0]!, cx[1]!, cx[2]!), dot) / RAD,
      );
    }
  }
  for (const b of buffers) {
    b.destroy();
  }
  return { positionMm, normalDeg };
}

function cpuRecords(
  compiled: CompiledRoute,
  route: Route,
  centres: readonly Float64Array[],
  values?: ParamRecord,
): Float32Array {
  const stride = compiled.perDrawLayout.floats;
  const records = new Float32Array(stride * centres.length);
  centres.forEach((c, d) => {
    compiled.centreConstants(
      c,
      values,
      route,
      records.subarray(d * stride, (d + 1) * stride),
    );
  });
  return records;
}

interface Timing {
  gpuMs: number;
  wallMs: number;
}

/** Times `encode`: `iterations` in one submit, GPU timestamps when there are any. */
async function timeEncodes(
  gpu: Gpu,
  encode: (
    encoder: GPUCommandEncoder,
    stamps: GPUComputePassTimestampWrites | undefined,
  ) => void,
  iterations = 10,
): Promise<Timing> {
  const { device } = gpu;
  const warm = device.createCommandEncoder();
  encode(warm, undefined);
  device.queue.submit([warm.finish()]);
  await device.queue.onSubmittedWorkDone();
  const queries = gpu.timestamps
    ? device.createQuerySet({ type: "timestamp", count: 2 * iterations })
    : undefined;
  const encoder = device.createCommandEncoder();
  for (let i = 0; i < iterations; i++) {
    encode(
      encoder,
      queries && {
        querySet: queries,
        beginningOfPassWriteIndex: 2 * i,
        endOfPassWriteIndex: 2 * i + 1,
      },
    );
  }
  let resolve: GPUBuffer | undefined;
  let staging: GPUBuffer | undefined;
  if (queries) {
    resolve = device.createBuffer({
      size: 16 * iterations,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
    });
    staging = device.createBuffer({
      size: 16 * iterations,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    encoder.resolveQuerySet(queries, 0, 2 * iterations, resolve, 0);
    encoder.copyBufferToBuffer(resolve, 0, staging, 0, 16 * iterations);
  }
  const t0 = performance.now();
  device.queue.submit([encoder.finish()]);
  await device.queue.onSubmittedWorkDone();
  const wallMs = (performance.now() - t0) / iterations;
  let gpuMs = Number.NaN;
  if (staging) {
    await staging.mapAsync(GPUMapMode.READ);
    const t = new BigUint64Array(staging.getMappedRange().slice(0));
    staging.unmap();
    const durations: number[] = [];
    for (let i = 0; i < iterations; i++) {
      durations.push(Number(t[2 * i + 1]! - t[2 * i]!) / 1e6);
    }
    durations.sort((a, b) => a - b);
    gpuMs = durations[Math.floor(iterations / 2)]!;
    staging.destroy();
    resolve!.destroy();
    queries!.destroy();
  }
  return { gpuMs, wallMs };
}

/** The df64 centre-constant pass over `centres`, with its buffers. */
class CentrePass {
  private readonly uniforms: GPUBuffer;
  private readonly centreBuffer: GPUBuffer;
  private readonly records: GPUBuffer;
  private readonly group: GPUBindGroup;
  private readonly bytes: number;

  constructor(
    private readonly gpu: Gpu,
    private readonly pipes: Pipelines,
    private readonly compiled: CompiledRoute,
    route: Route,
    private readonly centres: readonly Float64Array[],
  ) {
    const { device } = gpu;
    this.bytes = compiled.perDrawLayout.floats * 4 * centres.length;
    this.uniforms = device.createBuffer({
      size: compiled.centreUniforms(route, centres.length).byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.centreBuffer = upload(
      device,
      compiled.packCentres(centres),
      GPUBufferUsage.STORAGE,
    );
    this.records = device.createBuffer({
      size: this.bytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    this.group = device.createBindGroup({
      layout: pipes.centreLayout,
      entries: [this.uniforms, this.centreBuffer, this.records].map(
        (buffer, binding) => ({ binding, resource: { buffer } }),
      ),
    });
  }

  private encode(
    encoder: GPUCommandEncoder,
    stamps: GPUComputePassTimestampWrites | undefined,
  ) {
    const pass = encoder.beginComputePass(
      stamps ? { timestampWrites: stamps } : undefined,
    );
    pass.setPipeline(this.pipes.centre!);
    pass.setBindGroup(0, this.group);
    pass.dispatchWorkgroups(Math.ceil(this.centres.length / 64));
    pass.end();
  }

  private write(route: Route) {
    this.gpu.device.queue.writeBuffer(
      this.uniforms,
      0,
      this.compiled.centreUniforms(route, this.centres.length),
    );
  }

  async run(route: Route): Promise<Float32Array> {
    this.write(route);
    const encoder = this.gpu.device.createCommandEncoder();
    this.encode(encoder, undefined);
    this.gpu.device.queue.submit([encoder.finish()]);
    return read(this.gpu.device, this.records, this.bytes);
  }

  time(route: Route): Promise<Timing> {
    this.write(route);
    return timeEncodes(this.gpu, (e, s) => this.encode(e, s), 20);
  }

  destroy() {
    this.uniforms.destroy();
    this.centreBuffer.destroy();
    this.records.destroy();
  }
}

/** The worst difference between two record sets' route value at the centre (hi + lo), in mm. */
function centreMismatchMm(
  compiled: CompiledRoute,
  a: Float32Array,
  b: Float32Array,
): number {
  const stride = compiled.perDrawLayout.floats;
  const { outHi, outLo } = compiled.perDrawLayout.fields;
  let worst = 0;
  for (let d = 0; d < a.length / stride; d++) {
    for (let k = 0; k < 3; k++) {
      const at = d * stride;
      const va = a[at + outHi! + k]! + a[at + outLo! + k]!;
      const vb = b[at + outHi! + k]! + b[at + outLo! + k]!;
      worst = Math.max(worst, Math.abs(va - vb));
    }
  }
  return worst * 1000;
}

const fixed = (x: number, digits = 3) => Number(x.toFixed(digits));

async function accuracy(
  gpu: Gpu,
  scenario: Scenario,
  checks: Check[],
): Promise<void> {
  const compiled = compileRoute(scenario.route, {
    ...(scenario.normals !== undefined && { normals: scenario.normals }),
  });
  if (!compiled.ok) {
    throw new Error(`${scenario.name}: ${compiled.reason}`);
  }
  const pipes = await makePipelines(gpu.device, compiled, scenario.name);
  const centres = scenario.centres(12);
  const perDraw = 64;
  const samples = sampleVertices(
    centres,
    perDraw,
    scenario.radius,
    scenario.vertical,
    17,
    true,
  );
  const pass = pipes.centre
    ? new CentrePass(gpu, pipes, compiled, scenario.route, centres)
    : undefined;
  let cpu: Errors = { positionMm: 0, normalDeg: 0 };
  let df64: Errors = { positionMm: 0, normalDeg: 0 };
  let mismatch = 0;
  for (let k = 0; k < scenario.frames; k++) {
    scenario.frame?.(k);
    const cpuRec = cpuRecords(compiled, scenario.route, centres);
    const e = await measure(
      gpu,
      pipes,
      compiled,
      scenario.route,
      centres,
      samples,
      perDraw,
      cpuRec,
    );
    cpu = {
      positionMm: Math.max(cpu.positionMm, e.positionMm),
      normalDeg: Math.max(cpu.normalDeg, e.normalDeg),
    };
    if (!pass) {
      continue;
    }
    const gpuRec = await pass.run(scenario.route);
    const f = await measure(
      gpu,
      pipes,
      compiled,
      scenario.route,
      centres,
      samples,
      perDraw,
      gpuRec,
    );
    df64 = {
      positionMm: Math.max(df64.positionMm, f.positionMm),
      normalDeg: Math.max(df64.normalDeg, f.normalDeg),
    };
    mismatch = Math.max(mismatch, centreMismatchMm(compiled, cpuRec, gpuRec));
  }
  pass?.destroy();
  const budget = scenario.positionBudgetMm;
  checks.push({
    name: `${scenario.name}: float64 centre constants`,
    measured: {
      maxPositionMm: fixed(cpu.positionMm),
      budgetMm: budget,
      maxNormalDeg: fixed(cpu.normalDeg, 6),
      normals: compiled.normalModes.join(","),
      dynamic: compiled.dynamicParams.length,
      separable: compiled.separableParams.join(",") || "-",
    },
    pass: cpu.positionMm <= budget && cpu.normalDeg <= 0.1,
  });
  if (!pass) {
    return;
  }
  checks.push({
    name: `${scenario.name}: df64 GPU centre constants`,
    measured: {
      maxPositionMm: fixed(df64.positionMm),
      budgetMm: budget,
      maxNormalDeg: fixed(df64.normalDeg, 6),
      centreMismatchMm: fixed(mismatch, 4),
      frames: scenario.frames,
    },
    pass: df64.positionMm <= budget && df64.normalDeg <= 0.1,
  });
}

async function timings(
  gpu: Gpu,
  scenario: Scenario,
  checks: Check[],
): Promise<void> {
  const { device } = gpu;
  const compiled = compileRoute(scenario.route, {
    ...(scenario.normals !== undefined && { normals: scenario.normals }),
  });
  if (!compiled.ok) {
    throw new Error(compiled.reason);
  }
  const pipes = await makePipelines(device, compiled, scenario.name);
  const draws = 1024;
  const perDraw = 1024;
  const centres = scenario.centres(draws);
  scenario.frame?.(1);
  const t0 = performance.now();
  const records = cpuRecords(compiled, scenario.route, centres);
  const cpuMs = performance.now() - t0;
  const samples = sampleVertices(
    centres,
    perDraw,
    scenario.radius,
    scenario.vertical,
    23,
    false,
  );
  const uniforms = device.createBuffer({
    size: compiled.uniformsLayout.floats * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    uniforms,
    0,
    compiled.fillUniforms(
      scenario.route,
      undefined,
      scenario.route.forward(centres[0]!),
    ),
  );
  const recordBuffer = upload(device, records, GPUBufferUsage.STORAGE);
  const vertBuffer = upload(device, samples.verts, GPUBufferUsage.STORAGE);
  const normalBuffer = upload(device, samples.normals, GPUBufferUsage.STORAGE);
  const bytes = samples.count * 16;
  const out = [0, 1].map(() =>
    device.createBuffer({
      size: bytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    }),
  );
  const group = device.createBindGroup({
    layout: pipes.layout,
    entries: [
      uniforms,
      recordBuffer,
      vertBuffer,
      normalBuffer,
      out[0]!,
      out[1]!,
    ].map((buffer, binding) => ({ binding, resource: { buffer } })),
  });
  const run = (pipeline: GPUComputePipeline) =>
    timeEncodes(gpu, (encoder, stamps) => {
      const pass = encoder.beginComputePass(
        stamps ? { timestampWrites: stamps } : undefined,
      );
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(Math.ceil(samples.count / 64));
      pass.end();
    });
  const points = await run(pipes.points);
  const vertex = pipes.vertex
    ? await run(pipes.vertex)
    : { gpuMs: Number.NaN, wallMs: Number.NaN };
  const centrePass = pipes.centre
    ? new CentrePass(gpu, pipes, compiled, scenario.route, centres)
    : undefined;
  const centre = centrePass
    ? await centrePass.time(scenario.route)
    : { gpuMs: Number.NaN, wallMs: Number.NaN };
  centrePass?.destroy();
  for (const b of [uniforms, recordBuffer, vertBuffer, normalBuffer, ...out]) {
    b.destroy();
  }
  checks.push({
    name: `${scenario.name}: timing, 1M vertices in ${draws} draws`,
    measured: {
      transformPointMs: fixed(points.gpuMs),
      transformPointWallMs: fixed(points.wallMs),
      transformVertexMs: fixed(vertex.gpuMs),
      centrePass1024Ms: fixed(centre.gpuMs, 4),
      centrePass1024WallMs: fixed(centre.wallMs, 4),
      cpuCentres1024Ms: fixed(cpuMs, 1),
      wgslKB: fixed(compiled.wgsl.length / 1024, 1),
      perDrawFloats: compiled.perDrawLayout.floats,
    },
    pass: true,
  });
}

type Mat3 = number[];

// Column-major 3×3s.
const rotX = (a: number): Mat3 => [
  1,
  0,
  0,
  0,
  Math.cos(a),
  Math.sin(a),
  0,
  -Math.sin(a),
  Math.cos(a),
];
const rotY = (a: number): Mat3 => [
  Math.cos(a),
  0,
  -Math.sin(a),
  0,
  1,
  0,
  Math.sin(a),
  0,
  Math.cos(a),
];
const rotZ = (a: number): Mat3 => [
  Math.cos(a),
  Math.sin(a),
  0,
  -Math.sin(a),
  Math.cos(a),
  0,
  0,
  0,
  1,
];

function mul3(a: ArrayLike<number>, b: ArrayLike<number>): Mat3 {
  const out: Mat3 = new Array(9).fill(0);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 3; k++) {
        out[3 * c + r]! += a[3 * k + r]! * b[3 * c + k]!;
      }
    }
  }
  return out;
}

function inv3(m: ArrayLike<number>): Mat3 {
  const col = (c: number) => [m[3 * c]!, m[3 * c + 1]!, m[3 * c + 2]!];
  const cross = (a: number[], b: number[]) => [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
  const [a, b, c] = [col(0), col(1), col(2)] as [number[], number[], number[]];
  const r0 = cross(b, c);
  const r1 = cross(c, a);
  const r2 = cross(a, b);
  const det = a[0]! * r0[0]! + a[1]! * r0[1]! + a[2]! * r0[2]!;
  // The rows of the inverse are the cross products over the determinant.
  const out: Mat3 = new Array(9);
  [r0, r1, r2].forEach((row, r) => {
    for (let c2 = 0; c2 < 3; c2++) {
      out[3 * c2 + r] = row[c2]! / det;
    }
  });
  return out;
}

const GLUE_STUBS = `
struct RoutedVertex {
  routed: bool,
  position: vec3f,
  displacement: vec3f,
  jx: vec3f,
  jy: vec3f,
  jz: vec3f,
}
@group(0) @binding(0) var<storage, read> rows: array<vec4f>;
@group(0) @binding(1) var<storage, read> verts: array<vec4f>;
@group(0) @binding(2) var<storage, read> frame: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> outP: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> outJ: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> outD: array<vec4f>;
fn routeRow(row: u32) -> vec4f { return rows[row]; }
fn routeEyeHi() -> vec3f { return frame[0].xyz; }
fn routeEyeLo() -> vec3f { return frame[1].xyz; }
fn routeAxisRow(i: u32) -> vec3f { return frame[2u + i].xyz; }
fn routeViewBit() -> u32 { return 1u; }
`;

const GLUE_KERNEL = `
@compute @workgroup_size(64)
fn glueMain(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  if (i >= arrayLength(&verts)) {
    return;
  }
  let v = verts[i];
  let at = bitcast<u32>(v.w);
  let body = at + ${ROUTE_BODY}u;
  let m0 = rows[body + 1u].xyz;
  let m1 = rows[body + 2u].xyz;
  let m2 = rows[body + 3u].xyz;
  let truePosition = m0 * v.x + m1 * v.y + m2 * v.z;
  let r = routeVertex(at, v.xyz, truePosition, m0, m1, m2);
  outP[i] = vec4f(r.position, f32(r.routed));
  outJ[3u * i] = vec4f(r.jx, 0.0);
  outJ[3u * i + 1u] = vec4f(r.jy, 0.0);
  outJ[3u * i + 2u] = vec4f(r.jz, 0.0);
  outD[i] = vec4f(r.displacement, 0.0);
}
`;

/**
 * The renderer's glue (scene/routeVariant.ts `routeUnitWgsl`) on the GPU: a
 * draw's block packed as the world packs it (scene/world/routes.ts), the
 * route evaluated through `routeVertex` with a stand-in view (an eye, the
 * shading axes), against float64: position, the model-space displacement and
 * the model-space Jacobian, from which the normal.
 */
async function glue(
  gpu: Gpu,
  scenario: Scenario,
  checks: Check[],
): Promise<void> {
  const { device } = gpu;
  const compiled = compileRoute(scenario.route, {
    normals: scenario.normals ?? "exact",
    centreRows: true,
  });
  if (!compiled.ok) {
    throw new Error(`${scenario.name}: ${compiled.reason}`);
  }
  const route = scenario.route;
  const module = await compileModule(
    device,
    GLUE_STUBS + routeUnitWgsl(compiled) + GLUE_KERNEL,
    `${scenario.name} glue`,
  );
  const layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ],
  });
  const pipeline = await device.createComputePipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
    compute: { module, entryPoint: "glueMain" },
  });

  // A linear part with rotation and a scale, the shading axes a rotation.
  const L = mul3(mul3(rotZ(0.7), rotX(0.3)), [1.7, 0, 0, 0, 1.7, 0, 0, 0, 1.7]);
  const Linv = inv3(L);
  const R = mul3(rotZ(-0.4), rotY(0.5));
  const centres = scenario.centres(8);
  const perDraw = 48;
  const uniformRows = compiled.uniformsLayout.floats / 4;
  const blockRows = routeBlockRows(compiled);
  // The uniforms, the pointer table (every view id at row 0: its zeros) and the draws' blocks.
  const rowWords = new ArrayBuffer(
    (uniformRows + ROUTE_POINTER_ROWS + blockRows * centres.length) * 16,
  );
  const f32 = new Float32Array(rowWords);
  const u32 = new Uint32Array(rowWords);
  const next = rng(5);
  const samples = sampleVertices(
    centres,
    perDraw,
    scenario.radius,
    scenario.vertical,
    31,
    true,
  );
  // Model-space positions: the draw's centre in model space plus the sample's offset in the model.
  const modelCentres = centres.map((c, d) => {
    const cm = Float64Array.of(
      Math.fround((next() * 2 - 1) * 100),
      Math.fround((next() * 2 - 1) * 100),
      Math.fround((next() * 2 - 1) * 100),
    );
    const lc = [0, 1, 2].map(
      (r) => L[r]! * cm[0]! + L[3 + r]! * cm[1]! + L[6 + r]! * cm[2]!,
    );
    const t = [0, 1, 2].map((a) => c[a]! - lc[a]!);
    return { cm, t, d };
  });
  const verts = new Float32Array(4 * samples.count);
  const vbits = new Uint32Array(verts.buffer);
  const anchorPoints = new Float64Array(3 * samples.count);
  modelCentres.forEach(({ cm, t, d }) => {
    const at = uniformRows + ROUTE_POINTER_ROWS + d * blockRows;
    const base = at * 4;
    u32[base] = 1;
    u32[base + 4] = ROUTE_KIND;
    f32[base + 5] = 1;
    u32[base + 6] = ROUTE_BODY;
    u32[base + 7] = uniformRows;
    const body = base + ROUTE_BODY * 4;
    for (let a = 0; a < 3; a++) {
      f32[body + a] = cm[a]!;
    }
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        f32[body + 4 + 4 * c + r] = L[3 * c + r]!;
      }
    }
    const start = base + (ROUTE_BODY + ROUTE_OWN_ROWS) * 4;
    const anchorCentre = Float64Array.of(
      L[0]! * cm[0]! + L[3]! * cm[1]! + L[6]! * cm[2]! + t[0]!,
      L[1]! * cm[0]! + L[4]! * cm[1]! + L[7]! * cm[2]! + t[1]!,
      L[2]! * cm[0]! + L[5]! * cm[1]! + L[8]! * cm[2]! + t[2]!,
    );
    compiled.centreConstants(
      anchorCentre,
      undefined,
      route,
      f32.subarray(start, start + compiled.perDrawLayout.floats),
    );
    for (let k = 0; k < perDraw; k++) {
      const i = d * perDraw + k;
      // The sample's offset (anchor units) becomes a model-space offset.
      const off = [0, 1, 2].map(
        (a) => samples.local![3 * i + a]! - centres[d]![a]!,
      );
      const lo = [0, 1, 2].map(
        (r) =>
          Linv[r]! * off[0]! + Linv[3 + r]! * off[1]! + Linv[6 + r]! * off[2]!,
      );
      for (let a = 0; a < 3; a++) {
        verts[4 * i + a] = Math.fround(cm[a]! + lo[a]!);
      }
      vbits[4 * i + 3] = at;
      const pm = [verts[4 * i]!, verts[4 * i + 1]!, verts[4 * i + 2]!];
      for (let a = 0; a < 3; a++) {
        anchorPoints[3 * i + a] =
          L[a]! * pm[0]! + L[3 + a]! * pm[1]! + L[6 + a]! * pm[2]! + t[a]!;
      }
    }
  });

  const rowBuffer = upload(
    device,
    new Uint8Array(rowWords),
    GPUBufferUsage.STORAGE,
  );
  const vertBuffer = upload(device, verts, GPUBufferUsage.STORAGE);
  const frameBuffer = device.createBuffer({
    size: 5 * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const bytes = samples.count * 16;
  const make = (size: number) =>
    device.createBuffer({
      size,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
  const outP = make(bytes);
  const outJ = make(bytes * 3);
  const outD = make(bytes);
  const group = device.createBindGroup({
    layout,
    entries: [rowBuffer, vertBuffer, frameBuffer, outP, outJ, outD].map(
      (buffer, binding) => ({ binding, resource: { buffer } }),
    ),
  });

  const eye = new Float64Array(3);
  const truth = new Float64Array(3);
  const jac = new Float64Array(9);
  const uniforms = new Float32Array(compiled.uniformsLayout.floats);
  let positionMm = 0;
  let displacementMm = 0;
  let jacobianRel = 0;
  let normalDeg = 0;
  let unrouted = 0;
  for (let d = 0; d < centres.length; d++) {
    route.forward(centres[d]!, eye);
    compiled.fillUniforms(route, uniforms, eye);
    device.queue.writeBuffer(rowBuffer, 0, uniforms);
    const frame = new Float32Array(20);
    for (let a = 0; a < 3; a++) {
      frame[a] = Math.fround(eye[a]!);
      frame[4 + a] = Math.fround(eye[a]! - frame[a]!);
    }
    for (let i = 0; i < 3; i++) {
      for (let a = 0; a < 3; a++) {
        frame[8 + 4 * i + a] = R[3 * a + i]!;
      }
    }
    device.queue.writeBuffer(frameBuffer, 0, frame);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(samples.count / 64));
    pass.end();
    device.queue.submit([encoder.finish()]);
    const gotP = await read(device, outP, bytes);
    const gotJ = await read(device, outJ, bytes * 3);
    const gotD = await read(device, outD, bytes);
    for (let k = 0; k < perDraw; k++) {
      const i = d * perDraw + k;
      if (gotP[4 * i + 3] !== 1) {
        unrouted++;
        continue;
      }
      const p = anchorPoints.subarray(3 * i, 3 * i + 3);
      route.forward(p, truth);
      const rel = [0, 1, 2].map((a) => truth[a]! - eye[a]!);
      const world = [0, 1, 2].map(
        (r) => R[r]! * rel[0]! + R[3 + r]! * rel[1]! + R[6 + r]! * rel[2]!,
      );
      for (let a = 0; a < 3; a++) {
        positionMm = Math.max(
          positionMm,
          Math.abs(gotP[4 * i + a]! - world[a]!) * 1000,
        );
      }
      // The displacement: the shading-axes offset from the design position (L·p), back in model space.
      const pm = [verts[4 * i]!, verts[4 * i + 1]!, verts[4 * i + 2]!];
      const trueRel = [0, 1, 2].map(
        (r) => L[r]! * pm[0]! + L[3 + r]! * pm[1]! + L[6 + r]! * pm[2]!,
      );
      const dm = [0, 1, 2].map(
        (r) =>
          Linv[r]! * (world[0]! - trueRel[0]!) +
          Linv[3 + r]! * (world[1]! - trueRel[1]!) +
          Linv[6 + r]! * (world[2]! - trueRel[2]!),
      );
      for (let a = 0; a < 3; a++) {
        displacementMm = Math.max(
          displacementMm,
          (Math.abs(gotD[4 * i + a]! - dm[a]!) * 1000) /
            Math.max(1, Math.abs(dm[a]!) / 1e5),
        );
      }
      route.jacobian(p, jac);
      const want = mul3(Linv, mul3(R, mul3(jac, L)));
      const got = Float64Array.from(
        { length: 9 },
        (_, n) => gotJ[12 * i + 4 * Math.floor(n / 3) + (n % 3)]!,
      );
      let scale = 0;
      for (const x of want) {
        scale = Math.max(scale, Math.abs(x));
      }
      for (let n = 0; n < 9; n++) {
        jacobianRel = Math.max(
          jacobianRel,
          Math.abs(got[n]! - want[n]!) / scale,
        );
      }
      const n = samples.unit!.subarray(3 * i, 3 * i + 3);
      const a = cofactorNormal(Float64Array.from(want), n);
      const b = cofactorNormal(got, n);
      const dot = a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
      const cx = [
        a[1]! * b[2]! - a[2]! * b[1]!,
        a[2]! * b[0]! - a[0]! * b[2]!,
        a[0]! * b[1]! - a[1]! * b[0]!,
      ];
      normalDeg = Math.max(
        normalDeg,
        Math.atan2(Math.hypot(cx[0]!, cx[1]!, cx[2]!), dot) / RAD,
      );
    }
  }
  for (const b of [rowBuffer, vertBuffer, frameBuffer, outP, outJ, outD]) {
    b.destroy();
  }
  checks.push({
    name: `${scenario.name}: renderer glue (routeVertex)`,
    measured: {
      maxPositionMm: fixed(positionMm),
      maxDisplacementMm: fixed(displacementMm),
      maxJacobianRel: Number(jacobianRel.toExponential(2)),
      maxNormalDeg: fixed(normalDeg, 6),
      normals: compiled.normalModes.join(","),
      unrouted,
    },
    pass:
      unrouted === 0 &&
      positionMm <= scenario.positionBudgetMm &&
      normalDeg <= 0.1,
  });
}

export async function runTransformGraph() {
  const gpu = await openGpu();
  const info = gpu.adapter.info;
  const checks: Check[] = [];
  const scenarios = [
    exaggerationScenario(1000),
    exaggerationScenario(2000),
    exaggerationScenario(8000),
    exaggerationScenario(2000, true),
    utmScenario(1000, 500, 1),
    utmScenario(2000, 1000, 2),
    utmScenario(1000, 500, 1, "linear"),
    twistScenario(),
    lensScenario(),
  ];
  for (const scenario of scenarios) {
    await accuracy(gpu, scenario, checks);
  }
  for (const scenario of [
    exaggerationScenario(1000),
    utmScenario(1000, 500, 1),
    utmScenario(1000, 500, 1, "linear"),
  ]) {
    await glue(gpu, scenario, checks);
  }
  for (const scenario of [
    exaggerationScenario(8000),
    utmScenario(1000, 500, 1),
    utmScenario(1000, 500, 1, "linear"),
    twistScenario(),
    lensScenario(),
  ]) {
    await timings(gpu, scenario, checks);
  }
  return {
    adapter: `${info.vendor} ${info.architecture} ${info.description}`.trim(),
    checks,
  };
}

export const harness: Harness = {
  mount(root) {
    root.innerHTML = TEMPLATE;
    return { run: runTransformGraph };
  },
};
