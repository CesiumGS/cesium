import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type SubmissionMode,
} from "../src/index.ts";

const ellipsoid = Ellipsoid.WGS84;
const deg = Math.PI / 180;
const FRAMES = 120;

interface Row {
  draws: number;
  mode: SubmissionMode;
  cpuMs: number;
  gpuMs: number;
  wallMs: number;
}

async function run(): Promise<Row[]> {
  const engine = await Engine.create();
  const center = fromDegrees(-75.1652, 39.9526);
  const target = ellipsoid.cartographicToCartesian(center, vec3.vec3());
  const rows: Row[] = [];
  const canvas = new CanvasTarget(
    document.querySelector<HTMLCanvasElement>("#view")!,
  );

  for (const side of [32, 100, 141]) {
    const world = engine.createWorld({
      maxDraws: side * side,
      vertexBytes: 1 << 20,
      indexBytes: 1 << 20,
    });
    const box = world.addMesh(createBox());
    const local = mat4.fromScale(mat4.mat4(), 6, 6, 6);
    local[14] = 3;
    for (let j = 0; j < side; j++) {
      for (let i = 0; i < side; i++) {
        const origin = ellipsoid.cartographicToCartesian(
          {
            longitude: center.longitude + (i - side / 2) * 0.0001 * deg,
            latitude: center.latitude + (j - side / 2) * 0.0001 * deg,
            height: 0,
          },
          vec3.vec3(),
        );
        const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
        mat4.setTranslation(enu, vec3.vec3());
        world.addDraw({
          mesh: box,
          origin,
          model: mat4.multiply(mat4.mat4(), enu, local),
          radius: 6,
          color: [0.6, 0.6, 0.65, 1],
        });
      }
    }
    const view = engine.addView({ target: canvas, world });
    // Far enough that every box is in view.
    view.camera.lookAt(target, 0, -60 * deg, side * 18);

    for (const mode of ["indirect", "direct"] as const) {
      world.submission = mode;
      for (let i = 0; i < 20; i++) {
        engine.renderFrame(); // warm-up: bundle, pipelines, pool
      }
      await engine.gpu.device.queue.onSubmittedWorkDone();
      let cpu = 0;
      let wall = 0;
      for (let i = 0; i < FRAMES; i++) {
        const start = performance.now();
        engine.renderFrame();
        cpu += performance.now() - start;
        await engine.gpu.device.queue.onSubmittedWorkDone();
        wall += performance.now() - start;
      }
      rows.push({
        draws: side * side,
        mode,
        cpuMs: cpu / FRAMES,
        gpuMs: engine.stats.gpuMs,
        wallMs: wall / FRAMES,
      });
    }
    engine.removeView(view);
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();
  }

  const info = engine.gpu.adapter.info;
  document.querySelector("#adapter")!.textContent =
    `Adapter: ${info.vendor} ${info.architecture} ${info.description}`;
  document.querySelector("#results")!.innerHTML =
    `<tr><th>draws</th><th>mode</th><th>cpu / frame</th><th>gpu passes (timestamps)</th><th>frame wall</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.draws}</td><td>${r.mode}</td><td>${r.cpuMs.toFixed(3)} ms</td>` +
          `<td>${Number.isNaN(r.gpuMs) ? "n/a" : `${r.gpuMs.toFixed(3)} ms`}</td><td>${r.wallMs.toFixed(3)} ms</td></tr>`,
      )
      .join("")}`;
  return rows;
}

Object.assign(globalThis, { runIndirect: run });
void run();
