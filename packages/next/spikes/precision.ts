import {
  Ellipsoid,
  Engine,
  OffscreenTarget,
  fromDegrees,
  mat4,
  vec3,
} from "../src/index.ts";
import { DRAW_ITEM_SIZE } from "../src/render/layout.ts";
import { createBox } from "../src/scene/meshes.ts";
import type { Harness } from "../lab/harness.ts";

const TEMPLATE = `
<h1>Camera-relative precision on this GPU</h1>
<p>
  Runs the production prep kernel on draw records scattered around several
  camera positions, reads back its float32 camera-relative translations and
  compares them with float64 on the CPU. "naive float32" is what you get
  without the hi/lo split: fround(origin) − fround(camera).
</p>
<div class="status">Run to measure on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>`;

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
const distances = [0.01, 1, 100, 1e3, 1e4, 1e5, 1e6];
const sites: Array<[string, number, number, number]> = [
  ["Philadelphia, ground", -75.1652, 39.9526, 10],
  ["Everest, 9 km", 86.925, 27.9881, 9000],
  ["Near north pole", 10, 89.99, 100],
  ["Antimeridian", 180, -16.5, 50],
  ["LEO, 400 km", 0, 0, 400e3],
];
const perDistance = 64;

interface Row {
  site: string;
  distance: number;
  hiLo: number;
  naive: number;
  /** Within `bound(distance)`: the hi/lo path keeps float32 precision. */
  pass: boolean;
}

/**
 * The most a camera-relative offset may err: float32's half-ulp at the
 * distance with room for the last addition (measured 4e-8 × distance on
 * D3D12 and Metal), and a micrometer near zero. Relaxed math folding the
 * hi/lo split back into float32 errs by 0.25 to 0.47 m and fails at every
 * distance (an M-series Mac before r50, plan §3.3 "Precision").
 */
function bound(distance: number): number {
  return 1.5e-7 * distance + 1e-6;
}

async function runPrecision(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  status.textContent = "measuring…";
  const engine = await Engine.create();
  active = engine;
  const target = new OffscreenTarget(64, 64);
  const rows: Row[] = [];
  let seed = 3;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  for (const [site, lon, lat, height] of sites) {
    if (active !== engine) {
      throw new Error("stopped");
    }
    const world = engine.createWorld({
      maxDraws: distances.length * perDistance,
      vertexBytes: 1 << 16,
      indexBytes: 1 << 16,
    });
    const mesh = world.addMesh(createBox());
    const camera = ellipsoid.cartographicToCartesian(
      fromDegrees(lon, lat, height),
      vec3.vec3(),
    );
    const origins: Float64Array[] = [];
    for (const distance of distances) {
      for (let i = 0; i < perDistance; i++) {
        const dir = vec3.normalize(
          vec3.vec3(),
          vec3.vec3(random() - 0.5, random() - 0.5, random() - 0.5),
        );
        const origin = vec3.scaleAndAdd(vec3.vec3(), camera, dir, distance);
        origins.push(origin);
        world.addDraw({
          mesh,
          origin,
          model: mat4.mat4(),
          radius: 1,
          color: [1, 1, 1, 1],
        });
      }
    }
    const view = engine.addView({ target, world });
    vec3.copy(view.camera.position, camera);
    engine.renderFrame();

    const bytes = origins.length * DRAW_ITEM_SIZE;
    const readback = engine.gpu.device.createBuffer({
      size: bytes,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = engine.gpu.device.createCommandEncoder();
    encoder.copyBufferToBuffer(world.itemBuffer, 0, readback, 0, bytes);
    engine.gpu.device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const instances = new Float32Array(readback.getMappedRange().slice(0));
    readback.unmap();
    readback.destroy();
    engine.removeView(view);
    engine.worlds.splice(engine.worlds.indexOf(world), 1);
    world.destroy();

    const f = Math.fround;
    distances.forEach((distance, d) => {
      let hiLo = 0;
      let naive = 0;
      for (let i = 0; i < perDistance; i++) {
        const k = d * perDistance + i;
        const origin = origins[k]!;
        for (let c = 0; c < 3; c++) {
          const expected = origin[c]! - camera[c]!;
          const gpu = instances[k * (DRAW_ITEM_SIZE / 4) + 12 + c]!;
          hiLo = Math.max(hiLo, Math.abs(gpu - expected));
          naive = Math.max(
            naive,
            Math.abs(f(f(origin[c]!) - f(camera[c]!)) - expected),
          );
        }
      }
      rows.push({ site, distance, hiLo, naive, pass: hiLo <= bound(distance) });
    });
  }

  const info = engine.gpu.adapter.info;
  stop(engine);
  const failed = rows.filter((r) => !r.pass);
  status.textContent = failed.length
    ? `FAIL: ${failed.length} of ${rows.length} past the bound (hi/lo precision lost on this GPU)`
    : `pass: all ${rows.length} within 1.5e-7 × distance + 1 µm`;
  if (failed.length) {
    // The benchmark runner (bench/run.mjs) fails a suite on console errors.
    console.error(
      `[precision] hi/lo precision lost: ${failed.map((r) => `${r.site} at ${r.distance} m: ${format(r.hiLo)}`).join("; ")}`,
    );
  }
  $("adapter").textContent =
    `Adapter: ${info.vendor} ${info.architecture} ${info.description}`;
  $("results").innerHTML =
    `<tr><th>site</th><th>distance to camera</th><th>max error, hi/lo (GPU)</th><th>bound</th><th>max error, naive float32</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.site}</td><td>${r.distance} m</td><td>${r.pass ? "" : "✗ "}${format(r.hiLo)}</td><td>${format(bound(r.distance))}</td><td>${format(r.naive)}</td></tr>`,
      )
      .join("")}`;
  return rows;
}

function format(meters: number): string {
  if (meters === 0) {
    return "0";
  }
  return meters < 1e-3
    ? `${(meters * 1e6).toFixed(2)} µm`
    : meters < 1
      ? `${(meters * 1e3).toFixed(2)} mm`
      : `${meters.toFixed(2)} m`;
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runPrecision, dispose: () => stop(active) };
  },
};
