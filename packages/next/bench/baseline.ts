import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  createBox,
  eastNorthUpToFixedFrame,
  mat4,
  vec3,
  type World,
} from "../src/index.ts";

// CesiumJS 1.x, loaded from the repo build as a global (see baseline.html).
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;

const deg = Math.PI / 180;
const ellipsoid = Ellipsoid.WGS84;
const center = { longitude: -75.1652 * deg, latitude: 39.9526 * deg };
const FRAMES = 60;

// ---------------------------------------------------------------- API call counting

const counters = { webgl: 0, webgpu: 0 };

function countCalls(
  proto: object | undefined,
  counter: "webgl" | "webgpu",
): void {
  if (!proto) {
    return;
  }
  for (const name of Object.getOwnPropertyNames(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (
      !descriptor ||
      typeof descriptor.value !== "function" ||
      name === "constructor"
    ) {
      continue;
    }
    const original = descriptor.value as (...args: unknown[]) => unknown;
    Object.defineProperty(proto, name, {
      ...descriptor,
      value: function (this: unknown, ...args: unknown[]) {
        counters[counter]++;
        return original.apply(this, args);
      },
    });
  }
}

countCalls(globalThis.WebGL2RenderingContext?.prototype, "webgl");
for (const type of [
  "GPUDevice",
  "GPUQueue",
  "GPUCommandEncoder",
  "GPURenderPassEncoder",
  "GPUComputePassEncoder",
  "GPURenderBundleEncoder",
] as const) {
  countCalls(
    (globalThis as unknown as Record<string, { prototype: object }>)[type]
      ?.prototype,
    "webgpu",
  );
}

// ---------------------------------------------------------------- scene

interface BoxSpec {
  longitude: number;
  latitude: number;
  size: number;
  height: number;
  color: [number, number, number];
}

function boxes(count: number): BoxSpec[] {
  const side = Math.ceil(Math.sqrt(count));
  const spacing = 0.0004 * deg;
  const out: BoxSpec[] = [];
  for (let k = 0; k < count; k++) {
    const i = k % side;
    const j = Math.floor(k / side);
    out.push({
      longitude: center.longitude + (i - side / 2) * spacing,
      latitude: center.latitude + (j - side / 2) * spacing * 0.77,
      size: 18,
      height: 10 + ((i * 7 + j * 13) % 9) * 6,
      color: [0.4 + (i % 4) * 0.15, 0.5, 0.4 + (j % 4) * 0.15],
    });
  }
  return out;
}

/** Camera that frames the whole grid, as (heading, pitch, range). */
function cameraRange(count: number): number {
  const side = Math.ceil(Math.sqrt(count));
  return Math.max(1500, side * 0.0004 * deg * ellipsoid.maximumRadius * 1.6);
}

function addViewElement(kind: "legacy" | "next"): HTMLElement {
  const element = document.createElement(kind === "legacy" ? "div" : "canvas");
  element.className = kind === "legacy" ? "legacy" : "";
  document.querySelector("#views")!.appendChild(element);
  return element;
}

// ---------------------------------------------------------------- 1.x

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped 1.x API
type Viewer = any;

function createViewer(container: HTMLElement, logDepth = true): Viewer {
  const viewer = new Cesium.Viewer(container, {
    globe: false,
    baseLayer: false,
    skyBox: false,
    skyAtmosphere: false,
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    msaaSamples: 4,
    useDefaultRenderLoop: false,
    creditContainer: document.querySelector("#credits"),
  });
  viewer.scene.logarithmicDepthBuffer = logDepth;
  viewer.scene.highDynamicRange = true;
  viewer.scene.fog.enabled = false;
  viewer.scene.sun = undefined;
  viewer.scene.moon = undefined;
  return viewer;
}

/** One Primitive (one draw command) per box, as 1.x does per tile content. */
function populateLegacy(viewer: Viewer, specs: BoxSpec[]): void {
  const appearance = new Cesium.PerInstanceColorAppearance({
    flat: true,
    translucent: false,
  });
  for (const b of specs) {
    viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: Cesium.BoxGeometry.fromDimensions({
            dimensions: new Cesium.Cartesian3(b.size, b.size, b.height),
            vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
          }),
          modelMatrix: Cesium.Matrix4.multiplyByTranslation(
            Cesium.Transforms.eastNorthUpToFixedFrame(
              Cesium.Cartesian3.fromRadians(b.longitude, b.latitude, 0),
            ),
            new Cesium.Cartesian3(0, 0, b.height / 2),
            new Cesium.Matrix4(),
          ),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              new Cesium.Color(b.color[0], b.color[1], b.color[2], 1),
            ),
          },
        }),
        appearance,
        asynchronous: false,
      }),
    );
  }
}

function lookAtLegacy(viewer: Viewer, range: number, heading = 30): void {
  viewer.camera.lookAt(
    Cesium.Cartesian3.fromRadians(center.longitude, center.latitude, 0),
    new Cesium.HeadingPitchRange(heading * deg, -35 * deg, range),
  );
}

function glFinish(viewer: Viewer): void {
  viewer.scene.context._gl.finish();
}

// ---------------------------------------------------------------- 2.0

function populateNext(world: World, specs: BoxSpec[]): void {
  const mesh = world.addMesh(createBox());
  const local = mat4.mat4();
  for (const b of specs) {
    const origin = ellipsoid.cartographicToCartesian(
      { longitude: b.longitude, latitude: b.latitude, height: 0 },
      vec3.vec3(),
    );
    const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
    mat4.setTranslation(enu, vec3.vec3());
    mat4.fromScale(local, b.size, b.size, b.height);
    local[14] = b.height / 2;
    const srgb = (c: number) => c ** 2.2; // match 1.x czm_gammaCorrect
    world.addDraw({
      mesh,
      origin,
      model: mat4.multiply(mat4.mat4(), enu, local),
      radius: Math.hypot(b.size, b.size, b.height),
      color: [srgb(b.color[0]), srgb(b.color[1]), srgb(b.color[2]), 1],
      unlit: true,
    });
  }
}

const centerCartesian = () =>
  ellipsoid.cartographicToCartesian({ ...center, height: 0 }, vec3.vec3());

// ---------------------------------------------------------------- measurement

interface FrameSample {
  cpuMs: number;
  frameMs: number;
  apiCalls: number;
}

/**
 * Brings both engines to a known idle state before a first-frame timing, so
 * one engine's leftovers don't land in the other's number: a forced major GC
 * (the runner exposes `gc`) and an idle WebGPU queue. The WebGL side is
 * finished and its context released in `destroyLegacy`.
 */
async function settle(engine: Engine): Promise<void> {
  (globalThis as { gc?: () => void }).gc?.();
  await engine.gpu.device.queue.onSubmittedWorkDone();
}

/** Finishes 1.x's GL work and releases its context before destroying it. */
function destroyLegacy(viewer: Viewer): void {
  glFinish(viewer);
  viewer.scene.context._gl.getExtension("WEBGL_lose_context")?.loseContext();
  viewer.destroy();
}

function median(values: number[]): number {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
}

function summarize(samples: FrameSample[]): FrameSample {
  return {
    cpuMs: median(samples.map((s) => s.cpuMs)),
    frameMs: median(samples.map((s) => s.frameMs)),
    apiCalls: median(samples.map((s) => s.apiCalls)),
  };
}

function measureLegacy(viewer: Viewer): FrameSample {
  for (let i = 0; i < 10; i++) {
    viewer.render();
  }
  glFinish(viewer);
  const samples: FrameSample[] = [];
  for (let i = 0; i < FRAMES; i++) {
    const calls = counters.webgl;
    const t = performance.now();
    viewer.render();
    const cpu = performance.now() - t;
    const apiCalls = counters.webgl - calls;
    glFinish(viewer);
    samples.push({ cpuMs: cpu, frameMs: performance.now() - t, apiCalls });
  }
  return summarize(samples);
}

async function measureNext(
  engine: Engine,
): Promise<FrameSample & { gpuMs: number }> {
  for (let i = 0; i < 10; i++) {
    engine.renderFrame();
  }
  await engine.gpu.device.queue.onSubmittedWorkDone();
  const samples: FrameSample[] = [];
  for (let i = 0; i < FRAMES; i++) {
    const calls = counters.webgpu;
    const t = performance.now();
    engine.renderFrame();
    const cpu = performance.now() - t;
    const apiCalls = counters.webgpu - calls;
    await engine.gpu.device.queue.onSubmittedWorkDone();
    samples.push({ cpuMs: cpu, frameMs: performance.now() - t, apiCalls });
  }
  return { ...summarize(samples), gpuMs: engine.stats.gpuMs };
}

// ---------------------------------------------------------------- suites

type Row = Record<string, string | number>;
const rows: Row[] = [];

function report(row: Row): void {
  rows.push(row);
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) =>
    typeof v === "number"
      ? Number.isInteger(v)
        ? String(v)
        : v.toFixed(3)
      : String(v ?? "");
  document.querySelector("#results")!.innerHTML =
    `<tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr>${rows
      .map(
        (r) => `<tr>${keys.map((k) => `<td>${cell(r[k])}</td>`).join("")}</tr>`,
      )
      .join("")}`;
}

function status(text: string): void {
  document.querySelector("#status")!.textContent = text;
}

/** H1/H2/H7/H8: per-frame CPU and API calls vs draw count; time to first frame. */
async function drawScaling(engine: Engine, counts: number[]): Promise<void> {
  // All 2.0 runs before any 1.x run: tearing down a 1.x viewer continues
  // asynchronously in the GPU process (even after finish + loseContext) and
  // would land in a later first-frame timing. 2.0's teardown is a few buffer
  // destroys and its queue is drained by `settle`.
  const nextRows = new Map<number, Row>();
  for (const count of counts) {
    const specs = boxes(count);
    const range = cameraRange(count);
    status(`2.0: ${count} draws…`);
    const canvas = addViewElement("next") as HTMLCanvasElement;
    let t = performance.now();
    const world = engine.createWorld({
      maxDraws: count + 1,
      vertexBytes: 1 << 20,
      indexBytes: 1 << 20,
    });
    populateNext(world, specs);
    const view = engine.addView({
      target: new CanvasTarget(canvas),
      world,
      clearColor: [0, 0, 0],
    });
    view.camera.near = 1;
    view.camera.lookAt(centerCartesian(), 30 * deg, -35 * deg, range);
    const nextCreate = performance.now() - t;
    await settle(engine);
    t = performance.now();
    engine.renderFrame();
    const nextFirstFrameCpu = performance.now() - t;
    await engine.gpu.device.queue.onSubmittedWorkDone();
    const nextFirstFrame = performance.now() - t;
    const next = await measureNext(engine);
    nextRows.set(count, {
      suite: "draw scaling",
      engine: "2.0 WebGPU",
      draws: count,
      "create ms": nextCreate,
      "first frame ms": nextFirstFrame,
      "first frame cpu ms": nextFirstFrameCpu,
      "cpu/frame ms": next.cpuMs,
      "frame incl. GPU ms": next.frameMs,
      "API calls/frame": next.apiCalls,
      "gpu ms": next.gpuMs,
    });
    engine.removeView(view);
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();
    canvas.remove();
  }
  for (const count of counts) {
    const specs = boxes(count);
    const range = cameraRange(count);
    status(`1.x: ${count} primitives…`);
    const legacyElement = addViewElement("legacy");
    let t = performance.now();
    const viewer = createViewer(legacyElement);
    populateLegacy(viewer, specs);
    lookAtLegacy(viewer, range);
    const legacyCreate = performance.now() - t;
    await settle(engine);
    t = performance.now();
    viewer.render();
    glFinish(viewer);
    const legacyFirstFrame = performance.now() - t;
    const legacy = measureLegacy(viewer);
    report({
      suite: "draw scaling",
      engine: "1.x WebGL",
      draws: count,
      "create ms": legacyCreate,
      "first frame ms": legacyFirstFrame,
      "cpu/frame ms": legacy.cpuMs,
      "frame incl. GPU ms": legacy.frameMs,
      "API calls/frame": legacy.apiCalls,
    });
    destroyLegacy(viewer);
    legacyElement.remove();
    report(nextRows.get(count)!);
  }
}

/** H3: log depth (gl_FragDepth) on vs off in 1.x. */
function logDepth(count: number): void {
  const specs = boxes(count);
  for (const enabled of [true, false]) {
    const element = addViewElement("legacy");
    const viewer = createViewer(element, enabled);
    populateLegacy(viewer, specs);
    lookAtLegacy(viewer, cameraRange(count));
    const r = measureLegacy(viewer);
    report({
      suite: "log depth",
      engine: `1.x logDepth=${enabled}`,
      draws: count,
      "cpu/frame ms": r.cpuMs,
      "frame incl. GPU ms": r.frameMs,
      "API calls/frame": r.apiCalls,
    });
    viewer.destroy();
    element.remove();
  }
}

/** H5: picking. 1.x re-renders a pick pass synchronously; 2.0 reads the ID target. */
async function picking(engine: Engine, count: number): Promise<void> {
  const specs = boxes(count);
  const element = addViewElement("legacy");
  const viewer = createViewer(element);
  populateLegacy(viewer, specs);
  lookAtLegacy(viewer, cameraRange(count));
  measureLegacy(viewer);
  const position = new Cesium.Cartesian2(160, 90);
  const legacyTimes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t = performance.now();
    viewer.scene.pick(position);
    legacyTimes.push(performance.now() - t);
  }
  report({
    suite: "picking",
    engine: "1.x scene.pick",
    draws: count,
    "main-thread ms": median(legacyTimes),
    "latency ms": median(legacyTimes),
  });
  viewer.destroy();
  element.remove();

  const canvas = addViewElement("next") as HTMLCanvasElement;
  const world = engine.createWorld({
    maxDraws: count + 1,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  populateNext(world, specs);
  const view = engine.addView({ target: new CanvasTarget(canvas), world });
  view.camera.lookAt(
    centerCartesian(),
    30 * deg,
    -35 * deg,
    cameraRange(count),
  );
  await measureNext(engine);
  const mainThread: number[] = [];
  const latency: number[] = [];
  for (let i = 0; i < 20; i++) {
    const rect = view.pixelRect();
    const start = performance.now();
    const result = view.pick(rect.width / 2, rect.height / 2);
    // The pick rides along with the next frame.
    engine.renderFrame();
    mainThread.push(performance.now() - start);
    await result;
    latency.push(performance.now() - start);
  }
  report({
    suite: "picking",
    engine: "2.0 view.pick (incl. its frame)",
    draws: count,
    "main-thread ms": median(mainThread),
    "latency ms": median(latency),
  });
  engine.removeView(view);
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  canvas.remove();
}

/** H10: four views of one scene. 1.x needs four viewers with four copies of the scene. */
async function multiView(engine: Engine, count: number): Promise<void> {
  const specs = boxes(count);
  const range = cameraRange(count);
  let t = performance.now();
  const viewers: Viewer[] = [];
  const elements: HTMLElement[] = [];
  for (let v = 0; v < 4; v++) {
    const element = addViewElement("legacy");
    const viewer = createViewer(element);
    populateLegacy(viewer, specs);
    lookAtLegacy(viewer, range, 30 + v * 90);
    viewers.push(viewer);
    elements.push(element);
  }
  const legacyCreate = performance.now() - t;
  for (const viewer of viewers) {
    measureLegacy(viewer); // warm-up
  }
  const legacyCpu: number[] = [];
  for (let i = 0; i < FRAMES; i++) {
    t = performance.now();
    for (const viewer of viewers) {
      viewer.render();
    }
    legacyCpu.push(performance.now() - t);
  }
  report({
    suite: "4 views",
    engine: "1.x: 4 viewers",
    draws: count,
    "create ms": legacyCreate,
    "cpu/frame ms": median(legacyCpu),
    "scene copies": 4,
  });
  viewers.forEach((viewer) => viewer.destroy());
  elements.forEach((element) => element.remove());

  t = performance.now();
  const world = engine.createWorld({
    maxDraws: count + 1,
    vertexBytes: 1 << 20,
    indexBytes: 1 << 20,
  });
  populateNext(world, specs);
  const canvases: HTMLCanvasElement[] = [];
  const views = [];
  for (let v = 0; v < 4; v++) {
    const canvas = addViewElement("next") as HTMLCanvasElement;
    const view = engine.addView({ target: new CanvasTarget(canvas), world });
    view.camera.lookAt(
      centerCartesian(),
      (30 + v * 90) * deg,
      -35 * deg,
      range,
    );
    canvases.push(canvas);
    views.push(view);
  }
  const nextCreate = performance.now() - t;
  const next = await measureNext(engine);
  report({
    suite: "4 views",
    engine: "2.0: 4 views, 1 world",
    draws: count,
    "create ms": nextCreate,
    "cpu/frame ms": next.cpuMs,
    "frame incl. GPU ms": next.frameMs,
    "API calls/frame": next.apiCalls,
    "scene copies": 1,
  });
  views.forEach((view) => engine.removeView(view));
  engine.worlds.splice(engine.worlds.indexOf(world), 1);
  world.destroy();
  canvases.forEach((canvas) => canvas.remove());
}

async function runBaseline(): Promise<Row[]> {
  rows.length = 0;
  const engine = await Engine.create();
  await drawScaling(engine, [1000, 5000]);
  status("log depth…");
  logDepth(5000);
  status("picking…");
  await picking(engine, 5000);
  status("multi-view…");
  await multiView(engine, 1000);
  engine.destroy();
  status("done");
  return rows;
}

Object.assign(globalThis, { runBaseline });
