// CS-900's instrument: three USD readers over the same six SimReady samples,
// in the Lab (`dyno lab usdReaders`, `dyno measure start lab usdReaders`).
// For each reader: its shipped size and what the page must allow (from
// /usd-readers/manifest.json, which serve.mjs computes from the files), its
// start time from creating a worker to a composed stage, and its coverage
// of CS-802 B's features against OpenUSD's answers. The page needs
// spikes/usd-readers/serve.mjs (its routes and cross-origin isolation).
// Spike code; not part of @cesium/next.

import {
  coverage,
  describeCoverage,
  FEATURES,
  stageFacts,
  type FeatureCoverage,
  type StageFacts,
  type StageRecord,
} from "../spikes/usd-readers/facts.ts";
import {
  describeOutcome,
  settle,
  type Opened,
  type Outcome,
  type Run,
} from "../spikes/usd-readers/outcome.ts";
import type { Harness } from "../lab/harness.ts";
import type { OpenRequest, WorkerAnswer } from "./usdReadersWorker.ts";

type ReaderId = OpenRequest["reader"];

interface Sizes {
  raw: number;
  gzip: number;
  brotli: number;
}

interface Manifest {
  samples: { id: string; root: string; files: string[] }[];
  /** Samples whose files aren't in the SimReady folder. */
  missingSamples?: string[];
  readers: Record<
    ReaderId,
    {
      title: string;
      module: string;
      source: string;
      built: boolean;
      sizes?: { files: Record<string, Sizes>; total: Sizes };
      host?: {
        crossOriginIsolation: boolean;
        wasmUnsafeEval: boolean;
        unsafeEval: boolean;
        evidence: string[];
      };
    }
  >;
  publishedLightUsd: { files: Record<string, Sizes>; total: Sizes };
}

/** Runs per reader and sample; the first is reported on its own as well. */
const RUNS = 5;
const TIMEOUT_MS = 120_000;
const READERS: ReaderId[] = ["subset", "lightusd", "openusd"];
const REFERENCE: ReaderId = "openusd";

/** One worker, created, sent the sample and timed to its composed stage. */
function openOnce(
  reader: ReaderId,
  module: string,
  root: string,
  layers: ReadonlyMap<string, ArrayBuffer>,
): Promise<Opened> {
  const files: Record<string, ArrayBuffer> = {};
  for (const [k, v] of layers) {
    files[k] = v.slice(0);
  }
  return new Promise((resolve) => {
    const out: Opened = {};
    const t0 = performance.now();
    const worker = new Worker(
      new URL("./usdReadersWorker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        ...out,
        error: out.error ?? `timed out after ${TIMEOUT_MS} ms`,
      });
    }, TIMEOUT_MS);
    const done = (): void => {
      clearTimeout(timer);
      worker.terminate();
      resolve(out);
    };
    worker.addEventListener("message", (event: MessageEvent<WorkerAnswer>) => {
      // A dedicated worker's messages have no origin to check; only this
      // page's own worker can send them. Check their shape instead.
      const m = event.data as WorkerAnswer | undefined;
      if (typeof m !== "object" || m === null || typeof m.kind !== "string") {
        return;
      }
      if (m.kind === "composed") {
        out.run = {
          startMs: performance.now() - t0,
          loadMs: m.loadMs,
          composeMs: m.composeMs,
        };
      } else if (m.kind === "records") {
        out.records = m.records;
        done();
      } else {
        out.error = m.error;
        done();
      }
    });
    worker.addEventListener("error", (event) => {
      out.error = event.message || "worker error";
      done();
    });
    const request: OpenRequest = { reader, module, root, files };
    worker.postMessage(request, Object.values(files));
  });
}

/** Prim paths a reader has that the reference doesn't, and the other way. */
function primDiff(
  got: StageRecord | undefined,
  want: StageRecord | undefined,
): { extra: string[]; missing: string[] } | null {
  if (!got || !want) {
    return null;
  }
  const a = new Set(got.prims.map((p) => p.path));
  const b = new Set(want.prims.map((p) => p.path));
  return {
    extra: [...a].filter((p) => !b.has(p)),
    missing: [...b].filter((p) => !a.has(p)),
  };
}

const median = (a: number[]): number => {
  const s = [...a].sort((x, y) => x - y);
  return s.length === 0
    ? NaN
    : s.length % 2
      ? s[s.length >> 1]!
      : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};

const round = (x: number): number => Math.round(x * 100) / 100;

function summary(runs: Run[]) {
  const pick = (k: keyof Run) => runs.map((r) => r[k]);
  return {
    runs: runs.length,
    firstMs: runs.length ? round(runs[0]!.startMs) : null,
    medianMs: runs.length ? round(median(pick("startMs"))) : null,
    minMs: runs.length ? round(Math.min(...pick("startMs"))) : null,
    maxMs: runs.length ? round(Math.max(...pick("startMs"))) : null,
    loadMedianMs: runs.length ? round(median(pick("loadMs"))) : null,
    composeMedianMs: runs.length ? round(median(pick("composeMs"))) : null,
  };
}

async function runUsdReaders(status: (text: string) => void) {
  const manifest = (await (
    await fetch("/usd-readers/manifest.json")
  ).json()) as Manifest;
  if (manifest.samples.length === 0 || (manifest.missingSamples ?? []).length) {
    throw new Error(
      `SimReady samples missing: ${(manifest.missingSamples ?? ["all"]).join(", ")} (set SIMREADY_DIR for serve.mjs)`,
    );
  }
  status("Fetching the samples…");
  const layers = new Map<string, Map<string, ArrayBuffer>>();
  for (const s of manifest.samples) {
    const m = new Map<string, ArrayBuffer>();
    for (const f of s.files) {
      const r = await fetch(`/usd-readers/data/${f}`);
      m.set(f, await r.arrayBuffer());
    }
    layers.set(s.id, m);
  }
  const readers = READERS.filter((r) => manifest.readers[r].built);
  const opens: Record<string, Record<string, Opened[]>> = {};
  for (const r of readers) {
    opens[r] = {};
    for (const s of manifest.samples) {
      opens[r]![s.id] = [];
    }
  }
  // Interleaved, so drift on the machine spreads over every reader alike.
  for (let i = 0; i < RUNS; i++) {
    for (const s of manifest.samples) {
      for (const r of readers) {
        status(`Run ${i + 1} of ${RUNS}: ${r} on ${s.id}`);
        const o = await openOnce(
          r,
          manifest.readers[r].module,
          s.root,
          layers.get(s.id)!,
        );
        opens[r]![s.id]!.push(o);
      }
    }
  }
  // Every run of a reader on a sample settles into one outcome (see
  // spikes/usd-readers/outcome.ts for the rule).
  const outcomes: Record<string, Record<string, Outcome>> = {};
  for (const r of readers) {
    outcomes[r] = {};
    for (const s of manifest.samples) {
      outcomes[r]![s.id] = settle(opens[r]![s.id]!);
    }
  }
  const facts: Record<string, Record<string, StageFacts | undefined>> = {};
  for (const r of readers) {
    facts[r] = {};
    for (const s of manifest.samples) {
      const rec = outcomes[r]![s.id]!.records;
      facts[r]![s.id] = rec ? stageFacts(rec) : undefined;
    }
  }
  // A reference is a reader that opened at least one sample; without one
  // there is nothing to agree with, and coverage is n/a for every reader.
  const reference = Object.values(facts[REFERENCE] ?? {}).some(Boolean)
    ? facts[REFERENCE]
    : undefined;
  const out = {
    settings: {
      runs: RUNS,
      reference: reference ? REFERENCE : null,
      outcomeRule:
        "A run opened a sample only if it composed a stage and delivered its records; a run that composed and then failed is reported as such. Timings count only runs that opened; records and coverage come from the first run that opened. A sample is opened (every run opened), mixed (some did) or failed (none did).",
      startNote:
        "The first subset run on a cold Vite server also pays the worker's on-demand transform, which affects firstMs but not the median. OpenUSD's compose time includes copying every layer into its in-memory file system, which the other readers don't do.",
      crossOriginIsolated: globalThis.crossOriginIsolated,
      hardwareConcurrency: navigator.hardwareConcurrency,
      features: FEATURES,
    },
    publishedLightUsd: manifest.publishedLightUsd,
    readers: Object.fromEntries(
      READERS.map((r) => {
        const m = manifest.readers[r];
        if (!m.built) {
          return [r, { title: m.title, source: m.source, built: false }];
        }
        const cov: FeatureCoverage[] | null = reference
          ? coverage(facts[r]!, reference)
          : null;
        return [
          r,
          {
            title: m.title,
            source: m.source,
            built: true,
            sizes: m.sizes,
            host: m.host,
            start: Object.fromEntries(
              manifest.samples.map((s) => [
                s.id,
                summary(outcomes[r]![s.id]!.timed),
              ]),
            ),
            outcomes: Object.fromEntries(
              manifest.samples.map((s) => {
                const o = outcomes[r]![s.id]!;
                return [
                  s.id,
                  {
                    status: o.status,
                    runs: o.runs,
                    opened: o.opened,
                    composedThenFailed: o.composedThenFailed,
                    failed: o.failed,
                    text: describeOutcome(o),
                  },
                ];
              }),
            ),
            facts: facts[r],
            primDiff: reference
              ? Object.fromEntries(
                  manifest.samples.map((s) => [
                    s.id,
                    primDiff(
                      outcomes[r]![s.id]!.records,
                      outcomes[REFERENCE]?.[s.id]?.records,
                    ),
                  ]),
                )
              : null,
            errors: Object.fromEntries(
              manifest.samples.map((s) => [s.id, outcomes[r]![s.id]!.errors]),
            ),
            coverage: cov,
          },
        ];
      }),
    ),
  };
  return out;
}

type Result = Awaited<ReturnType<typeof runUsdReaders>>;

const kib = (n: number | undefined): string =>
  n === undefined ? "–" : `${(n / 1024).toFixed(1)} KiB`;

/** The summary table, built with DOM methods (no markup from data). */
function render(table: HTMLTableElement, result: Result): void {
  const row = (cells: string[], header: boolean): HTMLTableRowElement => {
    const tr = document.createElement("tr");
    cells.forEach((text, i) => {
      const cell = document.createElement(header || i === 0 ? "th" : "td");
      cell.scope = header ? "col" : "row";
      cell.textContent = text;
      tr.append(cell);
    });
    return tr;
  };
  const head = document.createElement("thead");
  head.append(
    row(
      [
        "Reader",
        "Raw",
        "Brotli",
        "Start, medians per sample",
        "Agrees with OpenUSD",
      ],
      true,
    ),
  );
  const body = document.createElement("tbody");
  for (const r of READERS) {
    const x = result.readers[r] as {
      title: string;
      sizes?: { total: Sizes };
      start?: Record<string, { medianMs: number | null }>;
      outcomes?: Record<string, { status: string; text: string }>;
      coverage?: FeatureCoverage[] | null;
    };
    const starts = Object.values(x.start ?? {})
      .map((s) => s.medianMs)
      .filter((v): v is number => v !== null);
    body.append(
      row(
        [
          x.title,
          kib(x.sizes?.total.raw),
          kib(x.sizes?.total.brotli),
          (starts.length
            ? `${Math.min(...starts).toFixed(1)} to ${Math.max(...starts).toFixed(1)} ms`
            : "–") +
            Object.entries(x.outcomes ?? {})
              .filter(([, o]) => o.status !== "opened")
              .map(([id, o]) => `; ${id} ${o.text}`)
              .join(""),
          r === REFERENCE && x.coverage
            ? "the reference"
            : (x.coverage
                ?.map(
                  (c) => `${c.feature.split(" ")[0]} ${describeCoverage(c)}`,
                )
                .join(" | ") ?? "n/a (no reference opened a sample)"),
        ],
        false,
      ),
    );
  }
  table.replaceChildren(head, body);
}

export const harness: Harness = {
  mount(root) {
    const title = document.createElement("h1");
    title.textContent = "Three USD readers over six SimReady samples";
    const note = document.createElement("p");
    note.textContent =
      "Size, start time from a new worker to a composed stage, and agreement with OpenUSD on CS-802 B's features, counted over the checks where OpenUSD's value isn't empty, zero or null (the empty ones are listed apart). Timings count only runs that opened a sample; a run that composed and then failed is reported as that. The first subset run on a cold Vite also pays the worker's on-demand transform (firstMs, not the median), and OpenUSD's compose time includes copying every layer into its in-memory file system. Served by spikes/usd-readers/serve.mjs.";
    const statusLine = document.createElement("p");
    statusLine.className = "status";
    statusLine.setAttribute("role", "status");
    const table = document.createElement("table");
    root.append(title, note, statusLine, table);
    const status = (text: string): void => {
      statusLine.textContent = text;
    };
    return {
      run: async () => {
        const result = await runUsdReaders(status);
        render(table, result);
        status("Done.");
        return result;
      },
    };
  },
};
