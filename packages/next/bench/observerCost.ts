import {
  Engine,
  OffscreenTarget,
  astrophotoCurveStage,
  cameraGlare,
  cameraObserver,
  createPostStage,
  eyeObserver,
  type GlareSettings,
  type PostStage,
  type View,
  type World,
} from "../src/index.ts";
import {
  MAGNITUDE_ZERO_ILLUMINANCE,
  STAR_FLOATS,
  magnitudeOfRank,
  type StarField,
} from "../src/atmosphere/stars.ts";
import type { Harness } from "../lab/harness.ts";

/**
 * What the observer, the stars and glare cost, with no sky data needed.
 *
 * The stars are synthetic (`syntheticStars`): the sky's magnitude counts, a
 * band like the Milky Way's, a flat background. Each row is five runs, each
 * the median of nine renders at 2560 × 1440 whatever the window. A row's time
 * is GPU milliseconds from the engine's timer (`engine.gpuPasses`), which is
 * smoothed over frames, or, on a device with no timestamp queries, the wall
 * time of a render that is waited for. Chrome rounds timestamps to 100 µs
 * unless it runs with `--enable-webgpu-developer-features`.
 *
 * Quads and strips are this page's own pipelines, for comparison: the engine
 * draws neither any more. Quads are six vertices a star with a halo's reach;
 * strips are four, with a reach of 3.5 pixels. Cells are the engine's: culled
 * on the GPU and drawn by indirect draw, or culled on the CPU and drawn
 * directly (`world.submission`).
 */

const WIDTH = 2560;
const HEIGHT = 1440;
const SAMPLES = 9;
const DEG = Math.PI / 180;
/** The Earth's radius, m. */
const RADIUS = 6_378_137;

// ---------------------------------------------------------------- stars

/** A seeded generator in [0, 1) (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The galactic pole, ICRF. */
const POLE = unit(
  Math.cos(27.12825 * DEG) * Math.cos(192.85948 * DEG),
  Math.cos(27.12825 * DEG) * Math.sin(192.85948 * DEG),
  Math.sin(27.12825 * DEG),
);
const POLE_BASIS = (() => {
  const a: V3 =
    Math.abs(POLE[2]) < 0.9 ? [0, 0, 1] : ([1, 0, 0] as unknown as V3);
  const u = unit(...cross(POLE, a));
  return [u, cross(POLE, u)] as const;
})();

type V3 = readonly [number, number, number];
function unit(x: number, y: number, z: number): V3 {
  const k = 1 / Math.hypot(x, y, z);
  return [x * k, y * k, z * k];
}
function cross(a: V3, b: V3): V3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** Display colors from blue-white to orange, each at luminance 1. */
const SPREAD: readonly V3[] = [
  [0.62, 0.78, 1.25],
  [0.85, 0.92, 1.1],
  [1, 1, 1],
  [1.12, 1.02, 0.82],
  [1.28, 0.98, 0.62],
  [1.45, 0.9, 0.5],
].map(([r, g, b]) => {
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return [r! / luminance, g! / luminance, b! / luminance] as const;
});

/**
 * `count` stars: positions in a band along the galactic plane for two thirds
 * of them and uniform over the sphere for the rest; magnitudes from
 * `magnitudeOfRank` (so the counts match the sky's); colors from a fixed spread;
 * a flat background. Brightest first. Deterministic for a seed. It reads no
 * data, so it can run anywhere and its results can be kept.
 */
export function syntheticStars(count: number, seed: number): StarField {
  const next = random(seed);
  const points = new Float32Array(count * STAR_FLOATS);
  for (let i = 0; i < count; i++) {
    let d: V3;
    if (next() < 0.67) {
      // Latitude about the plane: a narrow core and a wider wing.
      const latitude =
        (next() < 0.5 ? 6 : 16) *
        DEG *
        Math.sqrt(-2 * Math.log(1 - next())) *
        Math.cos(2 * Math.PI * next());
      const longitude = 2 * Math.PI * next();
      const c = Math.cos(latitude);
      const along = [Math.cos(longitude) * c, Math.sin(longitude) * c];
      const [u, v] = POLE_BASIS;
      d = unit(
        along[0]! * u[0] + along[1]! * v[0] + Math.sin(latitude) * POLE[0],
        along[0]! * u[1] + along[1]! * v[1] + Math.sin(latitude) * POLE[1],
        along[0]! * u[2] + along[1]! * v[2] + Math.sin(latitude) * POLE[2],
      );
    } else {
      const z = 2 * next() - 1;
      const phi = 2 * Math.PI * next();
      const r = Math.sqrt(1 - z * z);
      d = [r * Math.cos(phi), r * Math.sin(phi), z];
    }
    const lux =
      MAGNITUDE_ZERO_ILLUMINANCE * 10 ** (-0.4 * magnitudeOfRank(i + 1));
    const color = SPREAD[Math.floor(next() * SPREAD.length)]!;
    points.set([d[0], d[1], d[2], lux, color[0], color[1], color[2], 0], i * 8);
  }
  // A flat background (the cube's six faces, one texel each), 1.2e-4 cd/m².
  const flat = Float32Array.of(1.2e-4, 1.2e-4, 1.2e-4, 0);
  return {
    points,
    count,
    backgroundLevels: Array.from({ length: 6 }, () => [flat]),
    backgroundSize: 1,
    holdsFaintStars: false,
    meanBackground: 1.2e-4,
  };
}

// --------------------------------------------------------------- results

export interface CostRow {
  /** Which part of the page: stars, glare, stages, eye. */
  group: string;
  /** The row's name. */
  name: string;
  /** Each run's median over `SAMPLES` renders, ms. */
  runs: number[];
  /** The median of the runs, ms. */
  medianMs: number;
  minMs: number;
  maxMs: number;
  /** What `medianMs` measures. */
  metric: string;
  /** The whole frame's GPU ms, and the passes that came to more than 0.05 ms. */
  frameMs: number;
  passes: string;
  /** Wall ms for a render that is waited for. */
  serialMs: number;
  /** The CPU ms a render's call takes. */
  cpuMs: number;
  note?: string;
}

export interface CostResults {
  adapter: {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
    isFallback: boolean;
  };
  userAgent: string;
  /** "indirect" (the default) or "direct" (`&submission=direct`). */
  submission: string;
  size: [number, number];
  runs: number;
  samplesPerRun: number;
  timestampQuery: boolean;
  indirectFirstInstance: boolean;
  stars: { source: string; count: number };
  rows: CostRow[];
  /** Device loss, or the first uncaptured errors; the run stops at a loss. */
  deviceLost: string | null;
  deviceErrors: string[];
  /** True when every row ran. */
  complete: boolean;
}

export const median = (values: readonly number[]): number => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) {
    return Number.NaN;
  }
  const middle = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// ------------------------------------------------------- quads and strips

const SHADER = /* wgsl */ `
struct U {
  right: vec4f,
  up: vec4f,
  forward: vec4f,
  // width, height, tanX, tanY
  size: vec4f,
  // a faint star's half side and a bright one's, pixels; the exposure
  reach: vec4f,
}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> stars: array<f32>;
struct V {
  @builtin(position) position: vec4f,
  @location(0) corner: vec2f,
  @location(1) color: vec3f,
}
fn place(star: u32, corner: vec2f) -> V {
  let b = star * 8u;
  let d = vec3f(stars[b], stars[b + 1u], stars[b + 2u]);
  let lux = stars[b + 3u];
  let color = vec3f(stars[b + 4u], stars[b + 5u], stars[b + 6u]);
  let x = dot(d, u.right.xyz);
  let y = dot(d, u.up.xyz);
  let z = dot(d, u.forward.xyz);
  var out: V;
  out.corner = corner;
  out.color = color * lux * u.reach.z;
  if (z <= 0.0) {
    out.position = vec4f(0.0, 0.0, 2.0, 1.0);
    return out;
  }
  let ndc = vec2f(x / (z * u.size.z), y / (z * u.size.w));
  let half = select(u.reach.x, u.reach.y, star < 100u);
  out.position = vec4f(ndc + corner * half * 2.0 / u.size.xy, 0.5, 1.0);
  return out;
}
@vertex fn quad(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0),
    vec2f(-1.0, -1.0), vec2f(1.0, 1.0), vec2f(-1.0, 1.0));
  return place(ii, corners[vi]);
}
@vertex fn strip(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> V {
  var corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(1.0, 1.0));
  return place(ii, corners[vi]);
}
@fragment fn fs(v: V) -> @location(0) vec4f {
  // A Gaussian out to 3.5 sigma at the quad's edge.
  let g = exp(-0.5 * 12.25 * dot(v.corner, v.corner));
  return vec4f(v.color * g, 1.0);
}`;

/** This page's own star pipelines, drawn into one target. */
class PointPipelines {
  private readonly device: GPUDevice;
  private readonly texture: GPUTexture;
  private readonly uniform: GPUBuffer;
  private readonly stars: GPUBuffer;
  private readonly pipelines: Record<"quads" | "strips", GPURenderPipeline>;
  private readonly groups: Record<"quads" | "strips", GPUBindGroup>;
  private readonly querySet?: GPUQuerySet;
  private readonly resolve?: GPUBuffer;
  private readonly read?: GPUBuffer;
  private readonly count: number;

  constructor(device: GPUDevice, field: StarField) {
    this.device = device;
    this.count = field.count;
    this.texture = device.createTexture({
      size: [WIDTH, HEIGHT],
      format: "rgba16float",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.uniform = device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.stars = device.createBuffer({
      size: field.points.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(
      this.stars,
      0,
      field.points.buffer,
      field.points.byteOffset,
      field.points.byteLength,
    );
    const module = device.createShaderModule({ code: SHADER });
    const make = (entry: "quad" | "strip") =>
      device.createRenderPipeline({
        layout: "auto",
        vertex: { module, entryPoint: entry },
        fragment: {
          module,
          entryPoint: "fs",
          targets: [
            {
              format: "rgba16float",
              blend: {
                color: { srcFactor: "one", dstFactor: "one" },
                alpha: { srcFactor: "one", dstFactor: "one" },
              },
            },
          ],
        },
        primitive: {
          topology: entry === "quad" ? "triangle-list" : "triangle-strip",
        },
      });
    this.pipelines = { quads: make("quad"), strips: make("strip") };
    const group = (pipeline: GPURenderPipeline) =>
      device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.uniform } },
          { binding: 1, resource: { buffer: this.stars } },
        ],
      });
    this.groups = {
      quads: group(this.pipelines.quads),
      strips: group(this.pipelines.strips),
    };
    if (device.features.has("timestamp-query")) {
      this.querySet = device.createQuerySet({ type: "timestamp", count: 2 });
      this.resolve = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });
      this.read = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });
    }
  }

  /** Aims at `pose`; the camera's basis and the field of view. */
  aim(pose: Pose): void {
    const forward = unit(...pose.direction);
    const right = unit(...cross(forward, pose.up));
    const up = cross(right, forward);
    const tanY = Math.tan((pose.fov * DEG) / 2);
    this.device.queue.writeBuffer(
      this.uniform,
      0,
      Float32Array.of(
        ...right,
        0,
        ...up,
        0,
        ...forward,
        0,
        WIDTH,
        HEIGHT,
        tanY * (WIDTH / HEIGHT),
        tanY,
        // A quad reaches as a halo does: 4 px, a bright star's 8. A strip, the
        // core's 3.5 px at the spread's 1 px.
        ...(this.reach === "quads" ? [4, 8] : [3.5, 3.5]),
        1e6,
        0,
      ),
    );
  }

  private reach: "quads" | "strips" = "quads";

  /** One render; its GPU ms (NaN without timestamp queries). */
  async draw(kind: "quads" | "strips", pose: Pose): Promise<number> {
    this.reach = kind;
    this.aim(pose);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.texture.createView(),
          clearValue: [0, 0, 0, 0],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      ...(this.querySet
        ? {
            timestampWrites: {
              querySet: this.querySet,
              beginningOfPassWriteIndex: 0,
              endOfPassWriteIndex: 1,
            },
          }
        : {}),
    });
    pass.setPipeline(this.pipelines[kind]);
    pass.setBindGroup(0, this.groups[kind]);
    pass.draw(kind === "quads" ? 6 : 4, this.count);
    pass.end();
    if (this.querySet && this.resolve && this.read) {
      encoder.resolveQuerySet(this.querySet, 0, 2, this.resolve, 0);
      encoder.copyBufferToBuffer(this.resolve, 0, this.read, 0, 16);
    }
    this.device.queue.submit([encoder.finish()]);
    if (!this.read) {
      await this.device.queue.onSubmittedWorkDone();
      return Number.NaN;
    }
    await this.read.mapAsync(GPUMapMode.READ);
    const stamps = new BigInt64Array(this.read.getMappedRange().slice(0));
    this.read.unmap();
    return Number(stamps[1]! - stamps[0]!) / 1e6;
  }

  dispose(): void {
    this.texture.destroy();
    this.uniform.destroy();
    this.stars.destroy();
    this.querySet?.destroy();
    this.resolve?.destroy();
    this.read?.destroy();
  }
}

// ----------------------------------------------------------------- views

interface Pose {
  position: V3;
  direction: V3;
  up: V3;
  sun: V3;
  /** Vertical field of view, degrees. */
  fov: number;
}

const dir = (ra: number, dec: number): V3 =>
  unit(
    Math.cos(dec * DEG) * Math.cos(ra * DEG),
    Math.cos(dec * DEG) * Math.sin(ra * DEG),
    Math.sin(dec * DEG),
  );

/** Looking out from 2,000 km up, the sun behind the Earth. */
function inSpace(direction: V3, fov: number): Pose {
  const side = unit(...cross(direction, [0, 0, 1]));
  return {
    position: [
      direction[0] * (RADIUS + 2e6),
      direction[1] * (RADIUS + 2e6),
      direction[2] * (RADIUS + 2e6),
    ],
    direction,
    up: cross(side, direction),
    sun: [-direction[0], -direction[1], -direction[2]],
    fov,
  };
}

/** The views of the star rows: the whole sky's worth, the dense band, a long lens. */
const STAR_VIEWS: readonly { name: string; pose: Pose }[] = [
  { name: "wide, 100° at the pole", pose: inSpace(POLE, 100) },
  { name: "dense, 66° at the core", pose: inSpace(dir(266.4, -29), 66) },
  { name: "long lens, 5° at the core", pose: inSpace(dir(266.4, -29), 5) },
];

/** The sun 20° up, in view from 2 m above the ground, 66° across. */
const DAY: Pose = {
  position: [RADIUS + 2, 0, 0],
  direction: [0, 1, 0],
  up: [1, 0, 0],
  sun: unit(Math.sin(20 * DEG), Math.cos(20 * DEG), 0),
  fov: 66,
};

class SkyScene {
  readonly target = new OffscreenTarget(WIDTH, HEIGHT);
  readonly world: World;
  readonly view: View;

  constructor(
    readonly engine: Engine,
    observer: Parameters<Engine["addView"]>[0]["observer"],
  ) {
    this.world = engine.createWorld({
      maxDraws: 4,
      vertexBytes: 1 << 16,
      indexBytes: 1 << 16,
    });
    this.view = engine.addView({
      target: this.target,
      world: this.world,
      background: "atmosphere",
      sunDisk: true,
      observer,
    });
  }

  aim(pose: Pose): void {
    const { camera } = this.view;
    camera.position.set(pose.position);
    camera.direction.set(pose.direction);
    camera.fov = pose.fov * DEG;
    camera.orient(Float64Array.from(pose.up));
    camera.version++;
    this.engine.sunDirection.set(pose.sun);
  }

  dispose(): void {
    this.engine.removeView(this.view);
    this.engine.removeWorld(this.world);
  }
}

// ------------------------------------------------------------------ page

const TEMPLATE = `
<h1>What the observer, the stars and glare cost</h1>
<p>
  GPU time at 2560 × 1440, whatever the window: five runs a row, each the
  median of nine renders. The stars are synthetic (the sky's magnitude counts,
  530,851 of them) and need no data. Query: <code>?bench=1&amp;runs=5</code>
  starts the run at once; <code>&amp;submission=direct</code> draws without
  indirect submission; <code>&amp;stars=N</code> sets the count;
  <code>&amp;pack=local</code> has the engine's rows draw a local sky pack's
  stars where the dev server offers one (quads and strips keep the synthetic
  ones). Stops at a device loss and reports it.
</p>
<div class="status">Run to measure.</div>
<div data-id="adapter"></div>
<div style="margin: 8px 0">
  <button data-id="copy" type="button" disabled>Copy results</button>
</div>
<table data-id="rows"></table>
<textarea data-id="json" readonly hidden rows="12" style="width: 100%; font: 11px monospace"></textarea>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const f = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : "–");

function showRow(row: CostRow): void {
  const tr = document.createElement("tr");
  const cells = [
    row.group,
    row.name,
    f(row.medianMs),
    `${f(row.minMs)}–${f(row.maxMs)}`,
    f(row.frameMs),
    f(row.serialMs),
    f(row.cpuMs),
    row.passes,
  ];
  for (const text of cells) {
    const td = document.createElement("td");
    td.textContent = text;
    tr.append(td);
  }
  $("rows").append(tr);
}

/** Every time a row can come from. */
interface Reading {
  /** The row's headline, ms. */
  value: number;
  frameMs: number;
  passes: Record<string, number>;
  serialMs: number;
  cpuMs: number;
}

class Lost extends Error {}

async function measure(params: URLSearchParams): Promise<CostResults> {
  const runs = Math.max(1, Number(params.get("runs") ?? 5));
  const direct = params.get("submission") === "direct";
  const count = Number(params.get("stars") ?? 530_851);
  const local = params.get("pack") === "local";
  const status = root.querySelector(".status")!;
  const engine = await Engine.create();
  const device = engine.gpu.device;
  const info = engine.gpu.adapter.info;
  const results: CostResults = {
    adapter: {
      vendor: info.vendor,
      architecture: info.architecture,
      device: info.device,
      description: info.description,
      isFallback:
        (info as { isFallbackAdapter?: boolean }).isFallbackAdapter ?? false,
    },
    userAgent: navigator.userAgent,
    submission: direct ? "direct" : "indirect",
    size: [WIDTH, HEIGHT],
    runs,
    samplesPerRun: SAMPLES,
    timestampQuery: device.features.has("timestamp-query"),
    indirectFirstInstance: engine.ctx.caps.indirectFirstInstance,
    stars: { source: local ? "pack" : "synthetic", count },
    rows: [],
    deviceLost: null,
    deviceErrors: [],
    complete: false,
  };
  $("adapter").textContent =
    `${info.vendor} ${info.architecture} ${info.device} ${info.description}`.trim() +
    (results.timestampQuery ? "" : " (no timestamp queries: wall time)");
  let lost: string | undefined;
  void device.lost.then((l) => {
    lost = `${l.reason}: ${l.message}`;
    results.deviceLost = lost;
  });
  device.addEventListener("uncapturederror", (event) => {
    results.deviceErrors.push((event as GPUUncapturedErrorEvent).error.message);
  });
  const check = () => {
    if (lost !== undefined) {
      throw new Lost(lost);
    }
  };

  const sky = engine.raster.sky as unknown as {
    setStarField(field: StarField | null): void;
    advanceUpload(): boolean;
    starCount: number;
    uploading: boolean;
  };
  const field = syntheticStars(count, 20261108);
  let pipelines: PointPipelines | undefined;

  /** One render, then what the timer and the clock say. */
  const render = async (read: (r: Reading) => number): Promise<Reading> => {
    check();
    const t0 = performance.now();
    engine.renderFrame();
    const cpuMs = performance.now() - t0;
    await device.queue.onSubmittedWorkDone();
    const serialMs = performance.now() - t0;
    await wait(4);
    const reading: Reading = {
      value: 0,
      frameMs: engine.stats.gpuMs,
      passes: { ...engine.gpuPasses },
      serialMs,
      cpuMs,
    };
    reading.value = read(reading);
    return reading;
  };

  const rowOf = (
    group: string,
    name: string,
    metric: string,
    readings: Reading[][],
    note?: string,
  ): CostRow => {
    const per = readings.map((r) => median(r.map((x) => x.value)));
    const all = readings.flat();
    const last = all[all.length - 1]?.passes ?? {};
    const timed = Number.isFinite(median(all.map((x) => x.frameMs)));
    return {
      group,
      name,
      runs: per,
      medianMs: median(per),
      minMs: Math.min(...per),
      maxMs: Math.max(...per),
      metric: timed ? metric : `${metric} (wall time: no timer)`,
      frameMs: median(all.map((x) => x.frameMs)),
      passes: Object.entries(last)
        .filter(([, v]) => Number.isFinite(v) && v >= 0.05)
        .map(([k, v]) => `${k} ${v.toFixed(2)}`)
        .join(", "),
      serialMs: median(all.map((x) => x.serialMs)),
      cpuMs: median(all.map((x) => x.cpuMs)),
      ...(note ? { note } : {}),
    };
  };

  /** A row from the engine's timer: `pick` sums the passes it names. */
  const engineRow = async (
    group: string,
    name: string,
    metric: string,
    pick: (passes: Record<string, number>) => number,
    note?: string,
  ): Promise<CostRow> => {
    status.textContent = `${group}: ${name}…`;
    for (let i = 0; i < 40; i++) {
      await render(() => 0);
    }
    const readings: Reading[][] = [];
    for (let r = 0; r < runs; r++) {
      const run: Reading[] = [];
      for (let i = 0; i < SAMPLES; i++) {
        run.push(
          await render((x) => {
            const v = pick(x.passes);
            return Number.isFinite(v) ? v : x.serialMs;
          }),
        );
      }
      readings.push(run);
    }
    const row = rowOf(group, name, metric, readings, note);
    results.rows.push(row);
    showRow(row);
    return row;
  };

  const sum =
    (...labels: string[]) =>
    (passes: Record<string, number>) =>
      labels.reduce((a, l) => a + (passes[l] ?? 0), 0);
  const matching = (pattern: RegExp) => (passes: Record<string, number>) =>
    Object.entries(passes)
      .filter(([k, v]) => pattern.test(k) && Number.isFinite(v))
      .reduce((a, [, v]) => a + v, 0);
  const total = (x: Record<string, number>) =>
    Object.values(x).reduce((a, v) => a + (Number.isFinite(v) ? v : 0), 0);

  try {
    // ------------------------------------------------------------- stars
    status.textContent = "uploading stars…";
    if (local) {
      void engine.setSkyPack("/sky-pack/");
    } else {
      sky.setStarField(field);
      while (sky.advanceUpload()) {
        /* until complete */
      }
    }
    pipelines = new PointPipelines(device, field);
    // Engine rows: the stars' pass and the cull, together.
    const starScene = new SkyScene(engine, cameraObserver({ ev100: -6.5 }));
    starScene.aim(STAR_VIEWS[0]!.pose);
    for (let i = 0; i < 4000; i++) {
      engine.renderFrame();
      await device.queue.onSubmittedWorkDone();
      if (sky.starCount > 0 && !sky.uploading) {
        break;
      }
      await wait(5);
    }
    if (local) {
      results.stars.count = sky.starCount;
    }
    for (const mode of ["indirect", "direct"] as const) {
      if (mode === "indirect" && direct) {
        continue;
      }
      starScene.world.submission = mode;
      for (const { name, pose } of STAR_VIEWS) {
        starScene.aim(pose);
        await engineRow(
          "stars",
          `cells, ${mode === "indirect" ? "indirect draw" : "CPU path"}: ${name}`,
          "the star pass and its cull",
          sum("stars", "star-cull"),
          mode === "direct" && !direct
            ? "culled on the CPU, drawn directly"
            : undefined,
        );
      }
    }
    // Own pipelines: all the stars, no cells.
    for (const kind of ["quads", "strips"] as const) {
      for (const { name, pose } of STAR_VIEWS) {
        status.textContent = `stars: ${kind}: ${name}…`;
        for (let i = 0; i < 10; i++) {
          check();
          await pipelines.draw(kind, pose);
        }
        const readings: Reading[][] = [];
        for (let r = 0; r < runs; r++) {
          const run: Reading[] = [];
          for (let i = 0; i < SAMPLES; i++) {
            check();
            const t0 = performance.now();
            const gpu = await pipelines.draw(kind, pose);
            const wall = performance.now() - t0;
            run.push({
              value: Number.isFinite(gpu) ? gpu : wall,
              frameMs: gpu,
              passes: {},
              serialMs: wall,
              cpuMs: 0,
            });
          }
          readings.push(run);
        }
        const row = rowOf(
          "stars",
          `${kind}: ${name}`,
          "this page's pipeline, all stars, no cells",
          readings,
          kind === "quads"
            ? "six vertices a star, half side 4 px (8 for the 100 brightest)"
            : "four vertices a star, half side 3.5 px",
        );
        results.rows.push(row);
        showRow(row);
      }
    }
    starScene.dispose();

    // ------------------------------------------------------------- glare
    const day = new SkyScene(engine, {
      ...cameraObserver({ ev100: 15 }),
      glare: null,
    });
    day.aim(DAY);
    const glareOf = (glare: GlareSettings | null) => {
      day.view.observer = { glare };
    };
    await engineRow(
      "glare",
      "off",
      "the whole frame",
      total,
      "the sun 20° up, in view, 66°",
    );
    for (const tier of ["sources", "reduced", "full"] as const) {
      glareOf({ ...cameraGlare(), tier });
      await engineRow(
        "glare",
        `tier ${tier}`,
        "the glare passes and the stages' (glare.*, post.*)",
        matching(/^(glare|post)\./),
      );
    }
    glareOf({ ...cameraGlare(), tier: "full", spikes: null });
    await engineRow(
      "glare",
      "full, veil only",
      "the glare passes and the stages'",
      matching(/^(glare|post)\./),
    );
    glareOf({ ...cameraGlare(), tier: "full", veil: null });
    await engineRow(
      "glare",
      "full, spikes only",
      "the glare passes and the stages'",
      matching(/^(glare|post)\./),
    );
    glareOf(null);

    // ------------------------------------------------------------ stages
    const none = await engineRow(
      "stages",
      "none",
      "the whole frame",
      total,
      "the baseline for the rows below",
    );
    void none;
    const noop = (slot: "scene" | "exposed" | "display"): PostStage =>
      createPostStage({
        name: `noop-${slot}`,
        slot,
        kind: "look",
        label: `a stage that returns its input (${slot})`,
        shader: `fn postStage(input: PostInput) -> vec4<f32> { return postColorAt(input.pixel); }`,
      });
    const stages: [string, PostStage][] = [
      ["a stage that returns its input, scene slot", noop("scene")],
      ["a stage that returns its input, exposed slot", noop("exposed")],
      ["a stage that returns its input, display slot", noop("display")],
      ["the astrophoto curve", astrophotoCurveStage()],
    ];
    for (const [name, stage] of stages) {
      day.view.observer = { stages: [stage] };
      await engineRow("stages", name, "the whole frame", total);
    }
    day.view.observer = { stages: [] };
    day.dispose();

    // --------------------------------------------------------------- eye
    const night = new SkyScene(engine, eyeObserver({ speed: 1e6 }));
    night.aim(STAR_VIEWS[1]!.pose);
    night.view.observer = { ...eyeObserver({ speed: 1e6, pointLimit: false }) };
    await engineRow(
      "eye",
      "no point limit",
      "the whole frame",
      total,
      "the eye, adapted to the night",
    );
    night.view.observer = { ...eyeObserver({ speed: 1e6 }) };
    await engineRow(
      "eye",
      "the point limit",
      "the limit's own pass (post.eye-point-limit)",
      matching(/eye-point-limit/),
    );
    night.dispose();
    results.complete = true;
    status.textContent = "Done. Press Copy results.";
  } catch (error) {
    if (error instanceof Lost) {
      status.textContent = `The GPU device was lost (${error.message}). Stopped. Copy the results and do not retry.`;
    } else {
      status.textContent = `error: ${error instanceof Error ? error.message : String(error)}`;
      results.deviceErrors.push(String(error));
    }
  } finally {
    pipelines?.dispose();
    engine.stop();
    if (lost === undefined) {
      engine.destroy();
    }
  }
  return results;
}

async function copy(results: CostResults): Promise<void> {
  const text = JSON.stringify(results, null, 2);
  const box = $<HTMLTextAreaElement>("json");
  box.value = text;
  try {
    await navigator.clipboard.writeText(text);
    $("copy").textContent = "Copied";
  } catch {
    // No clipboard here: show it to select.
    box.hidden = false;
    box.select();
    $("copy").textContent = "Select the text below";
  }
}

export const harness: Harness = {
  mount(element, params) {
    root = element;
    root.innerHTML = TEMPLATE;
    let started: Promise<CostResults> | undefined;
    const run = () => {
      started ??= measure(params).then((results) => {
        const button = $<HTMLButtonElement>("copy");
        button.disabled = false;
        button.onclick = () => void copy(results);
        (globalThis as Record<string, unknown>).observerCostResults = results;
        return results;
      });
      return started;
    };
    // `?bench=1` is a person's: start now. The runner's `?bench` calls `run`.
    if (params.get("bench") === "1") {
      queueMicrotask(() => void run());
    }
    return { run };
  },
};
