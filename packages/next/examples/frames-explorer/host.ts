// The frames explorer's compute worker, its side of the protocol (plan R13):
// it runs the stress suite, PROJ and the PROJ-dependent overlay geometry off
// the main thread. `worker.ts` is only `createHost(self, …)`; everything
// testable is here:
//
//  - `createHost`: a dispatcher over a message port that loads data lazily
//    (R6) and reports it (R9), runs the catalog and R18's user CRS checks
//    streaming one `result` per result, and builds overlays whose buffers it
//    transfers.
//  - `browserContext`: the worker's data, the frames store at `/frames-data/`
//    and PROJ at `/frames-data/proj/`, fetched with progress.
//
// The messages and the page's side (`createClient`) are in protocol.ts, which
// the main thread imports without this module's catalog and PROJ.
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import type { CrsRef } from "../../src/engineering/crs.ts";
import { loadProj, type ProjApi } from "../../src/engineering/proj.ts";
import {
  FRAME_DATA_ROLES,
  loadFrameData,
} from "../../src/ephemeris/loadFrameData.ts";
import { createFrames, type Frames } from "../../src/frames/frames.ts";
import {
  readWithProgress,
  type LoadProgress,
} from "../../src/io/readWithProgress.ts";
import { EARTH, MOON } from "../../src/scene/Body.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { Trajectory } from "../../src/trajectory/Trajectory.ts";
import {
  RIGID_VS_EXACT_COLORS,
  designGrid,
  distortion,
  overlayMesh,
  polyline,
  rigidVsExact,
  trajectoryPath,
  trueNorthLines,
  type Geometry,
} from "./overlays.ts";
import { GEOID, messageOf } from "./stress/runner.ts";
import {
  ORION_OEM,
  STRESS_CASES,
  boundCrsChecks,
  orionFromOem,
  runStress,
  type Fingerprint,
  type StoreManifest,
  type StressCase,
  type StressContext,
  type StressResult,
} from "./tests.ts";
import {
  FRAME_NAMES,
  DATA_ITEMS,
  type DataItem,
  type DataState,
  type FrameParams,
  type OverlayGeometry,
  type OverlayLayer,
  type OverlayRequest,
  type Reply,
  type Request,
  type RunSummary,
  type StateReply,
} from "./protocol.ts";

/**
 * Data the store doesn't have: the item's state is `missing`, and the message
 * carries the setup hint. Any other error from a loader is `error`.
 */
export class MissingDataError extends Error {
  override name = "MissingDataError";
}

const isMissing = (error: unknown): boolean =>
  error instanceof MissingDataError ||
  (error instanceof Error && error.name === "MissingDataError");

const errorName = (error: unknown): string =>
  error instanceof Error ? error.name : "Error";

/** The worker's side of its port (a `DedicatedWorkerGlobalScope` is one). */
export interface HostPort {
  postMessage(message: Reply, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<Request>) => void) | null;
}

/** Reports an item's bytes as its files arrive. */
export type ProgressReport = (
  item: DataItem,
  received: number,
  total: number | undefined,
) => void;

/**
 * Makes the worker's stress context: loads the frame data, and gives loaders
 * for PROJ, GEOID18 and Orion that report their bytes through `report`. A
 * loader throws `MissingDataError` for data the store doesn't have.
 */
export type MakeContext = (report: ProgressReport) => Promise<StressContext>;

export interface HostOptions {
  /** The catalog (default `STRESS_CASES`). */
  readonly cases?: readonly StressCase[];
  /** Recorded fingerprints (fingerprints.json), compared with every run's (R12). */
  readonly fingerprints?: Readonly<Record<string, Fingerprint>>;
  /** Builds an overlay's frame (default: `EngineeringFrame.create` with the worker's PROJ). */
  readonly createFrame?: (
    params: FrameParams,
    proj: ProjApi,
  ) => EngineeringFrame;
}

function defaultCreateFrame(
  params: FrameParams,
  proj: ProjApi,
): EngineeringFrame {
  return EngineeringFrame.create(
    {
      name: params.name,
      body: params.body === "moon" ? MOON : EARTH,
      crs: params.crs,
      ...(params.site !== undefined && { site: params.site }),
      ...(params.pipeline !== undefined && { pipeline: params.pipeline }),
      ...(params.allowBallpark !== undefined && {
        allowBallpark: params.allowBallpark,
      }),
    },
    proj,
  );
}

const VERTICAL_WKT = /\b(?:VERTCRS|VERTICALCRS|VERT_CS)\[/i;

/** Whether a CRS has a vertical part, which reads GEOID18 (the store's one geoid). */
const hasVertical = (crs: CrsRef): boolean =>
  crs.format === "wkid"
    ? crs.vcsWkid !== undefined
    : VERTICAL_WKT.test(crs.wkt2);

/**
 * Lets the event loop run: a message already queued (a `cancel`) is handled
 * before this resolves. A MessageChannel, not `setTimeout` (clamped to 4 ms
 * when nested) or `scheduler.yield` (whose continuation outranks queued
 * messages).
 */
function yieldToEvents(): Promise<void> {
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => {
      port1.close();
      resolve();
    };
    port2.postMessage(null);
  });
}

/** The catalog with a yield after each case, so a `cancel` lands before the next. */
const yielding = (cases: readonly StressCase[]): StressCase[] =>
  cases.map((c) => ({
    id: c.id,
    group: c.group,
    title: c.title,
    needs: c.needs,
    ...(c.cites !== undefined && { cites: c.cites }),
    async run(ctx) {
      try {
        return await c.run(ctx);
      } finally {
        await yieldToEvents();
      }
    },
  }));

function count(summary: RunSummary, result: StressResult): void {
  if (result.missing !== undefined) {
    summary.skipped++;
  } else if (result.displayOnly === true) {
    summary.shown++;
  } else if (result.pass) {
    summary.passed++;
  } else {
    summary.failed++;
  }
}

/** Every buffer of an overlay's typed arrays, once each. */
function transfers(geometry: OverlayGeometry): ArrayBuffer[] {
  const out = new Set<ArrayBuffer>();
  const add = (array: ArrayBufferView | undefined) => {
    if (array !== undefined) {
      out.add(array.buffer as ArrayBuffer);
    }
  };
  for (const layer of geometry.layers) {
    for (const { mesh, origin } of layer.chunks) {
      add(mesh.positions);
      add(mesh.colors);
      add(mesh.indices);
      add(origin);
    }
  }
  add(geometry.labels?.positions);
  add(geometry.labels?.values);
  return [...out];
}

const layer = (name: string, geometry: Geometry): OverlayLayer => ({
  name,
  chunks: overlayMesh(geometry),
});

/**
 * The worker's side: answers `Request`s on `port`.
 *
 *  - `load`: loads the item (and what it needs first: everything needs the
 *    frame data, GEOID18 needs PROJ) and answers with the item's final
 *    `state`, carrying the request's id.
 *  - `run`: the catalog (or `ids` of it) through `runStress`, one `result`
 *    per result as it is judged, then `done`. The host yields after every
 *    case, so a `cancel` stops the run before its next case.
 *  - `userCrs`: `boundCrsChecks` on the WKT2 (R18), streamed the same way.
 *  - `overlay`: the geometry, with its buffers transferred.
 *  - A request that fails is answered with `error`.
 *
 * Every item reports `fetching`, its `progress`, then `ready`, `missing` or
 * `error`: never left at `fetching` (Review Focus 5). A failed item isn't
 * remembered, so the next request retries it (after `npm run setup`).
 */
export function createHost(
  port: HostPort,
  makeContext: MakeContext,
  options: HostOptions = {},
): void {
  const cases = yielding(options.cases ?? STRESS_CASES);
  const { fingerprints } = options;
  const createFrame = options.createFrame ?? defaultCreateFrame;
  const post = (reply: Reply, transfer?: Transferable[]) =>
    port.postMessage(reply, transfer);

  const bytes = new Map<DataItem, number>();
  const report: ProgressReport = (item, received, total) => {
    bytes.set(item, received);
    post({
      type: "progress",
      item,
      received,
      ...(total !== undefined && { total }),
    });
  };

  const loads = new Map<DataItem, Promise<unknown>>();
  const readyInfo = new Map<DataItem, { bytes?: number; ms: number }>();
  /** The load requests whose final state `track` already sent. */
  const answered = new Set<number>();

  /**
   * Loads `item` once: posts `fetching`, then `ready` (and remembers the
   * value) or `missing`/`error` (and forgets the attempt). `id` is the load
   * request that started it, answered by the final state.
   */
  function track<T>(
    item: DataItem,
    load: () => Promise<T>,
    id?: number,
  ): Promise<T> {
    const have = loads.get(item) as Promise<T> | undefined;
    if (have !== undefined) {
      return have;
    }
    const start = performance.now();
    bytes.delete(item);
    post({ type: "state", item, state: "fetching" });
    const answer = id === undefined ? {} : { id };
    const promise: Promise<T> = (async () => load())().then(
      (value) => {
        const info = {
          ...(bytes.has(item) && { bytes: bytes.get(item)! }),
          ms: performance.now() - start,
        };
        readyInfo.set(item, info);
        post({ type: "state", item, state: "ready", ...info, ...answer });
        if (id !== undefined) {
          answered.add(id);
        }
        return value;
      },
      (error: unknown) => {
        if (loads.get(item) === promise) {
          loads.delete(item);
        }
        post({
          type: "state",
          item,
          state: isMissing(error) ? "missing" : "error",
          detail: messageOf(error),
          ...answer,
        });
        if (id !== undefined) {
          answered.add(id);
        }
        throw error;
      },
    );
    loads.set(item, promise);
    return promise;
  }

  interface Loaded {
    readonly raw: StressContext;
    /** The context the runner gets: its loaders report their state. */
    readonly ctx: StressContext;
  }

  function loadItem(
    raw: StressContext,
    item: "proj",
    id?: number,
  ): Promise<ProjApi>;
  function loadItem(
    raw: StressContext,
    item: "orion",
    id?: number,
  ): Promise<Trajectory>;
  function loadItem(
    raw: StressContext,
    item: "geoid",
    id?: number,
  ): Promise<void>;
  /** An item of `raw` through `track`; GEOID18 loads PROJ first. */
  async function loadItem(
    raw: StressContext,
    item: "proj" | "orion" | "geoid",
    id?: number,
  ): Promise<unknown> {
    switch (item) {
      case "proj":
        return raw.proj ?? track("proj", () => raw.loadProj(), id);
      case "orion":
        return raw.orion ?? track("orion", () => raw.loadOrion(), id);
      case "geoid": {
        await loadItem(raw, "proj");
        // Without a loader PROJ finds the grid itself (Node): nothing to fetch.
        if (raw.loadGeoid !== undefined) {
          await track("geoid", () => raw.loadGeoid!(), id);
        }
        return undefined;
      }
    }
  }

  function context(id?: number): Promise<Loaded> {
    return track(
      "frames",
      async () => {
        const raw = await makeContext(report);
        const ctx: StressContext = {
          frames: raw.frames,
          ...(raw.proj !== undefined && { proj: raw.proj }),
          ...(raw.orion !== undefined && { orion: raw.orion }),
          ...(raw.manifest !== undefined && { manifest: raw.manifest }),
          loadProj: () => loadItem(raw, "proj"),
          loadOrion: () => loadItem(raw, "orion"),
          ...(raw.loadGeoid !== undefined && {
            loadGeoid: () => loadItem(raw, "geoid"),
          }),
        };
        return { raw, ctx };
      },
      id,
    );
  }

  async function load(item: DataItem, id: number): Promise<void> {
    const answer = (state: DataState, extra: Partial<StateReply> = {}) => {
      if (!answered.delete(id)) {
        post({ type: "state", item, state, ...extra, id });
      }
    };
    let loaded: Loaded;
    try {
      loaded = await context(item === "frames" ? id : undefined);
    } catch (error) {
      answer(isMissing(error) ? "missing" : "error", {
        detail:
          item === "frames"
            ? messageOf(error)
            : `needs the frame data, which did not load: ${messageOf(error)}`,
      });
      return;
    }
    const { raw } = loaded;
    const failed = (error: unknown, prefix = "") =>
      answer(isMissing(error) ? "missing" : "error", {
        detail: `${prefix}${messageOf(error)}`,
      });
    try {
      switch (item) {
        case "frames":
          break;
        case "proj":
          await loadItem(raw, "proj", id);
          break;
        case "orion":
          await loadItem(raw, "orion", id);
          break;
        case "geoid":
          try {
            await loadItem(raw, "proj");
          } catch (error) {
            failed(error, "needs PROJ, which did not load: ");
            return;
          }
          await loadItem(raw, "geoid", id);
          break;
      }
    } catch (error) {
      failed(error);
      return;
    }
    answer("ready", readyInfo.get(item) ?? {});
  }

  const runs = new Set<AbortController>();

  /** Runs `body`, streaming its results and then `done`, or `error`. */
  async function stream(
    id: number,
    body: (
      ctx: Loaded,
      signal: AbortSignal,
      onResult: (r: StressResult) => void,
    ) => Promise<unknown>,
  ): Promise<void> {
    const start = performance.now();
    const controller = new AbortController();
    runs.add(controller);
    const summary: RunSummary = {
      passed: 0,
      failed: 0,
      skipped: 0,
      shown: 0,
      ms: 0,
      cancelled: false,
    };
    try {
      const loaded = await context();
      await body(loaded, controller.signal, (result) => {
        count(summary, result);
        post({ type: "result", id, result });
      });
      summary.ms = performance.now() - start;
      summary.cancelled = controller.signal.aborted;
      post({ type: "done", id, summary });
    } catch (error) {
      post({
        type: "error",
        id,
        name: errorName(error),
        message: messageOf(error),
      });
    } finally {
      runs.delete(controller);
    }
  }

  const frameCache = new Map<string, EngineeringFrame>();

  async function frameFor(
    loaded: Loaded,
    params: FrameParams,
  ): Promise<EngineeringFrame> {
    const proj = await loadItem(loaded.raw, "proj");
    if (hasVertical(params.crs)) {
      await loadItem(loaded.raw, "geoid");
    }
    const key = JSON.stringify(params);
    let frame = frameCache.get(key);
    if (frame === undefined) {
      frame = createFrame(params, proj);
      frameCache.set(key, frame);
    }
    return frame;
  }

  const operationOf = (
    frame: EngineeringFrame,
  ): OverlayGeometry["operation"] => ({
    pipeline: frame.operation.pipeline,
    accuracy: frame.operation.accuracy,
    ballpark: frame.operation.ballpark,
    grids: [...frame.operation.grids],
  });

  async function build(
    loaded: Loaded,
    request: OverlayRequest,
  ): Promise<Omit<OverlayGeometry, "ms">> {
    switch (request.kind) {
      case "designGrid": {
        const p = request.params;
        const frame = await frameFor(loaded, p.frame);
        return {
          kind: request.kind,
          layers: [
            layer("grid", designGrid(frame, p.extent, p.step, p.segment)),
          ],
          operation: operationOf(frame),
        };
      }
      case "trueNorthLines": {
        const p = request.params;
        const frame = await frameFor(loaded, p.frame);
        return {
          kind: request.kind,
          layers: [
            layer(
              "trueNorth",
              trueNorthLines(
                frame,
                p.extent,
                p.step,
                p.segment,
                p.exaggeration !== undefined
                  ? { exaggeration: p.exaggeration }
                  : {},
              ),
            ),
          ],
          operation: operationOf(frame),
        };
      }
      case "rigidVsExact": {
        const p = request.params;
        const frame = await frameFor(loaded, p.frame);
        const r = rigidVsExact(frame, p.from, p.to, p.samples);
        return {
          kind: request.kind,
          layers: [
            layer("exact", polyline(r.exact, RIGID_VS_EXACT_COLORS.exact)),
            layer("rigid", polyline(r.rigid, RIGID_VS_EXACT_COLORS.rigid)),
          ],
          sagAtEnd: r.sagAtEnd,
          operation: operationOf(frame),
        };
      }
      case "distortion": {
        const p = request.params;
        const frame = await frameFor(loaded, p.frame);
        const d = distortion(frame, p.extent, p.step, {
          height: p.height,
          tissotRadius: p.tissotRadius,
          ...(p.contoursPpm !== undefined && { contoursPpm: p.contoursPpm }),
        });
        return {
          kind: request.kind,
          layers: [layer("tissot", d.tissot), layer("contours", d.contours)],
          labels: {
            positions: d.labels.positions,
            values: d.labels.ppm,
            unit: "ppm",
          },
          skipped: d.skipped,
          operation: operationOf(frame),
        };
      }
      case "trajectoryPath": {
        const p = request.params;
        if (!FRAME_NAMES.includes(p.drawIn)) {
          throw new RangeError(
            `trajectoryPath: "${String(p.drawIn)}" is not a built-in frame (${FRAME_NAMES.join(", ")})`,
          );
        }
        const orion = await loadItem(loaded.raw, "orion");
        const { frames } = loaded.raw;
        const path = trajectoryPath(
          orion,
          frames[p.drawIn],
          frames,
          Instant.fromTdb(p.t0),
          Instant.fromTdb(p.t1),
          p.step,
          Instant.fromTdb(p.at),
          p.color !== undefined ? { color: p.color } : {},
        );
        return { kind: request.kind, layers: [layer("path", path)] };
      }
    }
  }

  async function overlay(request: Request & OverlayRequest): Promise<void> {
    const start = performance.now();
    try {
      const loaded = await context();
      const built = await build(loaded, request);
      const geometry: OverlayGeometry = {
        ...built,
        ms: performance.now() - start,
      };
      post({ type: "overlay", id: request.id, geometry }, transfers(geometry));
    } catch (error) {
      post({
        type: "error",
        id: request.id,
        name: errorName(error),
        message: messageOf(error),
      });
    }
  }

  port.onmessage = (event) => {
    const request = event.data;
    switch (request.type) {
      case "cancel":
        for (const run of runs) {
          run.abort();
        }
        return;
      case "load":
        if (!DATA_ITEMS.includes(request.item)) {
          post({
            type: "error",
            id: request.id,
            name: "RangeError",
            message: `load: "${String(request.item)}" is not a data item (${DATA_ITEMS.join(", ")})`,
          });
          return;
        }
        void load(request.item, request.id);
        return;
      case "run": {
        const { ids } = request;
        void stream(request.id, ({ ctx }, signal, onResult) =>
          runStress(ctx, {
            cases,
            signal,
            onResult,
            ...(ids !== undefined && { ids }),
            ...(fingerprints !== undefined && { fingerprints }),
          }),
        );
        return;
      }
      case "userCrs": {
        const { wkt2, label } = request;
        void stream(request.id, async ({ raw, ctx }, signal, onResult) => {
          if (VERTICAL_WKT.test(wkt2)) {
            // A compound CRS reads GEOID18; without it the checks say what
            // failed, and the item's state says why.
            await loadItem(raw, "geoid").catch(() => {});
          }
          for (const result of await boundCrsChecks(ctx, wkt2, label)) {
            if (signal.aborted) {
              break;
            }
            onResult(result);
          }
        });
        return;
      }
      case "overlay":
        void overlay(request);
        return;
      default:
        post({
          type: "error",
          id: (request as { id: number }).id,
          name: "TypeError",
          message: `unknown request "${String((request as { type: unknown }).type)}"`,
        });
    }
  };
}

const SETUP = "run `npm run setup` and restart the dev server";

/** The store's manifest, or `MissingDataError` when the store isn't served. */
async function fetchManifest(root: string): Promise<StoreManifest> {
  const url = `${root}manifest.json`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(`could not fetch ${url}: ${messageOf(cause)}`, { cause });
  }
  if (response.status === 404) {
    throw new MissingDataError(
      `the frames data store is not served at ${root} (${url} returned 404); ${SETUP}`,
    );
  }
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    parsed = undefined;
  }
  const files = (parsed as { files?: unknown } | undefined)?.files;
  if (!Array.isArray(files)) {
    throw new MissingDataError(
      `${url} is not the frames data store's manifest (the server answered with another page); ${SETUP}`,
    );
  }
  return parsed as StoreManifest;
}

const hex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

/** A store file, checked against its SHA-256 in the manifest. */
async function fetchChecked(
  root: string,
  entry: StoreManifest["files"][number],
  onProgress: (received: number, total: number | undefined) => void,
): Promise<ArrayBuffer> {
  const url = `${root}${entry.file.split("/").map(encodeURIComponent).join("/")}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(`could not fetch ${url}: ${messageOf(cause)}`, { cause });
  }
  if (!response.ok) {
    throw new Error(
      `${entry.file} is listed in manifest.json but ${url} returned ${response.status}; re-run \`npm run setup\``,
    );
  }
  const bytes = await readWithProgress(response, onProgress);
  if (hex(await crypto.subtle.digest("SHA-256", bytes)) !== entry.sha256) {
    throw new Error(
      `${entry.file} does not match its SHA-256 in manifest.json (the file is corrupt or changed); re-run \`npm run setup\``,
    );
  }
  return bytes;
}

const FRAME_ROLES: ReadonlySet<string> = new Set(FRAME_DATA_ROLES);

/**
 * The worker's data from the frames store served at `base` (R6, R9): the frame
 * data at once; PROJ (its WebAssembly and `proj.db`) from `base`'s `proj/`
 * when a case or overlay needs it; GEOID18 only for one that needs it; the
 * Artemis II OEM only for Orion. Each reports its bytes, summed over its
 * files, with a total once every file has stated its size. Data that
 * manifest.json doesn't list, or a store that isn't served, is a
 * `MissingDataError` with the setup hint.
 */
export function browserContext(base = "/frames-data/"): MakeContext {
  const root = base.endsWith("/") ? base : `${base}/`;
  return async (report) => {
    const manifest = await fetchManifest(root);
    const listed = new Map(manifest.files.map((f) => [f.file, f]));
    const roles = (manifest.files as readonly { file: string; role?: string }[])
      .filter((f) => f.role !== undefined && FRAME_ROLES.has(f.role))
      .map((f) => f.file);
    const expected: Record<DataItem, readonly string[]> = {
      frames: roles,
      proj: ["proj_capi.wasm", "proj.db"],
      geoid: [GEOID],
      orion: [ORION_OEM],
    };
    const received = new Map<
      DataItem,
      Map<string, { received: number; total: number | undefined }>
    >();
    const progress = (
      item: DataItem,
      file: string,
      bytes: number,
      total: number | undefined,
    ) => {
      const files = received.get(item) ?? new Map();
      received.set(item, files);
      files.set(file, { received: bytes, total });
      let sum = 0;
      let size = 0;
      let known = expected[item].every((f) => files.has(f));
      for (const f of files.values()) {
        sum += f.received;
        size += f.total ?? 0;
        known &&= f.total !== undefined;
      }
      report(item, sum, known ? size : undefined);
    };
    const need = (what: string, files: readonly string[]) => {
      for (const file of files) {
        if (!listed.has(file)) {
          throw new MissingDataError(
            `${what} is not in the frames data store (manifest.json lists no ${file}); ${SETUP}`,
          );
        }
      }
    };

    const data = await loadFrameData(root, (file, bytes, total) =>
      progress("frames", file, bytes, total),
    );
    const frames: Frames = createFrames(data);
    const projBase = `${root}proj/`;
    const onProj: LoadProgress = (file, bytes, total) =>
      progress(file === GEOID ? "geoid" : "proj", file, bytes, total);
    return {
      frames,
      manifest,
      loadProj: async () => {
        need("PROJ", [
          "proj/proj_capi.mjs",
          "proj/proj_capi.wasm",
          "proj/proj.db",
        ]);
        return loadProj({ base: projBase, onProgress: onProj });
      },
      loadGeoid: async () => {
        need("GEOID18", [`proj/${GEOID}`]);
        await loadProj({ base: projBase, grids: [GEOID], onProgress: onProj });
      },
      loadOrion: async () => {
        need("The Artemis II trajectory", [ORION_OEM]);
        const bytes = await fetchChecked(
          root,
          listed.get(ORION_OEM)!,
          (n, total) => progress("orion", ORION_OEM, n, total),
        );
        return orionFromOem(new TextDecoder().decode(bytes), frames);
      },
    };
  };
}
