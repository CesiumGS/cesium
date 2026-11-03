import {
  Camera,
  CanvasTarget,
  CustomShader,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type World,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";

/**
 * Custom shaders' costs (plan §3.4, "Custom shading" exit): frames while a
 * new shader's pipelines compile in the background (its content draws with
 * the engine's shader meanwhile), and the CPU and GPU time of the same
 * boxes split across more shaders (a batch and a pipeline switch each).
 */
const TEMPLATE = `
<h1>Custom shader costs</h1>
<p>
  <b>Arrival</b>: boxes drawn every frame on a canvas while shaders the
  engine hasn't seen arrive one at a time; frames over 1.5 s from each
  arrival (it compiles, then the pipelines its content needs are made in
  the background), against the same time with no change. <b>Batching</b>: 4,096 boxes at 1920×1080 offscreen,
  spread over 1 to 64 shaders that cost the same to run: CPU and GPU time
  per frame, and per extra shader.
</p>
<div class="status">Run to measure.</div>
<canvas data-id="canvas" style="width: 640px; height: 360px"></canvas>
<table data-id="arrival"></table>
<table data-id="batching"></table>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);

/** A shader distinct from every other (`n`) that costs the same. */
function variant(
  n: number,
  stage: "vertex" | "fragment" | "both",
): CustomShader {
  const k = (1 + n / 1000).toFixed(6);
  const fragment = `fn fragmentMain(fsInput: FragmentInput, material: ptr<function, MaterialOutput>) {
  (*material).baseColor = (*material).baseColor * ${k};
}`;
  const vertex = `fn vertexMain(vsInput: VertexInput, vsOutput: ptr<function, VertexOutput>) {
  (*vsOutput).positionMC = vsInput.positionMC * ${k};
}`;
  return new CustomShader({
    label: `variant ${n}`,
    ...(stage !== "fragment" ? { vertex } : {}),
    ...(stage !== "vertex" ? { fragment } : {}),
  });
}

/** A grid of `side`² boxes; box `i` with `shaderOf(i)`. */
function grid(
  world: World,
  side: number,
  shaderOf: (i: number) => CustomShader | undefined,
): void {
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
  const box = world.addMesh(createBox());
  const material = world.addMaterial({
    baseColor: [0.7, 0.5, 0.3, 1],
    roughness: 0.6,
  });
  for (let i = 0; i < side * side; i++) {
    const local = mat4.fromScale(mat4.mat4(), 6, 6, 6 + (i % 7) * 3);
    mat4.setTranslation(
      local,
      vec3.vec3(
        ((i % side) - side / 2) * 10,
        (Math.floor(i / side) - side / 2) * 10,
        3,
      ),
    );
    const shader = shaderOf(i);
    world.addDraw({
      mesh: box,
      origin,
      model: mat4.multiply(mat4.mat4(), enu, local),
      material,
      ...(shader ? { shader } : {}),
    });
  }
}

function look(camera: Camera, range: number): void {
  camera.near = 1;
  camera.lookAt(
    Ellipsoid.WGS84.cartographicToCartesian(
      { ...SITE, height: 0 },
      vec3.vec3(),
    ),
    30 * deg,
    -35 * deg,
    range,
  );
}

interface ArrivalRow {
  step: string;
  ms: number;
  frames: number;
  over34: number;
  worst: number;
  longFrames: number;
}

interface BatchingRow {
  shaders: number;
  cpuMs: number;
  gpuMs: number;
  perShaderCpu: number;
  perShaderGpu: number;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function arrival(engine: Engine, status: Element): Promise<ArrivalRow[]> {
  const world = engine.createWorld({
    maxDraws: 2048,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  grid(world, 32, () => undefined);
  const canvas = $<HTMLCanvasElement>("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const view = engine.addView({ target: new CanvasTarget(canvas), world });
  look(view.camera, 500);
  engine.renderMode = "continuous";
  engine.start();

  const frames: number[] = [];
  const longFrames: unknown[] = [];
  let observer: PerformanceObserver | undefined;
  try {
    observer = new PerformanceObserver((list) => {
      longFrames.push(...list.getEntries());
    });
    observer.observe({ type: "long-animation-frame", buffered: false });
  } catch {
    // Not supported: the column stays 0.
  }
  let last = performance.now();
  let watching = true;
  const tick = (t: number) => {
    frames.push(t - last);
    last = t;
    if (watching) {
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
  await wait(1000); // warm up

  const rows: ArrivalRow[] = [];
  const measure = async (step: string, action: () => Promise<void>) => {
    status.textContent = `${step}…`;
    frames.length = 0;
    longFrames.length = 0;
    const start = performance.now();
    await action();
    await wait(500); // settled
    const ms = performance.now() - start;
    rows.push({
      step,
      ms,
      frames: frames.length,
      over34: frames.filter((f) => f > 34).length,
      worst: Math.max(...frames),
      longFrames: longFrames.length,
    });
    renderArrival(rows);
  };
  await measure("no change (1.5 s)", () => wait(1000));
  const origin = Ellipsoid.WGS84.cartographicToCartesian(SITE, vec3.vec3());
  const box = world.addMesh(createBox());
  for (const [n, stage] of [
    [9001, "fragment"],
    [9002, "vertex"],
    [9003, "both"],
  ] as const) {
    // Compiled on demand, only the pipelines the box needs (as content
    // arriving with a shader is), over 1.5 s.
    await measure(`new shader (${stage}) arrives`, async () => {
      world.addDraw({
        mesh: box,
        origin,
        model: mat4.fromScale(mat4.mat4(), 20, 20, 20),
        shader: variant(n, stage),
      });
      await wait(1000);
    });
  }
  watching = false;
  observer?.disconnect();
  engine.stop();
  engine.renderMode = "onDemand";
  engine.removeView(view);
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  return rows;
}

async function batching(
  engine: Engine,
  status: Element,
): Promise<BatchingRow[]> {
  const rows: BatchingRow[] = [];
  const target = new OffscreenTarget(1920, 1080);
  const shaders = Array.from({ length: 64 }, (_, n) => variant(n, "both"));
  await Promise.all(shaders.map((s) => engine.compileShader(s)));
  for (const count of [0, 1, 2, 4, 8, 16, 32, 64]) {
    status.textContent = `batching: ${count} shaders…`;
    const world = engine.createWorld({
      maxDraws: 4200,
      vertexBytes: 1 << 20,
      indexBytes: 1 << 20,
    });
    grid(world, 64, (i) => (count === 0 ? undefined : shaders[i % count]));
    const view = engine.addView({ target, world });
    look(view.camera, 900);
    for (let i = 0; i < 150; i++) {
      engine.renderFrame();
      await engine.gpu.device.queue.onSubmittedWorkDone();
    }
    const base = rows[0];
    const cpuMs = engine.stats.cpuMs;
    const gpuMs = engine.stats.gpuMs;
    rows.push({
      shaders: count,
      cpuMs,
      gpuMs,
      perShaderCpu:
        base && count > 1 ? (cpuMs - rows[1]!.cpuMs) / (count - 1) : 0,
      perShaderGpu:
        base && count > 1 ? (gpuMs - rows[1]!.gpuMs) / (count - 1) : 0,
    });
    renderBatching(rows);
    engine.removeView(view);
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();
  }
  target.destroy();
  return rows;
}

let engineInUse: Engine | undefined;

async function runShaderCost(): Promise<{
  arrival: ArrivalRow[];
  batching: BatchingRow[];
}> {
  const status = root.querySelector(".status")!;
  const engine = await Engine.create();
  engineInUse = engine;
  vec3.normalize(
    engine.sunDirection,
    vec3.add(
      vec3.vec3(),
      Ellipsoid.WGS84.cartographicToCartesian(SITE, vec3.vec3()),
      vec3.vec3(2e6, -1e6, 3e6),
    ),
  );
  try {
    const a = await arrival(engine, status);
    const b = await batching(engine, status);
    status.textContent = "Done.";
    return { arrival: a, batching: b };
  } finally {
    engine.destroy();
    engineInUse = undefined;
  }
}

function renderArrival(rows: ArrivalRow[]): void {
  $("arrival").innerHTML =
    `<tr><th>arrival</th><th>watched</th><th>frames</th><th>&gt; 34 ms</th><th>worst frame</th><th>long frames</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.step}</td><td>${(r.ms / 1000).toFixed(2)} s</td><td>${r.frames}</td><td>${r.over34}</td><td>${r.worst.toFixed(1)} ms</td><td>${r.longFrames}</td></tr>`,
      )
      .join("")}`;
}

function renderBatching(rows: BatchingRow[]): void {
  $("batching").innerHTML =
    `<tr><th>shaders</th><th>CPU / frame</th><th>GPU / frame</th><th>CPU per extra shader</th><th>GPU per extra shader</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.shaders === 0 ? "engine's" : r.shaders}</td><td>${r.cpuMs.toFixed(3)} ms</td><td>${r.gpuMs.toFixed(3)} ms</td><td>${r.shaders > 1 ? `${(r.perShaderCpu * 1000).toFixed(1)} µs` : ""}</td><td>${r.shaders > 1 ? `${(r.perShaderGpu * 1000).toFixed(1)} µs` : ""}</td></tr>`,
      )
      .join("")}`;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return {
      run: runShaderCost,
      dispose() {
        engineInUse?.destroy();
      },
    };
  },
};
