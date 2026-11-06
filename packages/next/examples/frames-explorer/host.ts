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
  adaptivePath,
  designGrid,
  distortion,
  overlayMesh,
  polyline,
  rigidVsExact,
  trajectoryPath,
  trueNorthLines,
  type Geometry,
} from "./overlays.ts";
import { composedView } from "./composed.ts";
import {
  REFERENCES,
  type ComposedView,
  type Reference,
} from "./panel/model.ts";
import { GEOID, Needs, messageOf } from "./stress/runner.ts";
import { buildTree, type TreeNode } from "./tree.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import {
  ORION_OEM,
  STRESS_CASES,
  boundCrsChecks,
  orionFromOem,
  runStress,
  type Fingerprint,
  type StoreManifest,
  type DataContext,
  type StressCase,
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
  type TrajectoryInfo,
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
 * Makes the worker's data context: loaders for the frame data, PROJ, GEOID18
 * and Orion (or the data itself, already in hand) that report their bytes
 * through `report`. Nothing is fetched until a loader is called, so a check
 * that needs no frame data runs without it (R5, F44). A loader throws
 * `MissingDataError` for data the store doesn't have.
 */
export type MakeContext = (report: ProgressReport) => Promise<DataContext>;

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

/**
 * The catalog with a yield after each case, so a `cancel` lands before the
 * next. Every field of the case is kept (spread), so one added later can't
 * be dropped here (as `optionalNeeds` once was); only `run` is wrapped.
 */
export const yielding = (cases: readonly StressCase[]): StressCase[] =>
  cases.map((c) => ({
    ...c,
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

const layer = (
  name: string,
  geometry: Geometry,
  extent?: number,
): OverlayLayer => ({
  name,
  chunks: overlayMesh(geometry, extent !== undefined ? { extent } : {}),
});

/**
 * Orion's path in chunks of up to 1e7 m (`overlayMesh`): half-metre float32
 * steps against the path's own ±10 m, and a few thousand draws for the whole
 * mission even in ITRF (whose path winds about 2e10 m), not hundreds of
 * thousands. Only the adaptive path takes it; the uniform one keeps the default.
 */
export const TRAJECTORY_CHUNK_EXTENT = 1e7;

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
    readonly raw: DataContext;
    /** The context the runner gets: its loaders report their state. */
    readonly ctx: DataContext;
  }

  function loadItem(
    raw: DataContext,
    item: "frames",
    id?: number,
  ): Promise<Frames>;
  function loadItem(
    raw: DataContext,
    item: "proj",
    id?: number,
  ): Promise<ProjApi>;
  function loadItem(
    raw: DataContext,
    item: "orion",
    id?: number,
  ): Promise<Trajectory>;
  function loadItem(
    raw: DataContext,
    item: "geoid",
    id?: number,
  ): Promise<void>;
  /**
   * An item of `raw` through `track`; GEOID18 loads PROJ first, and Orion
   * the frame data (the trajectory is placed in the frame tree).
   */
  async function loadItem(
    raw: DataContext,
    item: "frames" | "proj" | "orion" | "geoid",
    id?: number,
  ): Promise<unknown> {
    switch (item) {
      case "frames":
        return (
          raw.frames ??
          track(
            "frames",
            () =>
              raw.loadFrames?.() ??
              Promise.reject(new MissingDataError("no frame data was given")),
            id,
          )
        );
      case "proj":
        return raw.proj ?? track("proj", () => raw.loadProj(), id);
      case "orion":
        if (raw.orion !== undefined) {
          return raw.orion;
        }
        await loadItem(raw, "frames");
        return track("orion", () => raw.loadOrion(), id);
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

  /**
   * The data context, made once (a failed make is tried again next time).
   * Making it fetches nothing: each item loads when first asked for.
   */
  let made: Promise<Loaded> | undefined;
  function context(): Promise<Loaded> {
    if (made === undefined) {
      const attempt = makeContext(report).then((raw): Loaded => ({
        raw,
        ctx: {
          ...(raw.frames !== undefined && { frames: raw.frames }),
          ...(raw.proj !== undefined && { proj: raw.proj }),
          ...(raw.orion !== undefined && { orion: raw.orion }),
          ...(raw.manifest !== undefined && { manifest: raw.manifest }),
          ...(raw.loadManifest !== undefined && {
            loadManifest: () => raw.loadManifest!(),
          }),
          loadFrames: () => loadItem(raw, "frames"),
          loadProj: () => loadItem(raw, "proj"),
          loadOrion: () => loadItem(raw, "orion"),
          ...(raw.loadGeoid !== undefined && {
            loadGeoid: () => loadItem(raw, "geoid"),
          }),
        },
      }));
      made = attempt;
      attempt.catch(() => {
        if (made === attempt) {
          made = undefined;
        }
      });
    }
    return made;
  }

  async function load(item: DataItem, id: number): Promise<void> {
    const answer = (state: DataState, extra: Partial<StateReply> = {}) => {
      if (!answered.delete(id)) {
        post({ type: "state", item, state, ...extra, id });
      }
    };
    let loaded: Loaded;
    try {
      loaded = await context();
    } catch (error) {
      answer(isMissing(error) ? "missing" : "error", {
        detail: messageOf(error),
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
          await loadItem(raw, "frames", id);
          break;
        case "proj":
          await loadItem(raw, "proj", id);
          break;
        case "orion":
          try {
            await loadItem(raw, "frames");
          } catch (error) {
            failed(error, "needs the frame data, which did not load: ");
            return;
          }
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
            layer(
              "grid",
              designGrid(
                frame,
                p.extent,
                p.step,
                p.segment,
                p.skipEvery !== undefined ? { skipEvery: p.skipEvery } : {},
              ),
            ),
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
        const r = rigidVsExact(
          frame,
          p.from,
          p.to,
          p.samples,
          p.exaggeration !== undefined ? { exaggeration: p.exaggeration } : {},
        );
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
        const frames = await loadItem(loaded.raw, "frames");
        const style = p.color !== undefined ? { color: p.color } : {};
        if (p.adaptive !== undefined) {
          const { sampling, positions, colors } = adaptivePath(
            orion,
            frames[p.drawIn],
            frames,
            Instant.fromTdb(p.t0),
            Instant.fromTdb(p.t1),
            { ...p.adaptive, step: p.step },
            Instant.fromTdb(p.at),
            style,
          );
          return {
            kind: request.kind,
            layers: [
              layer("path", { positions, colors }, TRAJECTORY_CHUNK_EXTENT),
            ],
            sampling,
          };
        }
        const path = trajectoryPath(
          orion,
          frames[p.drawIn],
          frames,
          Instant.fromTdb(p.t0),
          Instant.fromTdb(p.t1),
          p.step,
          Instant.fromTdb(p.at),
          style,
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

  /** Orion's node and statements at `at` (TDB seconds), one reply (`TrajectoryInfo`). */
  async function trajectoryInfo(id: number, at: number): Promise<void> {
    try {
      const loaded = await context();
      const orion = await loadItem(loaded.raw, "orion");
      const frames = await loadItem(loaded.raw, "frames");
      const instant = Instant.fromTdb(at);
      const tree = buildTree(frames, { trajectories: [orion] }, instant);
      const find = (n: TreeNode): TreeNode | undefined =>
        n.id === orion.name ? n : n.children.map(find).find((x) => x);
      const node = find(tree)!;
      const composed = {} as Record<Reference, ComposedView>;
      for (const reference of REFERENCES) {
        const v = composedView(tree, frames, instant, reference, orion.name);
        if (v === undefined) {
          throw new Error(`Orion has no statement against ${reference}`);
        }
        composed[reference] = v;
      }
      const m = frameTransform(orion.frame, frames.itrf, instant);
      const info: TrajectoryInfo = {
        node: {
          id: node.id,
          // The OEM's object, as the page names it (the trajectory's own
          // name, "orion", stays its id).
          label: "Orion",
          edge: node.edge,
          children: [],
        },
        parent: orion.reference.name,
        composed,
        itrf: [m[12]!, m[13]!, m[14]!],
        at,
      };
      post({ type: "trajectoryInfo", id, info });
    } catch (error) {
      post({
        type: "error",
        id,
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
          // The frame data where it loads (only the accuracy row reads it,
          // F44); boundCrsChecks loads PROJ itself, and says if it can't.
          const met = await new Needs(ctx).meet([], ["frames"]);
          if ("missing" in met) {
            throw new MissingDataError(met.reasons.join(" "));
          }
          for (const result of await boundCrsChecks(met.ctx, wkt2, label)) {
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
      case "trajectoryInfo":
        void trajectoryInfo(request.id, request.at);
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
 * The worker's data from the frames store served at `base` (R6, R9): each
 * item when it's first asked for (F44: a check that needs no frame data
 * doesn't wait for it, or fail without it). The frame data when a case,
 * overlay or Orion needs it; PROJ (its WebAssembly and `proj.db`) from
 * `base`'s `proj/` when a case or overlay needs it; GEOID18 only for one
 * that needs it; the Artemis II OEM only for Orion. Each reports its bytes,
 * summed over its files, with a total once every file has stated its size.
 * Data that manifest.json doesn't list, or a store that isn't served, is a
 * `MissingDataError` with the setup hint.
 */
export function browserContext(base = "/frames-data/"): MakeContext {
  const root = base.endsWith("/") ? base : `${base}/`;
  return async (report) => {
    /** Loads once; a failure is tried again on the next call. */
    const once = <T>(load: () => Promise<T>): (() => Promise<T>) => {
      let p: Promise<T> | undefined;
      return () => {
        if (p === undefined) {
          const attempt = load();
          p = attempt;
          attempt.catch(() => {
            if (p === attempt) {
              p = undefined;
            }
          });
        }
        return p;
      };
    };
    const store = once(async () => {
      const manifest = await fetchManifest(root);
      return {
        manifest,
        listed: new Map(manifest.files.map((f) => [f.file, f])),
        roles: (manifest.files as readonly { file: string; role?: string }[])
          .filter((f) => f.role !== undefined && FRAME_ROLES.has(f.role))
          .map((f) => f.file),
      };
    });
    let roles: readonly string[] = [];
    const expected = (item: DataItem): readonly string[] =>
      ({
        frames: roles,
        proj: ["proj_capi.wasm", "proj.db"],
        geoid: [GEOID],
        orion: [ORION_OEM],
      })[item];
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
      let known = expected(item).every((f) => files.has(f));
      for (const f of files.values()) {
        sum += f.received;
        size += f.total ?? 0;
        known &&= f.total !== undefined;
      }
      report(item, sum, known ? size : undefined);
    };
    const need = async (what: string, files: readonly string[]) => {
      const { listed } = await store();
      for (const file of files) {
        if (!listed.has(file)) {
          throw new MissingDataError(
            `${what} is not in the frames data store (manifest.json lists no ${file}); ${SETUP}`,
          );
        }
      }
      return listed;
    };
    const loadFrames = once(async () => {
      roles = (await store()).roles;
      const data = await loadFrameData(root, (file, bytes, total) =>
        progress("frames", file, bytes, total),
      );
      return createFrames(data);
    });
    const projBase = `${root}proj/`;
    const onProj: LoadProgress = (file, bytes, total) =>
      progress(file === GEOID ? "geoid" : "proj", file, bytes, total);
    return {
      loadFrames,
      loadManifest: async () => (await store()).manifest,
      loadProj: async () => {
        await need("PROJ", [
          "proj/proj_capi.mjs",
          "proj/proj_capi.wasm",
          "proj/proj.db",
        ]);
        return loadProj({ base: projBase, onProgress: onProj });
      },
      loadGeoid: async () => {
        await need("GEOID18", [`proj/${GEOID}`]);
        await loadProj({ base: projBase, grids: [GEOID], onProgress: onProj });
      },
      loadOrion: async () => {
        const listed = await need("The Artemis II trajectory", [ORION_OEM]);
        const frames = await loadFrames();
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
