// Where a CSG update's time goes (parameter change -> a new solid on the
// page), in the kernels' real worker (a Node worker thread: a real thread,
// a real structured clone). Run from packages/next:
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning scripts/benchCsgUpdate.mjs [options]
//
//   --scene bracket|ftc06|ctc05|all     the trees (default all)
//   --kernel smlib|occt|all             the kernels (default all)
//   --runs N                            timed updates per row (default 10)
//   --quantile Q                        the statistic over them (default 0.25; 0.5 is the median)
//   --final                             also time a final (checked) update
//   --json                              print JSON, not a table
//
// Needs `npm run setup` (both kernels and the NIST STEP samples). The
// browser's share (World.addBrep, the first dice and draw) is `spikes/csgUpdate.html`.
// Stages, per update, ms:
//   modelling  primitives, placements and booleans in the kernel
//   extract    the kernel's solid to the render form (faces, trims, edges)
//   bounds     formBounds, in the worker
//   prepare    prepareGpuPatches (spans, trim curves and bands), in the worker
//   copy       the worker's copy of the form and patches for the reply
//   waits      the worker's waits on its message loop between stages (a
//              cancel gets in at each); inside the total, outside the rest
//   request    the page's post to the worker taking the request up
//   reply      the worker's post to the page's message event: serializing,
//              the thread hop, deserializing (what the page's thread is busy with)
//   total      the page's request to its reply
//   pagePack   packGpuPatches, the page's share of the patches, if the
//              page must still pack them
//   edges      the edge overlay's CPU lines, on the page
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { Worker } from "node:worker_threads";
import { packGpuPatches, tessellateBrep } from "../src/brep/index.ts";
import { KernelClient } from "../src/brep/kernelClient.ts";
import { SCENES as RECIPES } from "../spikes/csgRecipes.ts";
import { occtDirectory } from "./occtTools.mjs";
import { smlibDirectory } from "./smlibTools.mjs";
import { stepSamplesDirectory } from "./stepSamples.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? fallback : args[at + 1];
};
const RUNS = Number(option("runs", 10));
const QUANTILE = Number(option("quantile", 0.25));
const WARM = 2;
const wantScene = option("scene", "all");
const wantKernel = option("kernel", "all");
const finals = args.includes("--final");
const asJson = args.includes("--json");

const occt = occtDirectory();
const smlib = smlibDirectory();
if (!occt || !smlib) {
  throw new Error(
    "No kernel builds: run npm run setup --workspace @cesium/next",
  );
}

const SCENES = Object.fromEntries(
  Object.entries(RECIPES).map(([name, scene]) => [
    name,
    { ...scene, dx: scene.drag, from: 0 },
  ]),
);

const nodeWorker = () => {
  const worker = new Worker(new URL("./benchCsgWorker.mjs", import.meta.url), {
    workerData: { occt, smlib },
  });
  return {
    postMessage: (message, transfer) => worker.postMessage(message, transfer),
    terminate: () => void worker.terminate(),
    addEventListener(type, listener) {
      if (type === "message") {
        worker.on("message", (data) => listener({ data }));
      } else if (type === "error") {
        worker.on("error", (error) => listener({ message: error.message }));
      }
    },
  };
};

/** The `QUANTILE` of the samples (0.5: the median; the machine is rarely quiet, so 0.25 is steadier). */
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * QUANTILE)] ?? NaN;
};
const time = (fn) => {
  const start = performance.now();
  const value = fn();
  return [performance.now() - start, value];
};

const rows = [];
for (const [sceneName, scene] of Object.entries(SCENES)) {
  if (wantScene !== "all" && wantScene !== sceneName) {
    continue;
  }
  for (const kernel of ["smlib", "occt"]) {
    if (
      (wantKernel !== "all" && wantKernel !== kernel) ||
      (scene.step && kernel === "smlib")
    ) {
      continue;
    }
    const client = new KernelClient({ createWorker: nodeWorker });
    try {
      await client.load(kernel);
      if (scene.step) {
        await client.registerStep(
          1,
          new Uint8Array(
            readFileSync(join(stepSamplesDirectory(), scene.step)),
          ),
        );
      }
      for (const final of finals ? [false, true] : [false]) {
        const samples = [];
        for (let i = 0; i < RUNS + WARM; i++) {
          const recipe = scene.recipe(scene.from + (i + 1) * scene.dx);
          const start = performance.now();
          const done = await client.evaluate(kernel, recipe, {
            validate: final,
            prepare: true,
          });
          const roundTrip = performance.now() - start;
          const { result } = done;
          if (i < WARM) {
            continue;
          }
          const [packMs] = time(() => {
            packGpuPatches(result.patches, (f) => !f.needsTrim);
            packGpuPatches(result.patches, (f) => f.needsTrim);
          });
          const [edgesMs] = time(() =>
            tessellateBrep(result.form, {
              tolerance: 0.001,
              faces: () => false,
            }),
          );
          samples.push({
            modelling: done.kernelMs,
            extract: done.convertMs,
            bounds: result.boundsMs ?? NaN,
            validate: result.validateMs ?? 0,
            prepare: result.prepareMs ?? NaN,
            preReuse: result.facesReused ?? 0,
            exReuse: done.extractReused ?? 0,
            copy: done.packMs ?? NaN,
            waits: done.stageMs ?? NaN,
            request: done.hops?.request ?? NaN,
            reply: done.hops?.reply ?? NaN,
            total: roundTrip,
            pagePack: packMs,
            edges: edgesMs,
            faces: result.form.faceSurface.length,
            spans: result.patches.spans.length,
          });
        }
        const row = {
          scene: sceneName,
          kernel,
          final,
          faces: samples[0].faces,
          spans: samples[0].spans,
        };
        for (const key of Object.keys(samples[0])) {
          if (key !== "faces" && key !== "spans") {
            row[key] = median(samples.map((s) => s[key]));
          }
        }
        rows.push(row);
      }
    } finally {
      client.dispose();
    }
  }
}

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const columns = [
    "modelling",
    "extract",
    "exReuse",
    "bounds",
    "validate",
    "prepare",
    "preReuse",
    "copy",
    "waits",
    "request",
    "reply",
    "total",
    "pagePack",
    "edges",
  ];
  const fixed = (v) =>
    Number.isFinite(v) ? v.toFixed(1).padStart(9) : "        -";
  console.log(
    ["scene".padEnd(8), "kernel".padEnd(6), "final", "faces", "spans"]
      .join(" ")
      .padEnd(36) + columns.map((c) => c.padStart(9)).join(""),
  );
  for (const row of rows) {
    console.log(
      `${row.scene.padEnd(8)} ${row.kernel.padEnd(6)} ${String(row.final).padEnd(5)} ${String(row.faces).padStart(5)} ${String(row.spans).padStart(5)}`.padEnd(
        36,
      ) + columns.map((c) => fixed(row[c])).join(""),
    );
  }
  console.log(`\nquantile ${QUANTILE} of ${RUNS} updates, ms`);
}
