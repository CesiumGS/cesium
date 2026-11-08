/**
 * GPU check (CESIUM2_WEBGPU_PLAN.md §13.23): an adapter report, then steps
 * run one at a time from a click, smallest first, to find what an unfamiliar
 * GPU (starting with Intel UHD 7xx and Iris Xe) can't do. A device loss
 * stops the run. Spike only: it adds nothing to the library, uses no network
 * beyond the dev server, and reads no token (the scene is procedural).
 *
 * Every loop here is bounded by a constant, and every index is clamped.
 */
import {
  BASE_BINDING_LIMITS,
  BASE_CAPACITY_LIMITS,
  requiredLimitsFor,
} from "../src/gpu/limits.ts";
import wgsl from "./gpu-check.wgsl?raw";

/** A step's wait for the GPU before it counts as a hang, ms. */
const TIMEOUT_MS = 8000;
/** Frames timed after the warm-up, per mode. */
const TIMED_FRAMES = 30;
const WARM_FRAMES = 5;

type Status = "pass" | "fail" | "lost" | "timeout";

interface Outcome {
  status: Status;
  reason: string;
  /** Error scope output (validation, out-of-memory, internal) and uncaptured errors. */
  scopes: string[];
  /** Frame times by label, ms (submit to the GPU finishing, averaged). */
  times: Array<{ label: string; ms: number; cpuMs?: number }>;
  /** Extra facts the step wants in the report. */
  notes: string[];
}

interface Step {
  id: string;
  title: string;
  what: string;
  run(): Promise<Outcome>;
}

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

// -------------------------------------------------------------- the adapter

interface AdapterReport {
  text: string[];
  html: string;
  tier: string;
}

async function adapterReport(): Promise<AdapterReport> {
  const lines: string[] = [];
  const rows: string[] = [];
  const row = (k: string, v: string, cls = "") => {
    rows.push(
      `<tr><th>${esc(k)}</th><td class="${cls}"><pre>${esc(v)}</pre></td></tr>`,
    );
  };
  const add = (k: string, v: string, cls = "") => {
    lines.push(`${k}: ${v}`);
    row(k, v, cls);
  };
  add("User agent", navigator.userAgent);
  const brands = (
    navigator as Navigator & {
      userAgentData?: { brands: Array<{ brand: string; version: string }> };
    }
  ).userAgentData?.brands;
  add(
    "Browser",
    brands
      ? brands.map((b) => `${b.brand} ${b.version}`).join(", ")
      : "(no userAgentData; see the user agent)",
  );
  if (!navigator.gpu) {
    add("WebGPU", "not available in this browser", "fail");
    return { text: lines, html: table(rows), tier: "none" };
  }
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    add("Adapter", "none returned", "fail");
    return { text: lines, html: table(rows), tier: "none" };
  }
  const info = adapter.info;
  add("Vendor", info.vendor || "(empty)");
  add("Architecture", info.architecture || "(empty)");
  add("Device", info.device || "(empty)");
  add("Description", info.description || "(empty)");
  add(
    "Fallback adapter",
    String(
      (adapter as GPUAdapter & { isFallbackAdapter?: boolean })
        .isFallbackAdapter ?? "unknown",
    ),
  );
  const features = [...adapter.features].sort();
  add("Features", features.join(", ") || "(none)");
  const core = adapter.features.has(
    "core-features-and-limits" as GPUFeatureName,
  );
  add(
    "core-features-and-limits offered",
    core ? "yes" : "no",
    core ? "pass" : "",
  );
  const limits = adapter.limits as unknown as Record<string, number>;
  const check = (group: Record<string, number>, kind: string) => {
    for (const [name, needed] of Object.entries(group)) {
      const have = limits[name];
      const ok = have !== undefined && have >= needed;
      add(
        `Limit ${name} (${kind})`,
        `${have} (engine needs ${needed}): ${ok ? "pass" : "FAIL"}`,
        ok ? "pass" : "fail",
      );
    }
  };
  check(BASE_BINDING_LIMITS, "binding count");
  check(BASE_CAPACITY_LIMITS, "capacity");
  const wanted = requiredLimitsFor("base", adapter.limits);
  const tier = `base (the engine's default: binding counts at WebGPU's defaults, capacities requested at the adapter's: ${Object.entries(
    wanted,
  )
    .map(([k, v]) => `${k}=${v}`)
    .join(", ")})`;
  add("Capability tier the engine picks", tier);
  const has = (n: string) => adapter.features.has(n as GPUFeatureName);
  add(
    "Engine capabilities from features",
    [
      `indirectFirstInstance=${has("indirect-first-instance")}`,
      `timestampQuery=${has("timestamp-query")}`,
      `subgroups=${has("subgroups")}`,
      `shaderF16=${has("shader-f16")}`,
      `float32Blendable=${has("float32-blendable")}`,
      `bc=${has("texture-compression-bc")}`,
      `etc2=${has("texture-compression-etc2")}`,
      `astc=${has("texture-compression-astc")}`,
    ].join(", "),
  );
  const all = Object.keys(Object.getPrototypeOf(adapter.limits)).sort();
  add("All adapter limits", all.map((k) => `${k}=${limits[k]}`).join(", "));
  return { text: lines, html: table(rows), tier };
}

function table(rows: string[]): string {
  return `<table>${rows.join("")}</table>`;
}

function esc(s: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => entities[c]!);
}

// ------------------------------------------------------------ shared helpers

function message(e: unknown): string {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

/** What happened while waiting on the GPU. */
type Wait = "done" | "lost" | "timeout";

/**
 * Watches one device: its loss (kept, with the reason), its uncaptured
 * errors, and its error scopes.
 */
class Watch {
  lostInfo: GPUDeviceLostInfo | undefined;
  readonly uncaptured: string[] = [];
  private readonly lostPromise: Promise<"lost">;

  constructor(
    readonly device: GPUDevice,
    onLost?: (cb: (info: GPUDeviceLostInfo) => void) => void,
  ) {
    this.lostPromise = new Promise((resolve) => {
      const note = (info: GPUDeviceLostInfo) => {
        // "destroyed" is our own cleanup, not a loss.
        if (info.reason === "destroyed" && !this.lostInfo) {
          return;
        }
        this.lostInfo ??= info;
        resolve("lost");
      };
      void device.lost.then(note);
      onLost?.(note);
    });
    device.addEventListener("uncapturederror", (event) => {
      this.uncaptured.push(
        (event as GPUUncapturedErrorEvent).error.message.slice(0, 400),
      );
    });
  }

  push(): void {
    for (const filter of ["validation", "out-of-memory", "internal"] as const) {
      this.device.pushErrorScope(filter);
    }
  }

  async pop(): Promise<string[]> {
    const out: string[] = [];
    for (const filter of ["internal", "out-of-memory", "validation"] as const) {
      try {
        const error = await Promise.race([
          this.device.popErrorScope(),
          delay(1000).then(() => "no answer" as const),
        ]);
        if (error === "no answer") {
          out.push(`${filter}: popErrorScope did not answer`);
        } else if (error) {
          out.push(`${filter}: ${error.message.slice(0, 600)}`);
        }
      } catch (e) {
        out.push(`${filter}: ${message(e)}`);
      }
    }
    return out;
  }

  /** Waits for submitted work, a loss, or the timeout. */
  async settle(): Promise<Wait> {
    const result = await Promise.race([
      this.device.queue.onSubmittedWorkDone().then(() => "done" as const),
      this.lostPromise,
      delay(TIMEOUT_MS).then(() => "timeout" as const),
    ]);
    return this.lostInfo ? "lost" : result;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function outcome(): Outcome {
  return { status: "pass", reason: "", scopes: [], times: [], notes: [] };
}

/** Folds a wait result and the watch's findings into an outcome. */
function conclude(out: Outcome, watch: Watch, wait: Wait, scopes: string[]) {
  out.scopes.push(
    ...scopes,
    ...watch.uncaptured.map((u) => `uncaptured: ${u}`),
  );
  if (watch.lostInfo) {
    out.status = "lost";
    out.reason = `device lost (${watch.lostInfo.reason}): ${watch.lostInfo.message}`;
  } else if (wait === "timeout") {
    out.status = "timeout";
    out.reason = `no answer from the GPU in ${TIMEOUT_MS / 1000} s: treated as a hang`;
  } else if (out.status === "pass" && out.scopes.length > 0) {
    out.status = "fail";
    out.reason = "the error scopes caught errors";
  }
}

/**
 * Times `frame` (one submit): warm-up, then the average from submit to the
 * GPU finishing. Stops at the first loss or timeout.
 */
async function timeFrames(
  watch: Watch,
  frame: () => void,
  label: string,
  out: Outcome,
): Promise<Wait> {
  for (let i = 0; i < WARM_FRAMES; i++) {
    frame();
    const wait = await watch.settle();
    if (wait !== "done") {
      return wait;
    }
  }
  let wall = 0;
  let cpu = 0;
  for (let i = 0; i < TIMED_FRAMES; i++) {
    const start = performance.now();
    frame();
    cpu += performance.now() - start;
    const wait = await watch.settle();
    if (wait !== "done") {
      return wait;
    }
    wall += performance.now() - start;
  }
  out.times.push({
    label,
    ms: wall / TIMED_FRAMES,
    cpuMs: cpu / TIMED_FRAMES,
  });
  return "done";
}

// ---------------------------------------------------------------- raw steps

const SIZE = 64;
const FORMAT: GPUTextureFormat = "rgba8unorm";

interface Raw {
  device: GPUDevice;
  module: GPUShaderModule;
  target: GPUTexture;
  vertices: GPUBuffer;
  indices: GPUBuffer;
  /** Plain draw, indexed draw and their indirect arguments. */
  args: GPUBuffer;
  renderPipeline: GPURenderPipeline;
}

/** Runs `setup`'s frame on its own small device (default limits, no features). */
async function rawStep(
  label: string,
  setup: (raw: Raw, out: Outcome) => (() => void) | Promise<() => void>,
): Promise<Outcome> {
  const out = outcome();
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    out.status = "fail";
    out.reason = "no adapter";
    return out;
  }
  const device = await adapter.requestDevice();
  const watch = new Watch(device);
  let wait: Wait = "done";
  let scopes: string[] = [];
  try {
    watch.push();
    const module = device.createShaderModule({ code: wgsl });
    const vertices = device.createBuffer({
      size: 24,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(
      vertices,
      0,
      new Float32Array([-0.5, -0.5, 0.5, -0.5, 0, 0.5]),
    );
    const indices = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(indices, 0, new Uint16Array([0, 1, 2, 0]));
    const args = device.createBuffer({
      size: 20,
      usage:
        GPUBufferUsage.INDIRECT |
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_DST,
    });
    const target = device.createTexture({
      size: [SIZE, SIZE],
      format: FORMAT,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const renderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vertexMain",
        buffers: [
          {
            arrayStride: 8,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fragmentMain",
        targets: [{ format: FORMAT }],
      },
      primitive: { topology: "triangle-list" },
    });
    const frame = await setup(
      { device, module, target, vertices, indices, args, renderPipeline },
      out,
    );
    wait = await timeFrames(watch, frame, label, out);
    if (wait === "done") {
      scopes = await watch.pop();
    }
  } catch (e) {
    out.status = "fail";
    out.reason = message(e);
  }
  conclude(out, watch, wait, scopes);
  if (out.status !== "lost" && out.status !== "timeout") {
    device.destroy();
  }
  return out;
}

/** A frame: one render pass over the target; `draw` records its draws. */
function renderFrame(
  raw: Raw,
  draw: (pass: GPURenderPassEncoder) => void,
  before?: (encoder: GPUCommandEncoder) => void,
): () => void {
  const view = raw.target.createView();
  return () => {
    const encoder = raw.device.createCommandEncoder();
    before?.(encoder);
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          clearValue: [0, 0, 0, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(raw.renderPipeline);
    pass.setVertexBuffer(0, raw.vertices);
    draw(pass);
    pass.end();
    raw.device.queue.submit([encoder.finish()]);
  };
}

const writeArgs = (raw: Raw, words: number[]) =>
  raw.device.queue.writeBuffer(raw.args, 0, new Uint32Array(words));

const rawSteps: Step[] = [
  {
    id: "direct",
    title: "Plain direct draw",
    what: "draw(3) into a 64 by 64 texture, raw WebGPU. No indirect anything.",
    run: () =>
      rawStep("direct draw", (raw) =>
        renderFrame(raw, (pass) => pass.draw(3, 4)),
      ),
  },
  {
    id: "drawIndirect",
    title: "drawIndirect",
    what: "The article's case: drawIndirect with arguments from a buffer.",
    run: () =>
      rawStep("drawIndirect", (raw) => {
        writeArgs(raw, [3, 4, 0, 0, 0]);
        return renderFrame(raw, (pass) => pass.drawIndirect(raw.args, 0));
      }),
  },
  {
    id: "drawIndexedIndirect",
    title: "drawIndexedIndirect",
    what: "The article's case: drawIndexedIndirect with arguments from a buffer.",
    run: () =>
      rawStep("drawIndexedIndirect", (raw) => {
        writeArgs(raw, [3, 4, 0, 0, 0]);
        return renderFrame(raw, (pass) => {
          pass.setIndexBuffer(raw.indices, "uint16");
          pass.drawIndexedIndirect(raw.args, 0);
        });
      }),
  },
  {
    id: "bundleIndirect",
    title: "drawIndexedIndirect in a render bundle",
    what: "As the engine does it: the indirect draw recorded once in a bundle, replayed each frame.",
    run: () =>
      rawStep("indirect in a bundle", (raw) => {
        writeArgs(raw, [3, 4, 0, 0, 0]);
        const bundleEncoder = raw.device.createRenderBundleEncoder({
          colorFormats: [FORMAT],
        });
        bundleEncoder.setPipeline(raw.renderPipeline);
        bundleEncoder.setVertexBuffer(0, raw.vertices);
        bundleEncoder.setIndexBuffer(raw.indices, "uint16");
        bundleEncoder.drawIndexedIndirect(raw.args, 0);
        const bundle = bundleEncoder.finish();
        const view = raw.target.createView();
        return () => {
          const encoder = raw.device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view,
                clearValue: [0, 0, 0, 1],
                loadOp: "clear",
                storeOp: "store",
              },
            ],
          });
          pass.executeBundles([bundle]);
          pass.end();
          raw.device.queue.submit([encoder.finish()]);
        };
      }),
  },
  {
    id: "computeIndirect",
    title: "Compute writes the arguments, then a bundle draws from them",
    what: "A one-thread kernel writes the five argument words (the instance count clamped to 4) each frame; a bundle's drawIndexedIndirect reads them. As the engine's cull does.",
    run: () =>
      rawStep("compute then indirect", (raw) => {
        const counts = raw.device.createBuffer({
          size: 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        raw.device.queue.writeBuffer(counts, 0, new Uint32Array([3]));
        const pipeline = raw.device.createComputePipeline({
          layout: "auto",
          compute: { module: raw.module, entryPoint: "writeArgs" },
        });
        const group = raw.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: counts } },
            { binding: 1, resource: { buffer: raw.args } },
          ],
        });
        const bundleEncoder = raw.device.createRenderBundleEncoder({
          colorFormats: [FORMAT],
        });
        bundleEncoder.setPipeline(raw.renderPipeline);
        bundleEncoder.setVertexBuffer(0, raw.vertices);
        bundleEncoder.setIndexBuffer(raw.indices, "uint16");
        bundleEncoder.drawIndexedIndirect(raw.args, 0);
        const bundle = bundleEncoder.finish();
        const view = raw.target.createView();
        return () => {
          const encoder = raw.device.createCommandEncoder();
          const compute = encoder.beginComputePass();
          compute.setPipeline(pipeline);
          compute.setBindGroup(0, group);
          compute.dispatchWorkgroups(1);
          compute.end();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view,
                clearValue: [0, 0, 0, 1],
                loadOp: "clear",
                storeOp: "store",
              },
            ],
          });
          pass.executeBundles([bundle]);
          pass.end();
          raw.device.queue.submit([encoder.finish()]);
        };
      }),
  },
];

// -------------------------------------------------------------- engine steps

type Lib = typeof import("../src/index.ts");

interface Scene {
  side: number;
  shadows: boolean;
}

/**
 * The real engine on a small procedural scene: boxes of a few sizes and
 * colours, one translucent, in a `side` by `side` grid near Philadelphia.
 * No network, no token. Each of `modes` is timed in turn.
 */
async function engineStep(
  scene: Scene,
  modes: Array<"indirect" | "direct">,
): Promise<Outcome> {
  const out = outcome();
  const lib: Lib = await import("../src/index.ts");
  const {
    Engine,
    CanvasTarget,
    Ellipsoid,
    createBox,
    eastNorthUpToFixedFrame,
    fromDegrees,
    mat4,
    vec3,
    MaterialFlags,
  } = lib;
  const deg = Math.PI / 180;
  let engine: Awaited<ReturnType<Lib["Engine"]["create"]>> | undefined;
  let watch: Watch | undefined;
  let wait: Wait = "done";
  let scopes: string[] = [];
  try {
    // Engine.create's warm-up renders a first frame, itself an indirect
    // draw (Engine.warmUp), so a hang can show before any mode runs.
    let lostCallback: ((info: GPUDeviceLostInfo) => void) | undefined;
    const lostEarly: GPUDeviceLostInfo[] = [];
    const creating = Engine.create({ recoverFromLoss: false });
    engine = await Promise.race([
      creating,
      delay(TIMEOUT_MS * 2).then(() => undefined),
    ]);
    if (!engine) {
      out.status = "timeout";
      out.reason = `Engine.create did not finish in ${(TIMEOUT_MS * 2) / 1000} s`;
      return out;
    }
    const gpu = engine.gpu;
    gpu.events.on("lost", (info) => {
      lostEarly.push(info);
      lostCallback?.(info);
    });
    watch = new Watch(gpu.device, (cb) => {
      lostCallback = cb;
      lostEarly.forEach(cb);
    });
    gpu.events.on("error", (error) => {
      watch!.uncaptured.push(error.message.slice(0, 400));
    });
    watch.push();
    const ellipsoid = Ellipsoid.WGS84;
    const center = fromDegrees(-75.1652, 39.9526);
    const target = ellipsoid.cartographicToCartesian(center, vec3.vec3());
    const world = engine.createWorld({
      maxDraws: scene.side * scene.side + 16,
      maxMaterials: 8,
      vertexBytes: 1 << 20,
      indexBytes: 1 << 20,
    });
    const box = world.addMesh(createBox());
    const glass = world.addMaterial({
      baseColor: [0.4, 0.7, 1, 0.5],
      flags: MaterialFlags.alphaBlend,
    });
    const colors = [
      [0.8, 0.3, 0.25, 1],
      [0.3, 0.7, 0.35, 1],
      [0.6, 0.6, 0.65, 1],
      [0.9, 0.8, 0.3, 1],
    ] as const;
    const spacing = 12;
    for (let j = 0; j < scene.side; j++) {
      for (let i = 0; i < scene.side; i++) {
        const east = (i - scene.side / 2) * spacing;
        const north = (j - scene.side / 2) * spacing;
        const origin = ellipsoid.cartographicToCartesian(
          {
            longitude:
              center.longitude + east / (6378137 * Math.cos(center.latitude)),
            latitude: center.latitude + north / 6378137,
            height: 0,
          },
          vec3.vec3(),
        );
        const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
        mat4.setTranslation(enu, vec3.vec3());
        const size = 3 + ((i * 7 + j * 3) % 4) * 1.5;
        const local = mat4.fromScale(mat4.mat4(), size, size, size);
        local[14] = size / 2;
        const glassy = (i + j) % 9 === 4;
        world.addDraw({
          mesh: box,
          origin,
          model: mat4.multiply(mat4.mat4(), enu, local),
          radius: size,
          color: colors[(i + j) % colors.length]!,
          ...(glassy ? { material: glass } : {}),
        });
      }
    }
    const canvas = $<HTMLCanvasElement>("view");
    const view = engine.addView({
      target: new CanvasTarget(canvas),
      world,
      shadows: scene.shadows,
    });
    view.camera.lookAt(target, 0.4, -45 * deg, scene.side * 14 + 40);
    // The sun overhead (it is a placeholder in the engine), so shadows draw.
    const up = vec3.normalize(vec3.vec3(), target);
    engine.sunDirection[0] = up[0]!;
    engine.sunDirection[1] = up[1]!;
    engine.sunDirection[2] = up[2]!;
    for (const mode of modes) {
      world.submission = mode;
      wait = await timeFrames(
        watch,
        () => engine!.renderFrame(),
        `engine, ${mode}, ${scene.side * scene.side} draws${scene.shadows ? ", shadows" : ""}`,
        out,
      );
      if (wait !== "done") {
        break;
      }
      out.notes.push(
        `${mode}: engine reports ${engine.stats.draws} draws in ${engine.stats.batches} batches, ${engine.stats.views} view(s); timed passes: ${Object.keys(engine.gpuPasses).join(", ") || "none"}`,
      );
    }
    if (wait === "done") {
      scopes = await watch.pop();
    }
  } catch (e) {
    out.status = "fail";
    out.reason = message(e);
  }
  if (watch) {
    conclude(out, watch, wait, scopes);
  }
  if (engine && out.status !== "lost" && out.status !== "timeout") {
    engine.destroy();
  }
  return out;
}

const engineSteps: Step[] = [
  {
    id: "engineIndirect",
    title: "Engine, small scene, submission = indirect",
    what: "The real engine: 9 boxes (one translucent), no shadows, the default submission. Engine.create itself renders one indirect draw first.",
    run: () => engineStep({ side: 3, shadows: false }, ["indirect"]),
  },
  {
    id: "engineDirect",
    title: "Engine, small scene, submission = direct",
    what: 'The same scene with world.submission = "direct": CPU-baked draw arguments. The cull kernels still run; only the draw calls differ. Engine.create\'s warm-up frame is still indirect.',
    run: () => engineStep({ side: 3, shadows: false }, ["direct"]),
  },
  {
    id: "engineShadows",
    title: "Engine, shadows on",
    what: "25 boxes with cascaded shadows (the sun set overhead), indirect then direct.",
    run: () => engineStep({ side: 5, shadows: true }, ["indirect", "direct"]),
  },
  {
    id: "engineMany",
    title: "Engine, a few thousand draws, shadows on",
    what: "4,096 boxes (64 by 64) with shadows, indirect then direct. Last because it is the heaviest.",
    run: () => engineStep({ side: 64, shadows: true }, ["indirect", "direct"]),
  },
];

const steps: Step[] = [...rawSteps, ...engineSteps];

// ------------------------------------------------------------------ the page

const results = new Map<string, Outcome>();
let stopped = false;
let running = false;
let adapterText: string[] = [];

function render(): void {
  const rows = steps.map((step, index) => {
    const result = results.get(step.id);
    const previous = index === 0 ? true : results.has(steps[index - 1]!.id);
    const enabled = !stopped && !running && !result && previous;
    const status = result
      ? `<span class="${result.status === "timeout" ? "lost" : result.status}">${result.status.toUpperCase()}</span>`
      : '<span class="idle">not run</span>';
    const detail = result
      ? [
          result.reason && `<div>${esc(result.reason)}</div>`,
          ...result.times.map(
            (t) =>
              `<div>${esc(t.label)}: ${t.ms.toFixed(2)} ms per frame${
                t.cpuMs === undefined ? "" : ` (cpu ${t.cpuMs.toFixed(2)} ms)`
              }</div>`,
          ),
          ...result.notes.map((n) => `<div>${esc(n)}</div>`),
          ...result.scopes.map((s) => `<div class="fail">${esc(s)}</div>`),
        ]
          .filter(Boolean)
          .join("")
      : "";
    return (
      `<tr><td>${index + 1}</td><td><strong>${esc(step.title)}</strong><br>${esc(step.what)}</td>` +
      `<td><button type="button" data-step="${step.id}" ${enabled ? "" : "disabled"}>Run</button></td>` +
      `<td>${status}</td><td>${detail}</td></tr>`
    );
  });
  $("steps").innerHTML =
    `<tr><th>#</th><th>Step</th><th></th><th>Result</th><th>Detail</th></tr>${rows.join("")}`;
  $("state").textContent = stopped
    ? "Stopped: a step lost the device or hung. Nothing more will run. Copy the report, then reload the page to start again."
    : running
      ? "Running a step. If the screen freezes, wait a few seconds."
      : "Run each step in order. The next one unlocks when the one before has run.";
  $<HTMLTextAreaElement>("report").value = buildReport();
}

async function runStep(id: string): Promise<void> {
  const step = steps.find((s) => s.id === id);
  if (!step || stopped || running) {
    return;
  }
  running = true;
  render();
  let result: Outcome;
  const start = performance.now();
  try {
    result = await step.run();
  } catch (e) {
    result = { ...outcome(), status: "fail", reason: message(e) };
  }
  result.notes.push(
    `took ${((performance.now() - start) / 1000).toFixed(1)} s`,
  );
  results.set(id, result);
  if (result.status === "lost" || result.status === "timeout") {
    stopped = true;
  }
  running = false;
  render();
}

function buildReport(): string {
  const out: string[] = [
    "GPU check report",
    `Page: ${location.pathname}`,
    `Time: ${new Date().toISOString()}`,
    "",
    "== Adapter ==",
    ...adapterText,
    "",
    "== Steps ==",
  ];
  for (const [index, step] of steps.entries()) {
    const r = results.get(step.id);
    out.push(
      `${index + 1}. ${step.title}: ${r ? r.status.toUpperCase() : "not run"}`,
    );
    if (!r) {
      continue;
    }
    if (r.reason) {
      out.push(`   reason: ${r.reason}`);
    }
    for (const t of r.times) {
      out.push(
        `   frame time, ${t.label}: ${t.ms.toFixed(2)} ms${
          t.cpuMs === undefined ? "" : ` (cpu ${t.cpuMs.toFixed(2)} ms)`
        }`,
      );
    }
    for (const n of r.notes) {
      out.push(`   ${n}`);
    }
    out.push(
      r.scopes.length === 0
        ? "   error scopes: none"
        : `   error scopes: ${r.scopes.join(" | ")}`,
    );
  }
  if (stopped) {
    out.push("", "The run stopped after a device loss or a hang.");
  }
  out.push(
    "",
    "== To look up by hand ==",
    "- Driver version and GPU name: chrome://gpu (or edge://gpu), under Driver Information.",
    "- Windows version (winver), and whether the laptop was on battery or power.",
    "- Whether the screen froze or another app was affected.",
  );
  return out.join("\n");
}

async function copyReport(): Promise<void> {
  const text = buildReport();
  const area = $<HTMLTextAreaElement>("report");
  let ok: boolean;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    area.select();
    ok = document.execCommand("copy");
  }
  $("copied").textContent = ok
    ? "Copied."
    : "Copy failed: select the text below.";
}

async function main(): Promise<void> {
  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-step]",
    );
    if (button) {
      void runStep(button.dataset.step!);
    }
  });
  $("copy").addEventListener("click", () => void copyReport());
  try {
    const report = await adapterReport();
    adapterText = report.text;
    $("adapter").innerHTML = report.html;
  } catch (e) {
    adapterText = [`Adapter report failed: ${message(e)}`];
    $("adapter").textContent = adapterText[0]!;
  }
  render();
}

void main();
