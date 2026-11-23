// The USD subset reader in a browser (CS-833 and CS-843): how long it takes
// to start in a module worker and compose the spike's fixture there, and what
// it reads from a SimReady sample folder you open. The design note is
// docs/design/simready-and-usd.md; the reader and its Node runner are in
// spikes/usd-subset/. Spike code; not part of @cesium/next.

import "../lab/harness.css";
import type { Harness } from "../lab/harness.ts";
import { loadLayers, Stage, type AssetIo } from "./usd-subset/compose.ts";
import { coverage, type Coverage } from "./usd-subset/coverage.ts";

const RUNS = 10;

const TEMPLATE = `
<h1>USD subset reader</h1>
<p>
  <strong>Decision it informs:</strong> which USD runtime CS-559 uses (CS-843), and how SimReady
  assets come in (CS-802). <strong>A:</strong> this TypeScript subset reader (USDA, USDC 0.4.0 and
  later, USDZ; sublayers, references, payloads, variants, inherits and specializes; no plugins).
  <strong>B:</strong> OpenUSD built for WebAssembly, not run here: no build is in the repository, and
  adding one is the owner's call. Its published sizes are in the design note.
</p>
<p>
  <strong>Data:</strong> the spike's fixture (four small USDA layers), built into the page; or a
  SimReady sample folder you open below, read in this tab and never uploaded.
  <strong>Settings:</strong> ${RUNS} runs each, median reported. <strong>Costs:</strong> the reader
  is about 26 KB minified, 9.6 KB with gzip (<code>size.mjs</code>); no threads, no
  <code>SharedArrayBuffer</code>, no <code>wasm-unsafe-eval</code>.
</p>
<div class="status">Run to time the reader on this machine.</div>
<table data-id="timings"></table>
<h1 style="margin-top: 24px">A SimReady folder</h1>
<p>
  Open an asset's <code>simready_usd</code> folder (for example from NVIDIA's SimReady Foundation
  samples, Apache 2.0). The page composes its top-level layer and lists what it found.
</p>
<label>Folder <input type="file" data-id="folder" webkitdirectory multiple /></label>
<div class="status" data-id="folderStatus"></div>
<table data-id="coverage"></table>`;

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1]!;
}

function row(table: HTMLTableElement, cells: string[], head = false): void {
  const tr = table.insertRow();
  for (const c of cells) {
    const cell = document.createElement(head ? "th" : "td");
    cell.textContent = c;
    tr.append(cell);
  }
}

/** Starts a worker, waits for its module to load, then composes the fixture there. */
async function workerRun(): Promise<{
  startMs: number;
  composeMs: number;
  roundTripMs: number;
}> {
  const t0 = performance.now();
  const worker = new Worker(new URL("./usdSubsetWorker.ts", import.meta.url), {
    type: "module",
  });
  try {
    const next = () =>
      new Promise<{ ready?: boolean; prims?: number; ms?: number }>(
        (resolve, reject) => {
          worker.onmessage = (e) => resolve(e.data);
          worker.onerror = (e) => reject(new Error(e.message));
        },
      );
    await next();
    const t1 = performance.now();
    const answer = next();
    worker.postMessage("compose");
    const { ms } = await answer;
    return {
      startMs: t1 - t0,
      composeMs: ms ?? NaN,
      roundTripMs: performance.now() - t1,
    };
  } finally {
    worker.terminate();
  }
}

function summarize(c: Coverage): [string, string][] {
  const j = (v: unknown) => JSON.stringify(v);
  return [
    [
      "Units and axes",
      `up ${c.stage.upAxis}, ${c.stage.metersPerUnit} m per unit, ${c.stage.kilogramsPerUnit} kg per unit`,
    ],
    [
      "Default prim",
      `${c.stage.defaultPrim} (kind ${c.stage.defaultPrimKind})`,
    ],
    [
      "Arcs",
      `${c.counts.sublayers} sublayers, ${c.counts.references} references, ${c.counts.payloads} payloads, ${c.counts.inherits} inherits, ${c.counts.specializes} specializes`,
    ],
    [
      "Variants",
      (c.counts.selected.join(", ") || "none") +
        (c.counts.selectedOmitted
          ? `, and ${c.counts.selectedOmitted} more`
          : ""),
    ],
    [
      "Unresolved",
      (c.counts.unresolved.join(", ") || "none") +
        (c.counts.unresolvedOmitted
          ? `, and ${c.counts.unresolvedOmitted} more`
          : ""),
    ],
    ["Prims", `${c.prims}: ${j(c.typeNames)}`],
    [
      "SemanticsLabelsAPI",
      `${c.semantics.labelsApi} prims: ${j(c.semantics.labelsApiTaxonomies)}`,
    ],
    [
      "Older SemanticsAPI",
      `${c.semantics.legacyApi} prims: ${j(c.semantics.legacyTypes)}`,
    ],
    [
      "Materials",
      `${c.materials.materials}: ${c.materials.previewSurface} UsdPreviewSurface, ${c.materials.mdl} MDL (${c.materials.mdlOnly} MDL only), ${c.materials.materialX} MaterialX`,
    ],
    [
      "Geometry",
      `${c.geometry.meshes} meshes, ${c.geometry.triangles} triangles, size ${c.geometry.sizeMeters ? `${c.geometry.sizeMeters.join(" × ")} m` : "can't tell"}`,
    ],
    [
      "Physics",
      `${c.physics.rigidBodies} rigid bodies, ${c.physics.colliders} colliders, ${c.physics.joints} joints, ${c.physics.physicsMaterials} physics materials`,
    ],
  ];
}

export const harness: Harness = {
  mount(root) {
    root.innerHTML = TEMPLATE;
    const status = root.querySelector<HTMLElement>(".status")!;
    const timings = root.querySelector<HTMLTableElement>(
      '[data-id="timings"]',
    )!;
    const folder = root.querySelector<HTMLInputElement>('[data-id="folder"]')!;
    const folderStatus = root.querySelector<HTMLElement>(
      '[data-id="folderStatus"]',
    )!;
    const table = root.querySelector<HTMLTableElement>('[data-id="coverage"]')!;

    folder.addEventListener("change", async () => {
      table.replaceChildren();
      const files = new Map<string, File>();
      for (const f of folder.files ?? []) {
        files.set(f.webkitRelativePath, f);
      }
      const io: AssetIo = {
        read: async (p) => {
          const f = files.get(p);
          return f ? new Uint8Array(await f.arrayBuffer()) : undefined;
        },
        exists: (p) => Promise.resolve(files.has(p)),
      };
      const roots = [...files.keys()].filter(
        (p) => p.split("/").length === 2 && /\.(usd|usda|usdc|usdz)$/.test(p),
      );
      if (!roots.length) {
        folderStatus.textContent =
          "No top-level .usd, .usda, .usdc or .usdz file in that folder.";
        return;
      }
      const t0 = performance.now();
      const layers = await loadLayers(roots[0]!, io);
      const stage = new Stage(layers, roots[0]!);
      const prim = stage.compose();
      const ms = performance.now() - t0;
      const c = await coverage(stage, prim, io);
      folderStatus.textContent = `${roots[0]}: ${layers.size} layers read and composed in ${ms.toFixed(1)} ms.`;
      row(table, ["What", "Found"], true);
      for (const [k, v] of summarize(c)) {
        row(table, [k, v]);
      }
    });

    return {
      async run() {
        status.textContent = "Running…";
        const starts: number[] = [];
        const workerCompose: number[] = [];
        const trips: number[] = [];
        for (let i = 0; i < RUNS; i++) {
          const r = await workerRun();
          starts.push(r.startMs);
          workerCompose.push(r.composeMs);
          trips.push(r.roundTripMs);
        }
        const { FIXTURE } = await import("./usd-subset/fixture.ts");
        const io: AssetIo = {
          read: (p) =>
            Promise.resolve(
              FIXTURE[p] === undefined
                ? undefined
                : new TextEncoder().encode(FIXTURE[p]),
            ),
          exists: (p) => Promise.resolve(p in FIXTURE),
        };
        const main: number[] = [];
        for (let i = 0; i < RUNS; i++) {
          const t0 = performance.now();
          new Stage(
            await loadLayers("fixture/root.usda", io),
            "fixture/root.usda",
          ).compose();
          main.push(performance.now() - t0);
        }
        const result = {
          runs: RUNS,
          workerStartMs: median(starts),
          workerComposeMs: median(workerCompose),
          workerRoundTripMs: median(trips),
          mainComposeMs: median(main),
          crossOriginIsolated: globalThis.crossOriginIsolated === true,
        };
        timings.replaceChildren();
        row(timings, ["Measure", "Median, ms"], true);
        row(timings, [
          "Worker start: new Worker to its module loaded",
          result.workerStartMs.toFixed(2),
        ]);
        row(timings, [
          "Fixture composed in the worker",
          result.workerComposeMs.toFixed(2),
        ]);
        row(timings, [
          "Round trip: request to answer",
          result.workerRoundTripMs.toFixed(2),
        ]);
        row(timings, [
          "Fixture composed on the main thread",
          result.mainComposeMs.toFixed(2),
        ]);
        status.textContent = `Done: ${RUNS} runs. Cross-origin isolated: ${result.crossOriginIsolated ? "yes" : "no"} (the reader doesn't need it).`;
        return result;
      },
    };
  },
};
