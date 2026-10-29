import {
  Ellipsoid,
  Engine,
  OffscreenTarget,
  createBox,
  createSurfacePatch,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type ShaderOverrides,
  type World,
} from "../src/index.ts";
import { INSTANCE_SIZE } from "../src/render/layout.ts";
import { compareImages } from "../parity/metrics.ts";
import opaqueDefault from "./slang/generated/opaque_default.wgsl?raw";
import opaqueToon from "./slang/generated/opaque_toon.wgsl?raw";
import prepSlangWgsl from "./slang/generated/prep.wgsl?raw";
import commonSlang from "./slang/common.slang?raw";
import materialSlang from "./slang/material.slang?raw";
import materialToonSlang from "./slang/material_toon.slang?raw";
import opaqueSlang from "./slang/opaque.slang?raw";

const ellipsoid = Ellipsoid.WGS84;
const deg = Math.PI / 180;
const WIDTH = 640;
const HEIGHT = 360;
const center = fromDegrees(-75.1652, 39.9526);
const centerCartesian = ellipsoid.cartographicToCartesian(center, vec3.vec3());

const rows: Array<[string, string]> = [];
function report(check: string, result: string): void {
  rows.push([check, result]);
  document.querySelector("#results")!.innerHTML =
    `<tr><th>check</th><th>result</th></tr>${rows
      .map(([c, r]) => `<tr><td>${c}</td><td>${r}</td></tr>`)
      .join("")}`;
}

function populate(world: World, side: number): void {
  const half = 0.03 * deg;
  const ground = createSurfacePatch(
    ellipsoid,
    center.longitude - half,
    center.latitude - half,
    center.longitude + half,
    center.latitude + half,
    32,
  );
  world.addDraw({
    mesh: world.addMesh(ground),
    origin: ground.origin,
    model: mat4.mat4(),
    radius: ground.radius,
    color: [0.08, 0.1, 0.07, 1],
  });
  const box = world.addMesh(createBox());
  const local = mat4.mat4();
  const spacing = (0.05 * deg) / side;
  for (let j = 0; j < side; j++) {
    for (let i = 0; i < side; i++) {
      const origin = ellipsoid.cartographicToCartesian(
        {
          longitude: center.longitude + (i - side / 2) * spacing,
          latitude: center.latitude + (j - side / 2) * spacing * 0.77,
          height: 0,
        },
        vec3.vec3(),
      );
      const height = 20 + ((i * 7 + j * 13) % 11) * 12;
      const width = (spacing * ellipsoid.maximumRadius) / 2;
      const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
      mat4.setTranslation(enu, vec3.vec3());
      mat4.fromScale(local, width, width, height);
      local[14] = height / 2;
      world.addDraw({
        mesh: box,
        origin,
        model: mat4.multiply(mat4.mat4(), enu, local),
        radius: Math.hypot(width, width, height),
        color: [0.4 + (i % 3) * 0.15, 0.45, 0.4 + (j % 3) * 0.15, 1],
      });
    }
  }
}

interface Setup {
  engine: Engine;
  world: World;
  target: OffscreenTarget;
}

async function setup(shaders: ShaderOverrides, side: number): Promise<Setup> {
  const engine = await Engine.create({ shaders });
  vec3.normalize(
    engine.sunDirection,
    vec3.add(vec3.vec3(), centerCartesian, vec3.vec3(2e6, -1e6, 3e6)),
  );
  const world = engine.createWorld({
    maxDraws: side * side + 1,
    vertexBytes: 4 << 20,
    indexBytes: 4 << 20,
  });
  populate(world, side);
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const view = engine.addView({ target, world });
  view.camera.lookAt(centerCartesian, 35 * deg, -35 * deg, 9000);
  return { engine, world, target };
}

async function render(s: Setup, canvasId: string): Promise<ImageData> {
  s.engine.renderFrame();
  const image = new ImageData(await s.target.read(), WIDTH, HEIGHT);
  const canvas = document.querySelector<HTMLCanvasElement>(`#${canvasId}`)!;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.getContext("2d")!.putImageData(image, 0, 0);
  return image;
}

async function gpuTime(s: Setup, frames = 120): Promise<number> {
  for (let i = 0; i < frames; i++) {
    s.engine.renderFrame();
    await s.engine.gpu.device.queue.onSubmittedWorkDone();
  }
  return s.engine.stats.gpuMs;
}

async function compilationErrors(
  device: GPUDevice,
  code: string,
): Promise<string> {
  const info = await device.createShaderModule({ code }).getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === "error").length;
  const warnings = info.messages.filter((m) => m.type === "warning").length;
  return `${errors} errors, ${warnings} warnings`;
}

/** Max error of the prep kernel's camera-relative output against float64. */
async function prepPrecision(shaders: ShaderOverrides): Promise<number> {
  const engine = await Engine.create({ shaders });
  const world = engine.createWorld({
    maxDraws: 512,
    vertexBytes: 1 << 16,
    indexBytes: 1 << 16,
  });
  const mesh = world.addMesh(createBox());
  const origins: Float64Array[] = [];
  let seed = 5;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 512; k++) {
    const distance = 10 ** (random() * 5);
    const dir = vec3.normalize(
      vec3.vec3(),
      vec3.vec3(random() - 0.5, random() - 0.5, random() - 0.5),
    );
    const origin = vec3.scaleAndAdd(
      vec3.vec3(),
      centerCartesian,
      dir,
      distance,
    );
    origins.push(origin);
    world.addDraw({
      mesh,
      origin,
      model: mat4.mat4(),
      radius: 1,
      color: [1, 1, 1, 1],
    });
  }
  const view = engine.addView({ target: new OffscreenTarget(64, 64), world });
  vec3.copy(view.camera.position, centerCartesian);
  engine.renderFrame();
  const bytes = origins.length * INSTANCE_SIZE;
  const readback = engine.gpu.device.createBuffer({
    size: bytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = engine.gpu.device.createCommandEncoder();
  encoder.copyBufferToBuffer(world.instanceBuffer, 0, readback, 0, bytes);
  engine.gpu.device.queue.submit([encoder.finish()]);
  await readback.mapAsync(GPUMapMode.READ);
  const instances = new Float32Array(readback.getMappedRange().slice(0));
  readback.unmap();
  let worst = 0;
  origins.forEach((origin, k) => {
    for (let c = 0; c < 3; c++) {
      const expected = origin[c]! - centerCartesian[c]!;
      worst = Math.max(
        worst,
        Math.abs(instances[k * 16 + 12 + c]! - expected) /
          Math.max(1, Math.abs(expected)),
      );
    }
  });
  engine.destroy();
  return worst;
}

// --- runtime compilation with the Slang WASM build ----------------------------

interface SlangModule {
  createGlobalSession(): SlangGlobalSession | null;
  getCompileTargets(): unknown;
  getLastError(): { message: string };
}
interface SlangGlobalSession {
  createSession(target: number): SlangSession | null;
}
interface SlangSession {
  loadModuleFromSource(
    source: string,
    name: string,
    path: string,
  ): SlangComponent | null;
  createCompositeComponentType(
    components: SlangComponent[],
  ): SlangComponent | null;
}
interface SlangComponent {
  findAndCheckEntryPoint(name: string, stage: number): SlangComponent | null;
  link(): SlangComponent | null;
  getTargetCode(target: number): string;
}

const STAGE_VERTEX = 1;
const STAGE_FRAGMENT = 5;

function wgslTarget(targets: unknown): number {
  if (Array.isArray(targets)) {
    const entry = targets.find((t: { name?: string }) => t.name === "WGSL") as
      { value: number } | undefined;
    if (entry) {
      return entry.value;
    }
  } else if (targets && typeof targets === "object" && "WGSL" in targets) {
    return (targets as Record<string, number>).WGSL!;
  }
  throw new Error(`No WGSL target in ${JSON.stringify(targets)}`);
}

async function runtimeCompile(device: GPUDevice): Promise<void> {
  const url = "/slang-wasm/slang-wasm.js";
  const probe = await fetch("/slang-wasm/slang-wasm.wasm", { method: "HEAD" });
  if (!probe.ok) {
    report(
      "runtime compile (slang-wasm)",
      "skipped: WASM build not served (set SLANG_WASM_DIR)",
    );
    return;
  }

  let t = performance.now();
  const factory = (await import(/* @vite-ignore */ url))
    .default as () => Promise<SlangModule>;
  const slang = await factory();
  report("WASM load + instantiate", `${(performance.now() - t).toFixed(0)} ms`);

  t = performance.now();
  const global = slang.createGlobalSession();
  const target = wgslTarget(slang.getCompileTargets());
  report("createGlobalSession", `${(performance.now() - t).toFixed(0)} ms`);

  const compile = (): string => {
    const session = global!.createSession(target)!;
    const check = <T>(value: T | null, what: string): T => {
      if (!value) {
        throw new Error(`${what}: ${slang.getLastError().message}`);
      }
      return value;
    };
    check(
      session.loadModuleFromSource(commonSlang, "common", "/common.slang"),
      "common",
    );
    check(
      session.loadModuleFromSource(
        materialSlang,
        "material",
        "/material.slang",
      ),
      "material",
    );
    const toon = check(
      session.loadModuleFromSource(
        materialToonSlang,
        "material_toon",
        "/material_toon.slang",
      ),
      "material_toon",
    );
    const opaque = check(
      session.loadModuleFromSource(opaqueSlang, "opaque", "/opaque.slang"),
      "opaque",
    );
    const vs = check(opaque.findAndCheckEntryPoint("vs", STAGE_VERTEX), "vs");
    const fs = check(opaque.findAndCheckEntryPoint("fs", STAGE_FRAGMENT), "fs");
    const program = check(
      session.createCompositeComponentType([opaque, toon, vs, fs]),
      "composite",
    );
    return check(program.link(), "link").getTargetCode(0);
  };

  t = performance.now();
  const cold = compile();
  report(
    "compile opaque + ToonMaterial (cold)",
    `${(performance.now() - t).toFixed(0)} ms`,
  );
  t = performance.now();
  compile();
  report(
    "compile opaque + ToonMaterial (warm)",
    `${(performance.now() - t).toFixed(0)} ms`,
  );
  report("runtime WGSL validates", await compilationErrors(device, cold));
  report(
    "runtime output vs slangc output",
    cold.trim() === opaqueToon.trim()
      ? "identical"
      : `differs (${cold.length} vs ${opaqueToon.length} chars)`,
  );
}

async function main(): Promise<void> {
  const side = 141; // ~20k draws
  const wgsl = await setup({}, side);
  const info = wgsl.engine.gpu.adapter.info;
  document.querySelector("#adapter")!.textContent =
    `Adapter: ${info.vendor} ${info.architecture}`;
  const device = wgsl.engine.gpu.device;

  report(
    "slangc WGSL validates: opaque (default)",
    await compilationErrors(device, opaqueDefault),
  );
  report(
    "slangc WGSL validates: opaque (toon)",
    await compilationErrors(device, opaqueToon),
  );
  report(
    "slangc WGSL validates: prep",
    await compilationErrors(device, prepSlangWgsl),
  );

  const slang = await setup(
    { opaque: opaqueDefault, prep: prepSlangWgsl },
    side,
  );
  const toon = await setup({ opaque: opaqueToon, prep: prepSlangWgsl }, side);
  const a = await render(wgsl, "wgsl");
  const b = await render(slang, "slang");
  await render(toon, "toon");
  const diff = compareImages(a.data, b.data, WIDTH, HEIGHT);
  report(
    "image: WGSL vs Slang (same material)",
    `mean ΔE ${diff.meanDeltaE.toFixed(3)}, pixels ΔE>2.3: ${(diff.noticeable * 100).toFixed(2)}%`,
  );

  // Alternate variants so background load affects them equally.
  const times = { wgsl: [] as number[], slang: [] as number[] };
  for (let round = 0; round < 3; round++) {
    times.wgsl.push(await gpuTime(wgsl));
    times.slang.push(await gpuTime(slang));
  }
  const median = (v: number[]) =>
    [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)]!;
  const base = median(times.wgsl);
  const pct = (v: number) => `${(((v - base) / base) * 100).toFixed(1)}%`;
  report(
    `GPU time, ${side * side + 1} draws (prep + opaque), median of 3`,
    `WGSL ${base.toFixed(3)} ms · Slang ${median(times.slang).toFixed(3)} ms (${pct(median(times.slang))})`,
  );

  const precisionWgsl = await prepPrecision({});
  const precisionSlang = await prepPrecision({ prep: prepSlangWgsl });
  report(
    "prep hi/lo precision (max relative error)",
    `WGSL ${precisionWgsl.toExponential(2)}, Slang ${precisionSlang.toExponential(2)}`,
  );

  await runtimeCompile(device);
  report("done", "✓");
}

main().catch((error: unknown) => {
  console.error(error);
  report("error", String(error instanceof Error ? error.message : error));
});
