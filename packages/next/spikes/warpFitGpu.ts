// The GPU-warp study (plan 13.26): can warps be fast enough to animate at 60
// fps? Two strategies, measured on this GPU against the CPU fit that is the
// engine's reference today (scene/warpFit.ts):
//
// A. fit on the GPU: a compute kernel (shaders/warpFitGpu.slang,
//    scene/warpFitGpu.ts) samples a closed-form warp at the lattice's control
//    points in double-float and writes the lattices in place. Throughput
//    against the CPU, accuracy against the CPU fit and float64 truth, and the
//    per-frame cost of refitting every visible tile to a warp whose shape
//    changes each frame (a height lift, a moving bump, a UTM projection).
// B. no fit: the vertex stage evaluates the closed form from per-draw
//    baked float32 polynomials of the height and normal, with the animated
//    parameters as a uniform (shaders/warpFitDirect.slang,
//    scene/warpDirect.ts). Accuracy, the bake's cost, the cost per vertex
//    against a fitted lattice's and against evaluating the form in df64 per
//    vertex, and per-frame cost while every parameter moves.
// C. a parameter that doesn't factor (a projection's central meridian): fit
//    the lattice at Chebyshev nodes of the parameter's range once and blend
//    the coefficients per frame. Accuracy against the exact map, by nodes.
//
// Run: node scripts/runSpike.mjs "http://127.0.0.1:5190/spikes/warpFitGpu.html?bench" runWarpFitGpu
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import warpFitDirectWgsl from "../src/shaders/generated/warpFitDirect.wgsl?raw";
import { Ellipsoid, cartographic } from "../src/math/ellipsoid.ts";
import {
  WGS84_RADII,
  formDisplacement,
  splitDf64,
  utmForm,
  type GpuWarpForm,
} from "../src/scene/warpForms.ts";
import {
  DIRECT_DRAW_ROWS,
  bakeHeightField,
  liftBoundOver,
  scaleAboutBoundOver,
} from "../src/scene/warpDirect.ts";
import { evaluateLattice, fitLatticeAt } from "../src/scene/warpFit.ts";
import {
  GpuWarpFitter,
  gpuLatticeRows,
  type GpuFitTile,
} from "../src/scene/warpFitGpu.ts";
import type { CubicLattice } from "../src/scene/warpTerms.ts";

const TEMPLATE = `
<h1>Warp fitting on the GPU</h1>
<p>
  A: a compute kernel fits lattices of closed-form warps in df64, against the
  CPU fit. B: the vertex stage evaluates the form from baked polynomials, no
  fit. C: blending fits across a parameter's range. Tiles over UTM zone 31.
</p>
<div class="status">Run to measure on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>`;

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const WGS84 = Ellipsoid.WGS84;
const RAD = Math.PI / 180;

function ecef(lon: number, lat: number, h: number): Float64Array {
  return WGS84.cartographicToCartesian(
    cartographic(lon * RAD, lat * RAD, h),
    new Float64Array(3),
  );
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface TileSpec {
  origin: Float64Array;
  scale: number;
}

/** Tiles of 0.5 to 8 km radius, 0 to 3 km up, in the Alps-to-Channel band of zone 31. */
function makeTiles(n: number, seed = 1): TileSpec[] {
  const next = rng(seed);
  return Array.from({ length: n }, () => ({
    origin: ecef(1 + next() * 4, 40 + next() * 10, next() * 3000),
    scale: Math.fround(500 * 16 ** next()),
  }));
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
      "[warpFitGpu] GPU error:",
      (e as GPUUncapturedErrorEvent).error.message,
    ),
  );
  return { device, adapter, timestamps };
}

function upload(
  device: GPUDevice,
  data: ArrayBufferView,
  usage: number = GPUBufferUsage.STORAGE,
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
  offset: number,
  bytes: number,
): Promise<ArrayBuffer> {
  const staging = device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(source, offset, staging, 0, bytes);
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync(GPUMapMode.READ);
  const out = staging.getMappedRange().slice(0);
  staging.unmap();
  staging.destroy();
  return out;
}

interface Timing {
  /** GPU time of the encoded pass, median, ms (NaN without timestamp-query). */
  gpuMs: number;
  /** Wall time per encode when many are queued back to back, ms. */
  pipelinedMs: number;
  /** Wall time of one encode submitted and waited for, ms: what a frame that waits pays. */
  latencyMs: number;
}

/** Times `encode` (called with a pass's timestamp writes): `iterations` queued in one submit, and singly. */
async function timeEncodes(
  gpu: Gpu,
  encode: (
    encoder: GPUCommandEncoder,
    timestamps: GPUComputePassTimestampWrites | undefined,
  ) => void,
  iterations = 20,
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
  const pipelinedMs = (performance.now() - t0) / iterations;
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
  let latency = 0;
  const single = 12;
  for (let i = 0; i < single; i++) {
    const e = device.createCommandEncoder();
    encode(e, undefined);
    const s = performance.now();
    device.queue.submit([e.finish()]);
    await device.queue.onSubmittedWorkDone();
    if (i >= 2) {
      latency += performance.now() - s;
    }
  }
  return { gpuMs, pipelinedMs, latencyMs: latency / (single - 2) };
}

/** A lattice from the rows the kernel wrote, absolute as the CPU's are. */
function latticeFromRows(
  rows: Float32Array,
  at: number,
  cells: number,
  tile: GpuFitTile,
): CubicLattice {
  const count = cells ** 3 * 20;
  const coefficients = new Float64Array(count * 3);
  const constant = [0, 1, 2].map(
    (a) => rows[(at + 1) * 4 + a]! + rows[(at + 2) * 4 + a]!,
  );
  for (let k = 0; k < count; k++) {
    for (let a = 0; a < 3; a++) {
      coefficients[3 * k + a] =
        rows[(at + 3 + k) * 4 + a]! + (k % 20 === 0 ? constant[a]! : 0);
    }
  }
  return {
    kind: "cubic",
    center: Array.from(tile.center),
    scale: tile.scale,
    cells,
    coefficients,
    errorBound: 0,
    estimate: true,
  };
}

/** The lattice as the placements buffer holds it: float32 rows, the constant (the value at the center) apart. */
function asStored(lattice: CubicLattice): CubicLattice {
  const constant = evaluateLattice(
    lattice,
    lattice.center,
    new Float64Array(3),
  );
  return {
    ...lattice,
    coefficients: lattice.coefficients.map((c, i) => {
      const axis = i % 3;
      return i < 60 * lattice.cells ** 3 && Math.floor(i / 3) % 20 === 0
        ? Math.fround(c - constant[axis]!) + constant[axis]!
        : Math.fround(c);
    }),
  };
}

function tilesFor(specs: readonly TileSpec[], cells: number): GpuFitTile[] {
  let row = 0;
  return specs.map((s) => {
    const tile: GpuFitTile = {
      center: [0, 0, 0],
      scale: s.scale,
      cells,
      bodyRow: row,
      origin: s.origin,
    };
    row += gpuLatticeRows(cells);
    return tile;
  });
}

function pointsIn(next: () => number, scale: number): Float64Array {
  for (;;) {
    const u = [next() * 2 - 1, next() * 2 - 1, next() * 2 - 1];
    if (u[0]! ** 2 + u[1]! ** 2 + u[2]! ** 2 <= 1) {
      return Float64Array.from(u, (x) => x * scale);
    }
  }
}

interface AccuracyResult {
  gpuVsCpuMm: number;
  gpuVsTruthMm: number;
  cpuVsTruthMm: number;
  cpuExactVsTruthMm: number;
  gpuErrorEstimateMm: number;
  cpuErrorBoundMm: number;
}

/** A GPU fit of `count` tiles against the CPU fit and the float64 truth, in mm. */
async function fitAccuracy(
  gpu: Gpu,
  fitter: GpuWarpFitter,
  form: GpuWarpForm,
  cells: number,
  specs: readonly TileSpec[],
): Promise<AccuracyResult> {
  const tiles = tilesFor(specs, cells);
  const rowsPer = gpuLatticeRows(cells);
  const target = gpu.device.createBuffer({
    size: tiles.length * rowsPer * 16,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  fitter.writeHeads(target, tiles);
  const batch = fitter.batch(tiles);
  const encoder = gpu.device.createCommandEncoder();
  fitter.encodeFit(encoder, batch, target, form, { check: true });
  gpu.device.queue.submit([encoder.finish()]);
  const rows = new Float32Array(
    await read(gpu.device, target, 0, tiles.length * rowsPer * 16),
  );
  const estimates = await fitter.readErrors(batch);
  const next = rng(5);
  const truth = new Float64Array(3);
  const a = new Float64Array(3);
  const b = new Float64Array(3);
  const e = new Float64Array(3);
  const result: AccuracyResult = {
    gpuVsCpuMm: 0,
    gpuVsTruthMm: 0,
    cpuVsTruthMm: 0,
    cpuExactVsTruthMm: 0,
    gpuErrorEstimateMm: 0,
    cpuErrorBoundMm: 0,
  };
  tiles.forEach((tile, i) => {
    const d = formDisplacement(form, tile.origin);
    const cpu = asStored(fitLatticeAt(d, tile, cells));
    const cpuExact = fitLatticeAt(d, tile, cells);
    const fitted = latticeFromRows(rows, tile.bodyRow, cells, tile);
    result.gpuErrorEstimateMm = Math.max(
      result.gpuErrorEstimateMm,
      estimates[i]! * 1000,
    );
    result.cpuErrorBoundMm = Math.max(
      result.cpuErrorBoundMm,
      cpu.errorBound * 1000,
    );
    for (let s = 0; s < 200; s++) {
      const m = pointsIn(next, tile.scale);
      d(m, truth);
      evaluateLattice(cpu, m, a);
      evaluateLattice(fitted, m, b);
      evaluateLattice(cpuExact, m, e);
      for (let c = 0; c < 3; c++) {
        result.gpuVsCpuMm = Math.max(
          result.gpuVsCpuMm,
          Math.abs(a[c]! - b[c]!) * 1000,
        );
        result.gpuVsTruthMm = Math.max(
          result.gpuVsTruthMm,
          Math.abs(truth[c]! - b[c]!) * 1000,
        );
        result.cpuVsTruthMm = Math.max(
          result.cpuVsTruthMm,
          Math.abs(truth[c]! - a[c]!) * 1000,
        );
        result.cpuExactVsTruthMm = Math.max(
          result.cpuExactVsTruthMm,
          Math.abs(truth[c]! - e[c]!) * 1000,
        );
      }
    }
  });
  batch.destroy();
  target.destroy();
  return result;
}

/** The forms a frame animates. */
function animated(t: number): Record<string, GpuWarpForm> {
  const c = ecef(3 + Math.sin(t) * 1.5, 45 + Math.cos(t * 0.7) * 3, 0);
  return {
    lift: {
      kind: "heightLift",
      factor: 1 + 4.5 * (1 + Math.sin(t * 2)),
      baseHeight: 100 * (1 + Math.cos(t)),
      offset: 20 * Math.sin(t * 3),
    },
    bump: { kind: "heightBump", center: c, amplitude: 400, sigma: 40_000 },
    scaleAbout: {
      kind: "scaleAbout",
      center: c,
      factors: [1 + 0.5 * Math.sin(t), 1.5, 1 - 0.3 * Math.cos(t)],
    },
    utm: {
      ...utmForm(31),
      centralMeridian: 3 + 0.5 * Math.sin(t),
    },
  };
}

const f = (x: number, digits = 3) => Number(x.toFixed(digits));

async function runWarpFitGpu() {
  const status = root.querySelector(".status")!;
  $("results").replaceChildren();
  status.textContent = "measuring…";
  const gpu = await openGpu();
  const { device } = gpu;
  const fitter = await GpuWarpFitter.create(device);
  const checks: Check[] = [];
  const add = (
    name: string,
    measured: Record<string, number>,
    limit: string,
    pass: boolean,
  ) => checks.push({ id: checks.length + 1, name, measured, limit, pass });
  const adapter = `${gpu.adapter.info.vendor} ${gpu.adapter.info.architecture} ${gpu.adapter.info.description}${gpu.timestamps ? "" : " (no timestamp-query)"}`;

  // A1. Accuracy of the GPU fit against the CPU fit.
  const lift: GpuWarpForm = {
    kind: "heightLift",
    factor: 10,
    baseHeight: 100,
    offset: 3,
  };
  const utm = utmForm(31);
  const accuracySpecs = makeTiles(24, 2);
  for (const cells of [1, 2, 4]) {
    for (const [name, form] of [
      ["height lift ×10", lift],
      ["UTM 31", utm],
    ] as const) {
      const r = await fitAccuracy(gpu, fitter, form, cells, accuracySpecs);
      add(
        `A: GPU fit vs CPU fit, ${name}, ${cells}³ cells, 24 tiles of 0.5 to 8 km`,
        {
          "GPU − CPU fit as stored (float32 rows), max mm": f(r.gpuVsCpuMm, 4),
          "GPU − truth, max mm": f(r.gpuVsTruthMm),
          "CPU as stored − truth, max mm": f(r.cpuVsTruthMm),
          "CPU float64 − truth, max mm": f(r.cpuExactVsTruthMm),
          "GPU residual estimate, max mm": f(r.gpuErrorEstimateMm),
          "CPU errorBound, max mm": f(r.cpuErrorBoundMm),
        },
        "GPU within 1.5 mm of the CPU fit as stored (float32 rows)",
        r.gpuVsCpuMm <= 1.5,
      );
    }
  }

  // A2. Throughput, CPU against GPU, the same lattices.
  const throughputSpecs = makeTiles(1024, 3);
  for (const cells of [1, 2, 4]) {
    for (const [name, form] of [
      ["height lift ×10", lift],
      ["UTM 31", utm],
    ] as const) {
      const cpuTiles = throughputSpecs.slice(0, name === "UTM 31" ? 12 : 24);
      const t0 = performance.now();
      for (const s of cpuTiles) {
        fitLatticeAt(
          formDisplacement(form, s.origin),
          { center: [0, 0, 0], scale: s.scale },
          cells,
        );
      }
      const cpuMs = performance.now() - t0;
      const cpuRate = (cpuTiles.length * cells ** 3) / cpuMs;
      const tiles = tilesFor(throughputSpecs, cells);
      const target = device.createBuffer({
        size: tiles.length * gpuLatticeRows(cells) * 16,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      fitter.writeHeads(target, tiles);
      const batch = fitter.batch(tiles);
      const fit = await timeEncodes(gpu, (e, ts) =>
        fitter.encodeFit(e, batch, target, form, ts && { timestampWrites: ts }),
      );
      const checked = await timeEncodes(gpu, (e) =>
        fitter.encodeFit(e, batch, target, form, { check: true }),
      );
      const gpuCells = batch.cellCount;
      const gpuRate =
        gpuCells / (Number.isNaN(fit.gpuMs) ? fit.pipelinedMs : fit.gpuMs);
      add(
        `A: throughput, ${name}, ${cells}³ cells, 1024 tiles (${gpuCells} cells)`,
        {
          "CPU fit incl. check, cells/ms": f(cpuRate),
          "GPU fit, ms (GPU time)": f(fit.gpuMs, 4),
          "GPU fit, ms (queued wall)": f(fit.pipelinedMs, 4),
          "GPU fit, ms (submit + wait)": f(fit.latencyMs, 4),
          "GPU fit + check, ms (queued wall)": f(checked.pipelinedMs, 4),
          "GPU fit, cells/ms": f(gpuRate, 1),
          "speedup, ×": f(gpuRate / cpuRate, 0),
        },
        "the GPU fits more cells per ms than the CPU, by 20×",
        gpuRate / cpuRate >= 20,
      );
      batch.destroy();
      target.destroy();
    }
  }

  // A3. Refitting every visible tile each frame to a warp whose shape changes.
  for (const cells of [1, 2]) {
    const tiles = tilesFor(throughputSpecs, cells);
    const target = device.createBuffer({
      size: tiles.length * gpuLatticeRows(cells) * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    fitter.writeHeads(target, tiles);
    const batch = fitter.batch(tiles);
    const measured: Record<string, number> = {};
    let worst = 0;
    let fewest = Infinity;
    for (const name of ["lift", "bump", "scaleAbout", "utm"] as const) {
      let frame = 0;
      const timing = await timeEncodes(
        gpu,
        (e, ts) => {
          frame++;
          fitter.encodeFit(
            e,
            batch,
            target,
            animated(frame * 0.05)[name]!,
            ts && { timestampWrites: ts },
          );
        },
        30,
      );
      const ms = Number.isNaN(timing.gpuMs) ? timing.pipelinedMs : timing.gpuMs;
      measured[
        `${name}: GPU ms per frame (1024 tiles, ${batch.cellCount} cells)`
      ] = f(ms, 4);
      measured[`${name}: cells refit within 2 ms`] = f(
        (2 * batch.cellCount) / ms,
        0,
      );
      worst = Math.max(worst, ms);
      fewest = Math.min(fewest, (2 * batch.cellCount) / ms);
      if (cells === 1) {
        // A real animation: each frame's parameters written, submitted and waited for.
        const frames = 90;
        const t0 = performance.now();
        for (let i = 0; i < frames; i++) {
          const e = device.createCommandEncoder();
          fitter.encodeFit(e, batch, target, animated(i * 0.05)[name]!);
          device.queue.submit([e.finish()]);
          await device.queue.onSubmittedWorkDone();
        }
        measured[`${name}: 90 animated frames, wall ms per frame`] = f(
          (performance.now() - t0) / frames,
          3,
        );
      }
    }
    add(
      `A: a refit of 1024 tiles at ${cells}³ cells every frame, shape changing`,
      measured,
      cells === 1
        ? "each within 2 ms of GPU time"
        : "at least 1024 cells (a cell a tile) refit within 2 ms, for each form",
      cells === 1 ? worst <= 2 : fewest >= 1024,
    );
    batch.destroy();
    target.destroy();
  }

  // B. Direct evaluation in the vertex stage.
  const V = 1 << 20;
  const DRAWS = 1024;
  const specs = throughputSpecs.slice(0, DRAWS);
  const bakeRows = new Float32Array(DRAWS * DIRECT_DRAW_ROWS * 4);
  const tBake = performance.now();
  specs.forEach((s, i) => {
    bakeHeightField(
      WGS84_RADII,
      s.origin,
      [0, 0, 0],
      s.scale,
      bakeRows,
      i * DIRECT_DRAW_ROWS * 4,
    );
  });
  const bakeMs = (performance.now() - tBake) / DRAWS;
  const next = rng(9);
  const verts = new Float32Array(V * 4);
  const vertsU32 = new Uint32Array(verts.buffer);
  const perDraw = V / DRAWS;
  for (let i = 0; i < V; i++) {
    // A draw's vertices are contiguous, as a vertex stage's are.
    const draw = Math.floor(i / perDraw);
    const m = pointsIn(next, specs[draw]!.scale);
    verts[4 * i] = m[0]!;
    verts[4 * i + 1] = m[1]!;
    verts[4 * i + 2] = m[2]!;
    vertsU32[4 * i + 3] = draw;
  }
  const drawBuffer = upload(device, bakeRows);
  const vertexBuffer = upload(device, verts);
  const output = device.createBuffer({
    size: V * 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const latticeTiles = tilesFor(specs, 1);
  const latticeBuffer = device.createBuffer({
    size: DRAWS * gpuLatticeRows(1) * 16,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  fitter.writeHeads(latticeBuffer, latticeTiles);
  const latticeBatch = fitter.batch(latticeTiles);
  {
    const e = device.createCommandEncoder();
    fitter.encodeFit(e, latticeBatch, latticeBuffer, lift);
    device.queue.submit([e.finish()]);
  }

  const direct = await makeDirect(device);
  const paramsBuffer = device.createBuffer({
    size: 128,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const constantBuffer = device.createBuffer({
    size: DRAWS * 32,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const group = device.createBindGroup({
    layout: direct.layout,
    entries: [
      { binding: 0, resource: { buffer: paramsBuffer } },
      { binding: 1, resource: { buffer: drawBuffer } },
      { binding: 2, resource: { buffer: latticeBuffer } },
      { binding: 3, resource: { buffer: vertexBuffer } },
      { binding: 4, resource: { buffer: output } },
      { binding: 5, resource: { buffer: constantBuffer } },
    ],
  });
  const run = (
    encoder: GPUCommandEncoder,
    pipeline: GPUComputePipeline,
    count: number,
    ts?: GPUComputePassTimestampWrites,
  ) => {
    const pass = encoder.beginComputePass(ts ? { timestampWrites: ts } : {});
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(count / 64));
    pass.end();
  };

  // B1. Accuracy: every 256th of the 1M vertices (4096, all 1024 draws), each form:
  // the residual of the vertex kernel plus the constant of the draw's kernel.
  const subset = V;
  const measuredB: Record<string, number> = {};
  let worstB = 0;
  let latticeLift: number;
  const compare = async (
    form: GpuWarpForm,
    residualOf: GPUComputePipeline,
    constantsFrom: Float32Array,
  ): Promise<{ all: number; small: number }> => {
    // `params.count` is the vertex count for the residual kernel.
    device.queue.writeBuffer(paramsBuffer, 0, directParams(form, subset));
    const e = device.createCommandEncoder();
    run(e, residualOf, subset);
    device.queue.submit([e.finish()]);
    const got = new Float32Array(await read(device, output, 0, subset * 16));
    const worst = { all: 0, small: 0 };
    const d = new Float64Array(3);
    const m = new Float64Array(3);
    for (let i = 0; i < subset; i += 256) {
      const draw = Math.floor(i / perDraw);
      for (let a = 0; a < 3; a++) {
        m[a] = verts[4 * i + a]!;
      }
      formDisplacement(form, specs[draw]!.origin)(m, d);
      for (let a = 0; a < 3; a++) {
        const total =
          got[4 * i + a]! +
          constantsFrom[8 * draw + a]! +
          constantsFrom[8 * draw + 4 + a]!;
        const mm = Math.abs(total - d[a]!) * 1000;
        worst.all = Math.max(worst.all, mm);
        if (specs[draw]!.scale <= 2000) {
          worst.small = Math.max(worst.small, mm);
        }
      }
    }
    return worst;
  };
  let directLift = 0;
  for (const name of ["lift", "bump", "scaleAbout"] as const) {
    const form =
      name === "lift"
        ? lift
        : name === "bump"
          ? bumpNear(specs)
          : animated(0.3)[name]!;
    device.queue.writeBuffer(paramsBuffer, 0, directParams(form, DRAWS));
    const e = device.createCommandEncoder();
    run(e, direct.constants, DRAWS);
    device.queue.submit([e.finish()]);
    const constants = new Float32Array(
      await read(device, constantBuffer, 0, DRAWS * 32),
    );
    const worst = await compare(form, direct.direct, constants);
    measuredB[
      `${name}${name === "lift" ? " ×10" : ""}: direct − float64 truth, max mm`
    ] = f(worst.all, 4);
    if (name === "lift") {
      measuredB["lift ×10, tiles up to 2 km: max mm"] = f(worst.small, 4);
      directLift = worst.all;
    } else {
      worstB = Math.max(worstB, worst.all);
    }
  }
  {
    // The fitted lattice's constants are rows 1 and 2 of each body.
    const rows = new Float32Array(
      await read(device, latticeBuffer, 0, DRAWS * gpuLatticeRows(1) * 16),
    );
    const constants = new Float32Array(DRAWS * 8);
    for (let k = 0; k < DRAWS; k++) {
      constants.set(
        rows.subarray((k * 23 + 1) * 4, (k * 23 + 1) * 4 + 4),
        8 * k,
      );
      constants.set(
        rows.subarray((k * 23 + 2) * 4, (k * 23 + 2) * 4 + 4),
        8 * k + 4,
      );
    }
    const worst = await compare(lift, direct.lattice, constants);
    measuredB["lift ×10 as a fitted 1-cell lattice (GPU fit): max mm"] = f(
      worst.all,
      4,
    );
    measuredB["lift ×10 as a fitted 1-cell lattice, tiles up to 2 km: max mm"] =
      f(worst.small, 4);
    latticeLift = worst.all;
  }
  measuredB["bake of one draw (CPU float64), ms"] = f(bakeMs, 4);
  add(
    "B: direct evaluation from baked polynomials, 1024 draws of 0.5 to 8 km",
    measuredB,
    "a bump and a scale about a point within 0.5 mm; a lift no worse than the fitted lattice (float32 evaluation of an 8 km tile: about 1e-7 × tile × (k − 1))",
    worstB <= 0.5 && directLift <= latticeLift * 1.1,
  );

  // B2. Cost per vertex.
  const costs: Record<string, number> = {};
  const timings: Record<string, Timing> = {};
  const pairs: Array<[string, GPUComputePipeline, GpuWarpForm]> = [
    ["lattice (fitted, 1 cell)", direct.lattice, lift],
    ["direct lift", direct.direct, lift],
    ["direct bump", direct.direct, bumpNear(specs)],
    ["direct scale about", direct.direct, animated(0.3).scaleAbout!],
  ];
  for (const [name, pipeline, form] of pairs) {
    device.queue.writeBuffer(paramsBuffer, 0, directParams(form, V));
    const t = await timeEncodes(gpu, (e, ts) => run(e, pipeline, V, ts), 20);
    timings[name] = t;
    costs[`${name}: ms per 1M vertices (GPU)`] = f(
      Number.isNaN(t.gpuMs) ? t.pipelinedMs : t.gpuMs,
      4,
    );
  }
  {
    device.queue.writeBuffer(paramsBuffer, 0, directParams(bumpNear(specs), V));
    const t = await timeEncodes(
      gpu,
      (e, ts) => run(e, direct.constants, DRAWS, ts),
      20,
    );
    costs["per-draw constants (df64), 1024 draws: ms (GPU)"] = f(
      Number.isNaN(t.gpuMs) ? t.pipelinedMs : t.gpuMs,
      4,
    );
  }
  // Evaluating the form in df64 at every vertex, no polynomials (warpFitGpu's `evalDirect`).
  {
    const pointBuffer = upload(device, verts);
    const evaluated = device.createBuffer({
      size: V * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const tile0 = [{ ...latticeTiles[0]!, bodyRow: 0 }];
    const batch0 = fitter.batch(tile0);
    for (const [name, form] of [
      ["df64 lift", lift],
      ["df64 UTM", utm],
    ] as const) {
      const t = await timeEncodes(
        gpu,
        (e, ts) =>
          fitter.encodeDirect(e, batch0, form, pointBuffer, evaluated, V, ts),
        10,
      );
      costs[`${name}, per-vertex df64, no fit: ms per 1M vertices (GPU)`] = f(
        Number.isNaN(t.gpuMs) ? t.pipelinedMs : t.gpuMs,
        3,
      );
    }
    // Accuracy of df64 evaluation alone: 2048 points of tile 0, float64 truth.
    const few = new Float32Array(2048 * 4);
    const fewProbe = rng(21);
    const fewPoints: Float64Array[] = [];
    for (let i = 0; i < 2048; i++) {
      const m = pointsIn(fewProbe, specs[0]!.scale);
      fewPoints.push(m);
      few.set(
        [Math.fround(m[0]!), Math.fround(m[1]!), Math.fround(m[2]!)],
        4 * i,
      );
    }
    const fewBuffer = upload(device, few);
    for (const [name, form] of [
      ["lift ×2", { kind: "heightLift", factor: 2 } as GpuWarpForm],
      ["lift ×10", lift],
    ] as const) {
      const e = device.createCommandEncoder();
      fitter.encodeDirect(e, batch0, form, fewBuffer, evaluated, 2048);
      device.queue.submit([e.finish()]);
      const got = new Float32Array(await read(device, evaluated, 0, 2048 * 16));
      const d = new Float64Array(3);
      let worstMm = 0;
      fewPoints.forEach((m, i) => {
        m[0] = Math.fround(m[0]!);
        m[1] = Math.fround(m[1]!);
        m[2] = Math.fround(m[2]!);
        formDisplacement(form, specs[0]!.origin)(m, d);
        for (let a = 0; a < 3; a++) {
          worstMm = Math.max(worstMm, Math.abs(got[4 * i + a]! - d[a]!) * 1000);
        }
      });
      costs[`df64 ${name} − float64 truth, max mm`] = f(worstMm);
    }
    batch0.destroy();
    pointBuffer.destroy();
    evaluated.destroy();
  }
  const directMs = costs["direct lift: ms per 1M vertices (GPU)"]!;
  add(
    "B: cost per vertex, 1M vertices, direct from baked polynomials, a fitted lattice, and df64 per vertex",
    costs,
    "direct evaluation within 2.5× of reading a fitted lattice, and under 1 ms per 1M vertices",
    directMs <= 1 &&
      directMs <=
        2.5 * costs["lattice (fitted, 1 cell): ms per 1M vertices (GPU)"]!,
  );

  // B3. Animating with direct evaluation: every parameter moves each frame; nothing is refit.
  {
    const frames = 90;
    const t0 = performance.now();
    for (let i = 0; i < frames; i++) {
      const forms = animated(i * 0.05);
      const form = forms[["lift", "bump", "scaleAbout"][i % 3]!]!;
      device.queue.writeBuffer(paramsBuffer, 0, directParams(form, V));
      const e = device.createCommandEncoder();
      run(e, direct.constants, DRAWS);
      run(e, direct.direct, V);
      device.queue.submit([e.finish()]);
      await device.queue.onSubmittedWorkDone();
    }
    const frameMs = (performance.now() - t0) / frames;
    add(
      "B: 90 frames, a parameter moving every frame, 1M vertices, submit and wait each",
      {
        "ms per frame (wall, submit + wait)": f(frameMs, 3),
        "frames per second at that": f(1000 / frameMs, 0),
        refits: 0,
      },
      "over 60 frames per second",
      1000 / frameMs > 60,
    );
  }

  // B4. Analytic bounds over an animation: the drawn bounds are made once for
  // the parameters' ranges, and hold for every frame.
  {
    const sample = Array.from({ length: 256 }, (_, j) => j * 4096);
    const ranges = {
      factor: [1, 10] as const,
      baseHeight: [0, 200] as const,
      offset: [-20, 20] as const,
    };
    const region = { center: ecef(3, 45, 0), radius: 400_000 };
    const seen = { lift: 0, bump: 0, scaleAbout: 0 };
    const bound = { lift: 0, bump: 400, scaleAbout: 0 };
    let held = true;
    const d = new Float64Array(3);
    const m = new Float64Array(3);
    for (const i of sample) {
      const spec = specs[Math.floor(i / perDraw)]!;
      for (let a = 0; a < 3; a++) {
        m[a] = verts[4 * i + a]!;
      }
      const heights: [number, number] = [-spec.scale, 3000 + spec.scale];
      bound.lift = Math.max(bound.lift, liftBoundOver(heights, ranges));
      const tileBound = scaleAboutBoundOver(
        spec.origin,
        spec.scale,
        region,
        [0.5, 1.5],
      );
      bound.scaleAbout = Math.max(bound.scaleAbout, tileBound);
      for (let frame = 0; frame < 120; frame++) {
        const forms = animated(frame * 0.2);
        for (const name of ["lift", "bump", "scaleAbout"] as const) {
          formDisplacement(forms[name]!, spec.origin)(m, d);
          const size = Math.hypot(d[0]!, d[1]!, d[2]!);
          seen[name] = Math.max(seen[name], size);
          if (
            size >
            (name === "lift"
              ? liftBoundOver(heights, ranges)
              : name === "bump"
                ? 400
                : tileBound)
          ) {
            held = false;
          }
        }
      }
    }
    add(
      "B: analytic bounds over a 120-frame animation of each form, 256 vertices",
      {
        "lift: largest displacement seen, m": f(seen.lift, 1),
        "lift: bound over its ranges, m": f(bound.lift, 1),
        "bump: largest seen, m": f(seen.bump, 3),
        "bump: bound (amplitude), m": bound.bump,
        "scale about: largest seen, m": f(seen.scaleAbout, 1),
        "scale about: bound over the point's region, m": f(bound.scaleAbout, 1),
      },
      "no vertex ever moves farther than its draw's bound",
      held,
    );
  }

  // C. A parameter that doesn't factor: blend fits across its range.
  {
    const tile = { center: [0, 0, 0], scale: 3000 };
    const origin = ecef(3.3, 45, 500);
    const measured: Record<string, number> = {};
    let best = Infinity;
    for (const halfRange of [0.5, 1]) {
      for (const nodes of [3, 4, 5, 6]) {
        const lo = 3 - halfRange;
        const hi = 3 + halfRange;
        const xs = Array.from(
          { length: nodes },
          (_, j) =>
            (lo + hi) / 2 +
            ((hi - lo) / 2) * Math.cos(((2 * j + 1) * Math.PI) / (2 * nodes)),
        );
        const lattices = xs.map((cm) =>
          fitLatticeAt(
            formDisplacement({ ...utm, centralMeridian: cm }, origin),
            tile,
            1,
          ),
        );
        let worstMm = 0;
        const d = new Float64Array(3);
        const got = new Float64Array(3);
        const probe = rng(13);
        for (let s = 0; s < 60; s++) {
          const cm = lo + (hi - lo) * (s / 59);
          const weights = xs.map((xj, j) => {
            let w = 1;
            xs.forEach((xk, k) => {
              if (k !== j) {
                w *= (cm - xk) / (xj - xk);
              }
            });
            return w;
          });
          const blended: CubicLattice = {
            ...lattices[0]!,
            coefficients: lattices[0]!.coefficients.map((_, i) =>
              weights.reduce(
                (sum, w, j) => sum + w * lattices[j]!.coefficients[i]!,
                0,
              ),
            ),
          };
          const truth = formDisplacement(
            { ...utm, centralMeridian: cm },
            origin,
          );
          for (let q = 0; q < 4; q++) {
            const m = pointsIn(probe, 3000);
            truth(m, d);
            evaluateLattice(blended, m, got);
            for (let a = 0; a < 3; a++) {
              worstMm = Math.max(worstMm, Math.abs(got[a]! - d[a]!) * 1000);
            }
          }
        }
        measured[`central meridian ±${halfRange}°, ${nodes} nodes: max mm`] =
          f(worstMm);
        if (halfRange === 0.5 && nodes === 5) {
          best = worstMm;
        }
      }
    }
    add(
      "C: UTM with a moving central meridian as a blend of fits at Chebyshev nodes (float64 coefficients), 3 km tile",
      measured,
      "5 nodes over ±0.5° within 1 mm of the exact map",
      best <= 1,
    );
  }

  $("adapter").textContent = `Adapter: ${adapter}`;
  render(checks);
  const failed = checks.filter((c) => !c.pass);
  status.textContent = failed.length
    ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
    : `pass: all ${checks.length} checks`;
  if (failed.length) {
    console.error(
      `[warpFitGpu] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
    );
  }
  return { adapter, checks, pass: checks.every((c) => c.pass) };
}

/** A bump about a point near the middle of the tiles, 40 km wide. */
function bumpNear(specs: readonly TileSpec[]): GpuWarpForm {
  const o = specs[0]!.origin;
  return {
    kind: "heightBump",
    center: [o[0]! + 2000, o[1]! - 1000, o[2]! + 500],
    amplitude: 400,
    sigma: 40_000,
  };
}

const KIND = { heightLift: 0, heightBump: 1, scaleAbout: 2 } as const;

/** `DirectParams` (warpFitDirect.slang) for a form: 32 floats; the animated numbers as hi and lo. */
function directParams(
  form: GpuWarpForm,
  count: number,
  drawCount = 1024,
): Float32Array<ArrayBuffer> {
  if (form.kind === "transverseMercator") {
    throw new RangeError("a projection is not a direct form");
  }
  const words = new Float32Array(32);
  const u32 = new Uint32Array(words.buffer);
  u32[0] = KIND[form.kind];
  u32[1] = count;
  u32[2] = drawCount;
  const put = (at: number, lo: number, x: number) => {
    [words[at], words[lo]] = splitDf64(x);
  };
  if (form.kind === "heightLift") {
    put(4, 8, form.factor - 1);
    put(5, 9, form.baseHeight ?? 0);
    put(6, 10, form.offset ?? 0);
  } else if (form.kind === "heightBump") {
    put(7, 11, form.amplitude);
    words[12] = 1 / (2 * form.sigma * form.sigma);
  }
  if (form.kind !== "heightLift") {
    for (let a = 0; a < 3; a++) {
      put(16 + a, 20 + a, form.center[a]!);
    }
  }
  if (form.kind === "scaleAbout") {
    form.factors.forEach((x, a) => put(24 + a, 28 + a, x - 1));
  }
  return words;
}

async function makeDirect(device: GPUDevice) {
  const module = device.createShaderModule({ code: warpFitDirectWgsl });
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
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [layout],
  });
  const make = (entryPoint: string) =>
    device.createComputePipelineAsync({
      layout: pipelineLayout,
      compute: { module, entryPoint },
    });
  const [direct, lattice, constants] = await Promise.all([
    make("directEval"),
    make("latticeEval"),
    make("directConstants"),
  ]);
  return { layout, direct, lattice, constants };
}

function format(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toFixed(4);
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
    Object.entries(c.measured).forEach(([key, value], i, entries) => {
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
    return { run: runWarpFitGpu };
  },
};
