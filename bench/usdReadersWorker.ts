// One USD reader in a module worker, for CS-900's start-time measurement
// (usdReaders.ts). It takes one message (the reader, its module's URL, the
// sample's layers and its root), loads the reader, composes the stage,
// posts "composed" with its own split of the time, then posts the stage's
// records. Each run gets a new worker. Spike code; not part of @cesium/next.

import type { StageRecord } from "../spikes/usd-readers/facts.ts";
import { lightusdRecords } from "../spikes/usd-readers/lightusdRecords.ts";
import { isRequest } from "../spikes/usd-readers/request.ts";

export interface OpenRequest {
  reader: "subset" | "lightusd" | "openusd";
  module: string;
  root: string;
  files: Record<string, ArrayBuffer>;
}

export type WorkerAnswer =
  | { kind: "composed"; loadMs: number; composeMs: number }
  | { kind: "records"; records: StageRecord }
  | { kind: "failed"; error: string; records?: StageRecord };

const post = (m: WorkerAnswer): void => self.postMessage(m);

/** An error as text: an Error's message, or what a thrown non-Error holds. */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** An empty layer stands in for one that isn't there: LightUSD has no "missing" answer. */
const EMPTY_LAYER = new TextEncoder().encode("#usda 1.0\n");

/** Joins a layer-relative key to the folder of the root: "a/b/c.usd" + "../d.usd" → "a/d.usd". */
function joinKey(root: string, key: string): string {
  const parts = root.split("/").slice(0, -1);
  for (const p of key.split("/")) {
    if (p === "..") {
      parts.pop();
    } else if (p !== "." && p !== "") {
      parts.push(p);
    }
  }
  return parts.join("/");
}

interface LightUsdModule {
  NextFlattenSession: new () => {
    begin(
      root: Uint8Array,
      name: string,
      lazy: boolean,
    ): { success: boolean; error?: string };
    step(cb: null): {
      success: boolean;
      error?: string;
      status?: string;
      key?: string;
      data?: ArrayBuffer;
    };
    provideLayer(
      key: string,
      bytes: Uint8Array,
    ): { success: boolean; error?: string };
    end(): void;
    delete?(): void;
  };
  LayerDocument: new () => {
    load(bytes: Uint8Array): { success: boolean; error?: string };
    exportJSON(): { success: boolean; text: string };
    getPrimMetadata(
      path: string,
      key: string,
    ): { authored?: boolean; value?: unknown } | undefined;
  };
}

interface OpenUsdModule {
  ENV: Record<string, string>;
  FS: {
    mkdirTree(path: string): void;
    writeFile(path: string, data: Uint8Array): void;
  };
  ccall(name: string, ret: "number", types: string[], args: unknown[]): number;
  _cs_describe(): number;
  UTF8ToString(ptr: number): string;
}

async function lightusd(
  module: string,
  files: Map<string, Uint8Array>,
  root: string,
  started: number,
): Promise<void> {
  const factory = (
    (await import(/* @vite-ignore */ module)) as {
      default: () => Promise<LightUsdModule>;
    }
  ).default;
  const M = await factory();
  const loaded = performance.now();
  const errors: string[] = [];
  const session = new M.NextFlattenSession();
  const begin = session.begin(files.get(root)!, root.split("/").pop()!, true);
  if (!begin.success) {
    throw new Error(begin.error ?? "begin failed");
  }
  let flat: ArrayBuffer | undefined;
  try {
    for (let i = 0; i < 256 && !flat; i++) {
      const step = session.step(null);
      if (!step.success) {
        errors.push(`composition stopped: ${step.error}`);
        break;
      }
      if (step.status === "need-layer") {
        const key = joinKey(root, step.key!);
        const bytes = files.get(key);
        if (!bytes && !errors.includes(`missing layer ${step.key}`)) {
          errors.push(`missing layer ${step.key}`);
        }
        session.provideLayer(step.key!, bytes ?? EMPTY_LAYER);
      } else if (step.status === "done") {
        flat = step.data;
      }
    }
  } finally {
    session.end();
    session.delete?.();
  }
  if (!flat) {
    post({ kind: "failed", error: errors.join("; ") || "no flattened layer" });
    return;
  }
  const doc = new M.LayerDocument();
  const load = doc.load(new Uint8Array(flat));
  if (!load.success) {
    throw new Error(load.error ?? "load failed");
  }
  const composed = performance.now();
  post({
    kind: "composed",
    loadMs: loaded - started,
    composeMs: composed - loaded,
  });
  const schemas = (path: string): string[] => {
    const m = doc.getPrimMetadata(path, "apiSchemas");
    return m?.authored && Array.isArray(m.value)
      ? (m.value as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
  };
  post({
    kind: "records",
    records: lightusdRecords(doc.exportJSON().text, schemas, errors),
  });
}

async function openusd(
  module: string,
  files: Map<string, Uint8Array>,
  root: string,
  started: number,
): Promise<void> {
  const factory = (
    (await import(/* @vite-ignore */ module)) as {
      default: (options: {
        print: (t: string) => void;
        printErr: (t: string) => void;
        preRun: ((m: OpenUsdModule) => void)[];
      }) => Promise<OpenUsdModule>;
    }
  ).default;
  // What OpenUSD prints (its diagnostics), kept for a failure's message.
  const printed: string[] = [];
  const keep = (t: string): void => {
    printed.push(t);
    if (printed.length > 40) {
      printed.shift();
    }
  };
  // Before OpenUSD's static constructors: Plug finds the plugInfo files the
  // build embedded under /usd only through PXR_PLUGINPATH_NAME (its other
  // locations are relative to an executable a worker doesn't have), and its
  // temporary folder (ArchGetTmpDir), /var/tmp here, must exist for a crash
  // report.
  const preRun = [
    (m: OpenUsdModule): void => {
      m.ENV["PXR_PLUGINPATH_NAME"] = "/usd/";
      m.FS.mkdirTree("/var/tmp");
    },
  ];
  const M = await factory({ print: keep, printErr: keep, preRun }).catch(
    (error: unknown) => {
      throw new Error(
        `starting: ${describeError(error)}; printed: ${printed.join(" | ")}`,
        { cause: error },
      );
    },
  );
  const loaded = performance.now();
  for (const [key, bytes] of files) {
    M.FS.mkdirTree(`/data/${key.slice(0, key.lastIndexOf("/"))}`);
    M.FS.writeFile(`/data/${key}`, bytes);
  }
  let prims: number;
  try {
    prims = M.ccall("cs_open", "number", ["string"], [`/data/${root}`]);
  } catch (error) {
    throw new Error(
      `${describeError(error)}; printed: ${printed.join(" | ")}`,
      { cause: error },
    );
  }
  const composed = performance.now();
  if (prims < 0) {
    post({ kind: "failed", error: "UsdStage::Open failed" });
    return;
  }
  post({
    kind: "composed",
    loadMs: loaded - started,
    composeMs: composed - loaded,
  });
  const records = JSON.parse(M.UTF8ToString(M._cs_describe())) as StageRecord;
  post({
    kind: "records",
    records: {
      ...records,
      errors: records.errors.map((e) => e.replaceAll("/data/", "")),
    },
  });
}

async function subset(
  module: string,
  files: Map<string, Uint8Array>,
  root: string,
  started: number,
): Promise<void> {
  const { open } = (await import(/* @vite-ignore */ module)) as {
    open: (
      f: Map<string, Uint8Array>,
      r: string,
    ) => Promise<{ describe(): StageRecord }>;
  };
  const loaded = performance.now();
  const stage = await open(files, root);
  const composed = performance.now();
  post({
    kind: "composed",
    loadMs: loaded - started,
    composeMs: composed - loaded,
  });
  post({ kind: "records", records: stage.describe() });
}

self.addEventListener(
  "message",
  (event: MessageEvent<OpenRequest>) => {
    const started = performance.now();
    // Only the page that made this worker can message it (no origin to
    // check); refuse anything that isn't a request from it.
    if (!isRequest(event.data)) {
      post({ kind: "failed", error: "not a request from the harness page" });
      return;
    }
    const { reader, module, root } = event.data;
    const files = new Map(
      Object.entries(event.data.files).map(([k, v]) => [k, new Uint8Array(v)]),
    );
    const run = { subset, lightusd, openusd }[reader];
    run(module, files, root, started).catch((error: unknown) =>
      post({ kind: "failed", error: describeError(error) }),
    );
  },
  { once: true },
);
