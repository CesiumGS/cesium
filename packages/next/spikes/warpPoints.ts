// A point source's points through a warp on the GPU (plan §13.26, increment
// 4; the Node test is test/warpPoints.test.ts). A rig sits on a warp frame
// over ITRF that multiplies height over a sphere by 10. A `PointSource` 1 km
// above the sphere holds points up to 15 km from its origin; its frame
// kernel (vector/points.slang) evaluates the fit of its carrier draw at each
// point before it writes the anchor the cull, the quads and a model pool
// read. The anchors, read back from the vertex arena, must land within a
// centimetre of the carrier's float64 twin (`placeWithTerms`), which the
// Node test puts on the route; and with the rig on ITRF itself they must be
// the samples, unmoved.
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import {
  createFrameCatalog,
  createFramesResolver,
  warpFrame,
} from "../src/frames/index.ts";
import { EARTH, Engine, OffscreenTarget } from "../src/index.ts";
import { placeWithTerms } from "../src/scene/warpEvaluate.ts";
import { drawTerms } from "../src/scene/world/placements.ts";
import { PointSource } from "../src/vector/PointSource.ts";

const TEMPLATE = `
<h1>A point source's points through a warp</h1>
<p>
  Points up to 15 km from a source's origin, 1 km above a sphere, under a rig
  on a warp frame that multiplies height by 10. Their anchors, as the frame
  kernel writes them, against the carrier draw's float64 twin: within a
  centimetre. With the rig on ITRF they are the samples.
</p>
<div class="status">Run to check on this GPU.</div>
<div data-id="adapter"></div>
<table data-id="results"></table>`;

/** The exaggeration's sphere, m. */
const SPHERE = 6_378_137;
const K = 10;
const UP = [0.6, 0.7, Math.sqrt(1 - 0.36 - 0.49)] as const;
const ORIGIN = Float64Array.of(
  UP[0] * (SPHERE + 1000),
  UP[1] * (SPHERE + 1000),
  UP[2] * (SPHERE + 1000),
);
/** x, y, z in the source's frame, m, and a heading. */
const SAMPLES = Float32Array.of(
  0,
  0,
  10,
  0,
  300,
  200,
  40,
  90,
  -2000,
  1500,
  80,
  180,
  5000,
  -4000,
  300,
  270,
  15000,
  0,
  20,
  0,
  0,
  -15000,
  500,
  0,
  -9000,
  -9000,
  5,
  45,
  123.456,
  789.012,
  345.678,
  10,
);
const N = SAMPLES.length / 4;
/** A centimetre. */
const LIMIT = 0.01;

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

export interface WarpPointsResult {
  adapter: string;
  checks: Check[];
  pass: boolean;
}

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;
let active: Engine | undefined;

function stop(engine: Engine | undefined): void {
  if (engine && active === engine) {
    active = undefined;
    engine.destroy();
  }
}

/** The height over the sphere times `k`, along the radial, with its Jacobian. */
function exaggerate(
  p: ArrayLike<number>,
  out: Float64Array,
  jacobian?: Float64Array,
): Float64Array {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  const r = Math.hypot(x, y, z);
  const f = SPHERE + K * (r - SPHERE);
  out[0] = (f * x) / r;
  out[1] = (f * y) / r;
  out[2] = (f * z) / r;
  if (jacobian) {
    const u = [x / r, y / r, z / r];
    for (let c = 0; c < 3; c++) {
      for (let row = 0; row < 3; row++) {
        jacobian[c * 3 + row] =
          (row === c ? f / r : 0) + (K - f / r) * u[row]! * u[c]!;
      }
    }
  }
  return out;
}

/** The anchors the source wrote, in the vertex arena: x, y, z, heading a point. */
async function readAnchors(
  engine: Engine,
  source: PointSource,
): Promise<Float32Array> {
  const { device } = engine.gpu;
  const world = source.world;
  const bytes = N * 16;
  const read = device.createBuffer({
    label: "warpPoints.read",
    size: bytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(
    world.vertexBufferOf(source.mesh),
    source.mesh.points.anchors * 4,
    read,
    0,
    bytes,
  );
  device.queue.submit([encoder.finish()]);
  await read.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(read.getMappedRange().slice(0));
  read.unmap();
  read.destroy();
  return out;
}

async function runWarpPoints(): Promise<WarpPointsResult> {
  const status = root.querySelector(".status")!;
  $("results").replaceChildren();
  status.textContent = "checking…";
  const checks: Check[] = [];
  let adapter = "";
  for (const warped of [true, false]) {
    const engine = await Engine.create();
    active = engine;
    adapter = describe(engine);
    try {
      const world = engine.createWorld({
        maxDraws: 8,
        vertexBytes: 1 << 20,
        indexBytes: 1 << 16,
      });
      const target = new OffscreenTarget(64, 64);
      const view = engine.addView({
        target,
        world,
        background: "color",
        clearColor: [0, 0, 0],
      });
      const catalog = createFrameCatalog();
      const itrf = catalog.get("ITRF");
      const exaggerated = warpFrame("exaggerated", itrf, {
        presentation: true,
        revision: 1,
        description: `height × ${K}`,
        forward: (p, out, jacobian) => exaggerate(p, out, jacobian),
      });
      catalog.add(exaggerated);
      engine.cameras.setResolver(world, createFramesResolver(catalog));
      const earth = world.bodyAnchor(EARTH);
      engine.cameras.setRig(view, {
        position: { frame: warped ? exaggerated : itrf },
        orientation: { kind: "free" },
      });
      view.camera.position.set([ORIGIN[0]!, ORIGIN[1]!, ORIGIN[2]! + 100]);
      view.camera.version++;
      const source = new PointSource(engine, world, {
        capacity: N,
        origin: ORIGIN,
        anchor: earth,
        warpRadius: 20_000,
      });
      source.update(0, SAMPLES);
      source.count = N;
      // Frames until the carrier's fit lands and the kernel has run on it.
      for (let tries = 0; tries < 40; tries++) {
        engine.renderFrame();
        if (!world.placementOf(source.carrier).held) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      engine.renderFrame();
      const anchors = await readAnchors(engine, source);
      const measured: Record<string, number> = {};
      let worst = 0;
      let moved = 0;
      const terms = drawTerms(world, source.carrier);
      const out = new Float64Array(3);
      for (let i = 0; i < N; i++) {
        const p = [0, 1, 2].map((a) => SAMPLES[i * 4 + a]!);
        const want = terms ? placeWithTerms(terms, p, undefined, out) : p;
        const e = Math.hypot(
          anchors[i * 4]! - want[0]!,
          anchors[i * 4 + 1]! - want[1]!,
          anchors[i * 4 + 2]! - want[2]!,
        );
        measured[`point ${i}: GPU − twin, m`] = e;
        worst = Math.max(worst, e);
        moved = Math.max(
          moved,
          Math.hypot(
            anchors[i * 4]! - p[0]!,
            anchors[i * 4 + 1]! - p[1]!,
            anchors[i * 4 + 2]! - p[2]!,
          ),
        );
      }
      measured["the most a point moved, m"] = moved;
      checks.push({
        id: checks.length + 1,
        name: warped
          ? "the rig on height × 10: anchors are the carrier's twin"
          : "the rig on ITRF: anchors are the samples",
        measured,
        limit: warped
          ? `each point within ${LIMIT} m of the twin; moved more than 8 km`
          : "each point where it was sampled, within a float32",
        pass: warped ? worst <= LIMIT && moved > 8000 : worst === 0,
      });
      source.destroy();
    } finally {
      stop(engine);
    }
  }
  $("adapter").textContent = `Adapter: ${adapter}`;
  render(checks);
  const failed = checks.filter((c) => !c.pass);
  status.textContent = failed.length
    ? `FAIL: check ${failed.map((c) => c.id).join(", ")}`
    : `pass: all ${checks.length} checks`;
  if (failed.length) {
    console.error(
      `[warpPoints] failed: ${failed.map((c) => `${c.id} ${c.name}`).join("; ")}`,
    );
  }
  return { adapter, checks, pass: checks.every((c) => c.pass) };
}

function describe(engine: Engine): string {
  const info = engine.gpu.adapter.info;
  return `${info.vendor} ${info.architecture} ${info.description}`;
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
    const entries = Object.entries(c.measured);
    entries.forEach(([key, value], i) => {
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
    return { run: runWarpPoints, dispose: () => stop(active) };
  },
};
