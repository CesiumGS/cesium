// The CSG sample's update path on a page (the browser's share of
// `scripts/benchCsgUpdate.mjs`): a parameter changes, the kernel's worker makes
// the solid (a real Web Worker), and the page adds it to the world and draws it.
// Per update: the worker's stages, the clone onto the page, `World.addBrep`
// with the worker's prepared patches (packing, uploading), the edges' lines,
// and the frames until every draw is diced and shown. Open with ?bench and call
// runCsgUpdate(); STEP scenes need `npm run setup` (the dev server serves the
// NIST files at /step-samples/).
import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { tessellateBrep } from "../src/brep/index.ts";
import { KernelClient } from "../src/brep/kernelClient.ts";
import type { KernelName } from "../src/brep/kernelProtocol.ts";
import { Engine, OffscreenTarget, UNITLESS_EXPOSURE } from "../src/index.ts";
import { SCENES } from "./csgRecipes.ts";

const TEMPLATE = `
<h1>CSG update path</h1>
<p>
  A tree's parameter dragged, the kernel's worker making each solid, the page
  adding it and drawing it: where the time of an update goes, on this GPU.
</p>
<div class="status">Run to measure.</div>
<div data-id="adapter"></div>
<table data-id="performance"></table>`;

const RUNS = 12;
const WARM = 3;
const WIDTH = 768;
const HEIGHT = 384;

interface Check {
  id: number;
  name: string;
  measured: Record<string, number>;
  limit: string;
  pass: boolean;
}

let root: HTMLElement;
let active: Engine | undefined;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The 25th percentile (the machine is rarely quiet). */
function typical(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * 0.25)] ?? NaN;
}

async function stepBytes(file: string): Promise<Uint8Array> {
  const response = await fetch(`/step-samples/${file}`);
  if (!response.ok) {
    throw new Error(`${file}: HTTP ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function runCsgUpdate(): Promise<{
  adapter: string;
  checks: Check[];
  rows: Record<string, number | string>[];
}> {
  const status = root.querySelector(".status")!;
  status.textContent = "measuring…";
  const engine = await Engine.create();
  active = engine;
  const world = engine.createWorld({
    maxDraws: 16,
    vertexBytes: 1 << 24,
    indexBytes: 1 << 22,
  });
  const view = engine.addView({
    target: new OffscreenTarget(WIDTH, HEIGHT),
    world,
    background: "color",
    clearColor: [0, 0, 0],
    observer: { exposure: UNITLESS_EXPOSURE },
  });
  const rows: Record<string, number | string>[] = [];
  const checks: Check[] = [];
  const kernels: KernelName[] = ["smlib", "occt"];
  const wanted = new URLSearchParams(location.search);
  try {
    for (const [name, scene] of Object.entries(SCENES)) {
      if (wanted.has("scene") && wanted.get("scene") !== name) {
        continue;
      }
      for (const kernel of kernels) {
        if (scene.step && kernel === "smlib") {
          continue;
        }
        const client = new KernelClient();
        let previous: ReturnType<typeof world.addBrep> | undefined;
        const samples: Record<string, number[]> = {};
        const put = (key: string, value: number) =>
          (samples[key] ??= []).push(value);
        try {
          await client.load(kernel);
          if (scene.step) {
            await client.registerStep(1, await stepBytes(scene.step));
          }
          for (let i = 0; i < RUNS + WARM; i++) {
            const recipe = scene.recipe((i + 1) * scene.drag);
            const start = performance.now();
            const done = await client.evaluate(kernel, recipe, {
              validate: false,
              prepare: true,
            });
            const roundTrip = performance.now() - start;
            const { result } = done;
            const form = result.form;
            const added = performance.now();
            const brep = world.addBrep(form, {
              ...(result.patches ? { prepared: result.patches } : {}),
              errorPixels: 0.5,
              cpuTolerance: 0.001,
              doubleSided: false,
              name: "CSG solid",
            });
            const addMs = performance.now() - added;
            const edgeStart = performance.now();
            tessellateBrep(form, { tolerance: 0.001, faces: () => false });
            const edgesMs = performance.now() - edgeStart;
            // Aim the camera at the solid and draw until every draw is diced and shown.
            const { min, max } = result.bounds;
            const centre = [0, 1, 2].map((k) => (min[k]! + max[k]!) / 2);
            const size = Math.max(
              max[0]! - min[0]!,
              max[1]! - min[1]!,
              max[2]! - min[2]!,
            );
            view.camera.position.set([
              centre[0]!,
              centre[1]! - 2 * size,
              centre[2]! + size,
            ]);
            view.camera.direction.set([0, 2 * size, -size]);
            view.camera.orient(Float64Array.of(0, 0, 1));
            view.camera.version++;
            const draws = [brep.patches, brep.trimmed, brep.mesh].filter(
              (d): d is NonNullable<typeof d> => d !== undefined,
            );
            const drawStart = performance.now();
            let frames = 0;
            while (!world.ready(draws) || frames < 2) {
              engine.renderFrame();
              frames++;
              await sleep(0);
              if (performance.now() - drawStart > 5000) {
                break;
              }
            }
            const readyMs = performance.now() - drawStart;
            if (previous) {
              world.removeBrep(previous);
            }
            previous = brep;
            if (i < WARM) {
              continue;
            }
            put("modelling", done.kernelMs);
            put("extract", done.convertMs);
            put("bounds", result.boundsMs ?? 0);
            put("prepare", result.prepareMs ?? 0);
            put("copy", done.packMs);
            put("waits", done.stageMs);
            put("request hop", done.hops.request);
            put("reply hop (clone)", done.hops.reply);
            put("worker total", done.hops.worker);
            put("round trip", roundTrip);
            put("addBrep (pack, upload)", addMs);
            put("edges (CPU lines)", edgesMs);
            put("first dice and draw", readyMs);
            put("frames to ready", frames);
          }
        } finally {
          client.dispose();
          if (previous) {
            world.removeBrep(previous);
          }
        }
        const row: Record<string, number | string> = {
          scene: name,
          kernel,
        };
        for (const [key, values] of Object.entries(samples)) {
          row[key] = Number(typical(values).toFixed(2));
        }
        rows.push(row);
      }
    }
    checks.push({
      id: 1,
      name: "the update path ran",
      measured: { rows: rows.length },
      limit: "at least one row",
      pass: rows.length > 0,
    });
  } finally {
    engine.removeView(view);
    world.destroy();
    engine.destroy();
    active = undefined;
  }
  const table = root.querySelector<HTMLElement>('[data-id="performance"]')!;
  table.replaceChildren();
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const tr = document.createElement("tr");
      const k = document.createElement("td");
      k.textContent = key;
      const v = document.createElement("td");
      v.textContent = String(value);
      tr.append(k, v);
      table.append(tr);
    }
  }
  status.textContent = "done";
  // The runner prints a check's `measured`; one check per row, so each row is read.
  for (const row of rows) {
    checks.push({
      id: checks.length + 1,
      name: `${row.scene} in ${row.kernel}`,
      measured: Object.fromEntries(
        Object.entries(row).filter(([, v]) => typeof v === "number"),
      ) as Record<string, number>,
      limit: "measured, ms (25th percentile of the runs)",
      pass: true,
    });
  }
  const info = engine.gpu.adapter.info;
  return {
    adapter: `${info.vendor} ${info.architecture} ${info.description}`,
    checks,
    rows,
  };
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return {
      run: runCsgUpdate,
      dispose: () => {
        active?.destroy();
        active = undefined;
      },
    };
  },
};
