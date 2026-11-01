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
import type { Harness } from "../lab/harness.ts";
import "./indirect.css";

const TEMPLATE = `
<h1>drawIndexedIndirect vs drawIndexed in render bundles</h1>
<p>
  The same draws replayed from one render bundle, either as indirect draws
  (args written per view by the prep kernel; Dawn may validate them) or as
  direct draws with CPU-baked arguments. "frame wall" is submit →
  onSubmittedWorkDone, which includes any validation work Dawn inserts.
</p>
<div class="status">Run to time both submission modes.</div>
<div class="indirect">
  <div data-id="adapter"></div>
  <canvas data-id="view"></canvas>
  <table data-id="results"></table>
</div>`;

/** Where the page is mounted (harness `mount`). */
let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

/** The engine of a run in progress, destroyed by `dispose`. */
let active: Engine | undefined;

function stop(engine: Engine | undefined): void {
  if (engine && active === engine) {
    active = undefined;
    engine.destroy();
  }
}

const ellipsoid = Ellipsoid.WGS84;
const deg = Math.PI / 180;
const FRAMES = 120;

interface Row {
  draws: number;
  mode: SubmissionMode;
  cpuMs: number;
  gpuMs: number;
  gpuSpanMs: number;
  wallMs: number;
}

async function runIndirect(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  status.textContent = "measuring…";
  const engine = await Engine.create();
  active = engine;
  const center = fromDegrees(-75.1652, 39.9526);
  const target = ellipsoid.cartographicToCartesian(center, vec3.vec3());
  const rows: Row[] = [];
  const canvas = new CanvasTarget($<HTMLCanvasElement>("view"));

  for (const side of [32, 100, 141]) {
    if (active !== engine) {
      throw new Error("stopped");
    }
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
        gpuSpanMs: engine.stats.gpuSpanMs,
        wallMs: wall / FRAMES,
      });
    }
    engine.removeView(view);
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();
  }

  const info = engine.gpu.adapter.info;
  stop(engine);
  status.textContent = "done";
  $("adapter").textContent =
    `Adapter: ${info.vendor} ${info.architecture} ${info.description}`;
  $("results").innerHTML =
    `<tr><th>draws</th><th>mode</th><th>cpu / frame</th><th>gpu passes (timestamps)</th><th>gpu span</th><th>frame wall</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.draws}</td><td>${r.mode}</td><td>${r.cpuMs.toFixed(3)} ms</td>` +
          `<td>${ms(r.gpuMs)}</td><td>${ms(r.gpuSpanMs)}</td><td>${r.wallMs.toFixed(3)} ms</td></tr>`,
      )
      .join("")}`;
  return rows;
}

function ms(value: number): string {
  return Number.isNaN(value) ? "n/a" : `${value.toFixed(3)} ms`;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runIndirect, dispose: () => stop(active) };
  },
};
