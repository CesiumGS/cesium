import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  eastNorthUpToFixedFrame,
  fromDegrees,
  type ModelInstance,
} from "../src/index.ts";
import { addRunButton } from "../parity/runButton.ts";

/**
 * Instancing benchmark (plan §13.9): a multi-primitive glTF (the Cesium
 * milk truck: several nodes and textured materials) placed N times through
 * `ModelOptions.instances`, one draw per primitive culled per instance on
 * the GPU. Per N: time to place, instance-table use, CPU and GPU time per
 * frame while orbiting, frame intervals, and the CPU cost of moving 1% of
 * the instances every frame and all of them once.
 */

const deg = Math.PI / 180;
const MODEL =
  "/specs-data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf";
const COUNTS = [10_000, 100_000];
const FRAMES = 120;

interface Row {
  instances: number;
  draws: number;
  items: number;
  addMs: number;
  tableMiB: number;
  cpuMs: number;
  gpuMs: number;
  frameP50: number;
  frameP95: number;
  move1PctMs: number;
  moveAllMs: number;
}

const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0
  );
};
const frame = () =>
  new Promise<number>((resolve) => requestAnimationFrame((t) => resolve(t)));

/** A square grid with 8 m spacing and a pseudo-random heading per truck. */
function grid(n: number): Float64Array {
  const side = Math.ceil(Math.sqrt(n));
  const m = new Float64Array(n * 16);
  let seed = 1;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const h = random() * 2 * Math.PI;
    const c = Math.cos(h);
    const s = Math.sin(h);
    m.set(
      [
        c,
        s,
        0,
        0,
        -s,
        c,
        0,
        0,
        0,
        0,
        1,
        0,
        ((i % side) - side / 2) * 8,
        (Math.floor(i / side) - side / 2) * 8,
        0,
        1,
      ],
      i * 16,
    );
  }
  return m;
}

async function runInstances(): Promise<Row[]> {
  const status = document.querySelector("#status")!;
  const engine = await Engine.create();
  const rows: Row[] = [];
  const site = Ellipsoid.WGS84.cartographicToCartesian(
    fromDegrees(-75.1652, 39.9526, 0),
    new Float64Array(3),
  );
  const enu = eastNorthUpToFixedFrame(
    site,
    Ellipsoid.WGS84,
    new Float64Array(16),
  );
  const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
  for (const n of COUNTS) {
    status.textContent = `${n.toLocaleString()} instances…`;
    // Per world: an upload consumes the asset's images.
    const asset = await engine.loadGltf(MODEL);
    const primitives = asset.draws.length;
    const world = engine.createWorld({
      maxDraws: 1024,
      maxInstances: n * primitives,
      vertexBytes: 64 << 20,
      indexBytes: 32 << 20,
    });
    const view = engine.addView({ target: new CanvasTarget(canvas), world });
    engine.start();
    const matrices = grid(n);
    const t0 = performance.now();
    const model: ModelInstance = engine.addModel(world, asset, {
      modelMatrix: enu,
      instances: { matrices },
    });
    const addMs = performance.now() - t0;
    const side = Math.ceil(Math.sqrt(n)) * 8;
    view.camera.near = 1;
    // Warm up: pipelines, first upload.
    for (let i = 0; i < 10; i++) {
      await frame();
    }
    // Orbit the grid, half of it in view.
    const cpu: number[] = [];
    const gpu: number[] = [];
    const intervals: number[] = [];
    let last = await frame();
    for (let i = 0; i < FRAMES; i++) {
      view.camera.lookAt(site, (i / FRAMES) * 360 * deg, -30 * deg, side * 0.6);
      const t = await frame();
      intervals.push(t - last);
      last = t;
      cpu.push(engine.stats.cpuMs);
      gpu.push(engine.stats.gpuMs);
    }
    // Move 1% of the instances every frame (a fleet of vehicles).
    const move: number[] = [];
    const m = new Float64Array(16);
    for (let f = 0; f < 30; f++) {
      const t = performance.now();
      for (let i = f % 100; i < n; i += 100) {
        m.set(matrices.subarray(i * 16, i * 16 + 16));
        m[14] = (f % 2) * 0.5;
        engine.setModelInstance(world, model, i, { matrix: m });
      }
      move.push(performance.now() - t);
      await frame();
    }
    const tAll = performance.now();
    for (let i = 0; i < n; i++) {
      m.set(matrices.subarray(i * 16, i * 16 + 16));
      m[14] = 1;
      engine.setModelInstance(world, model, i, { matrix: m });
    }
    const moveAllMs = performance.now() - tAll;
    await frame();
    const memory = world.memory;
    rows.push({
      instances: n,
      draws: model.draws.length,
      items: memory.instances.used,
      addMs,
      tableMiB: memory.tableBytes / (1 << 20),
      cpuMs: quantile(cpu, 0.5),
      gpuMs: quantile(gpu, 0.5),
      frameP50: quantile(intervals, 0.5),
      frameP95: quantile(intervals, 0.95),
      move1PctMs: quantile(move, 0.5),
      moveAllMs,
    });
    renderTable(rows);
    engine.stop();
    engine.removeModel(world, model);
    engine.removeView(view);
    engine.removeWorld(world);
  }
  engine.destroy();
  status.textContent = "done";
  return rows;
}

function renderTable(rows: Row[]): void {
  document.querySelector("#results")!.innerHTML =
    `<tr><th>instances</th><th>draws</th><th>instance items</th><th>place</th><th>tables</th><th>CPU / frame</th><th>GPU / frame</th><th>frame p50 / p95</th><th>move 1% / frame</th><th>move all once</th></tr>${rows
      .map(
        (r) =>
          `<tr><td>${r.instances.toLocaleString()}</td><td>${r.draws}</td><td>${r.items.toLocaleString()}</td>` +
          `<td>${r.addMs.toFixed(0)} ms</td><td>${r.tableMiB.toFixed(0)} MiB</td>` +
          `<td>${r.cpuMs.toFixed(2)} ms</td><td>${r.gpuMs.toFixed(2)} ms</td>` +
          `<td>${r.frameP50.toFixed(1)} / ${r.frameP95.toFixed(1)} ms</td>` +
          `<td>${r.move1PctMs.toFixed(1)} ms</td><td>${r.moveAllMs.toFixed(0)} ms</td></tr>`,
      )
      .join("")}`;
}

Object.assign(globalThis, { runInstances });
addRunButton(runInstances);
