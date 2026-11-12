// The transform graph's compiler on the GPU (plan 2026-11-12, task 4a): routes
// compiled to WGSL (`src/transform/compile.ts`) run over sample vertices and
// compared with the float64 route (`route.forward`, `route.jacobian`).
// Cases:
//  a. affine · verticalExaggeration ×10 · affine, tiles of 1, 2 and 8 km at
//     the Earth's radius (and a tile across the lift's blend band);
//  b. UTM zone 31 above geographic above ×3 exaggeration (nested smooth steps);
//  c. a twist whose rate changes every frame: a dynamic parameter, the
//     centre constants recomputed per frame by the df64 compute pass;
//  d. Brown–Conrady lens distortion on a camera branch.
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
  verticalExaggeration,
} from "../src/georeference/index.ts";
import { Ellipsoid, cartographic } from "../src/math/ellipsoid.ts";
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
    verticalExaggeration({ factor: 10, ceiling: 9000 }),
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
): Scenario {
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
    name: `b. UTM 31 · geographic · ×3 exaggeration, ${radius / 1000} km tiles`,
    route: routeBetween(content, world),
    centres: (n) => tileCentres(n, 3, 30000, 0, 3000),
    radius,
    vertical,
    positionBudgetMm: budgetMm,
    frames: 1,
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
  centre: GPUComputePipeline;
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
  const centreModule = await compileModule(
    device,
    compiled.centreConstantsWgsl!,
    `${label} centres`,
  );
  const [points, vertex, centre] = await Promise.all([
    make(module, layout, "pointsMain"),
    hasNormals
      ? make(module, layout, "vertexMain")
      : Promise.resolve(undefined),
    make(centreModule, centreLayout, "centreConstants"),
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
    pass.setPipeline(this.pipes.centre);
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
  const compiled = compileRoute(scenario.route);
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
  const pass = new CentrePass(gpu, pipes, compiled, scenario.route, centres);
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
  pass.destroy();
  const budget = scenario.positionBudgetMm;
  checks.push({
    name: `${scenario.name}: float64 centre constants`,
    measured: {
      maxPositionMm: fixed(cpu.positionMm),
      budgetMm: budget,
      maxNormalDeg: fixed(cpu.normalDeg, 6),
      dynamic: compiled.dynamicParams.length,
      separable: compiled.separableParams.join(",") || "-",
    },
    pass: cpu.positionMm <= budget && cpu.normalDeg <= 0.1,
  });
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
  const compiled = compileRoute(scenario.route);
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
  const centrePass = new CentrePass(
    gpu,
    pipes,
    compiled,
    scenario.route,
    centres,
  );
  const centre = await centrePass.time(scenario.route);
  centrePass.destroy();
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
    twistScenario(),
    lensScenario(),
  ];
  for (const scenario of scenarios) {
    await accuracy(gpu, scenario, checks);
  }
  for (const scenario of [
    exaggerationScenario(8000),
    utmScenario(1000, 500, 1),
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
