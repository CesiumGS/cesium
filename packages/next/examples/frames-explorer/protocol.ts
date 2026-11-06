// The frames explorer's worker protocol (plan R13): the messages between the
// page and its compute worker, and the page's side, `createClient`.
//
// This module is what the main thread imports, so it imports types only: the
// stress catalog, PROJ and the overlay builders stay in the worker's bundle
// (host.ts, which worker.ts starts). A test checks that every import here is
// type-only.
//
// Only plain data crosses (structured clone): results already judged by the
// runner (expected throws are matched in the worker, before serializing: R7),
// instants as TDB seconds, errors as `{ name, message }`, geometry as typed
// arrays. The ion token never crosses: R18's request carries only the WKT2.
import type { SiteTransform } from "../../src/engineering/EngineeringFrame.ts";
import type { CrsRef } from "../../src/engineering/crs.ts";
import type {
  AdaptiveOptions,
  Extent,
  OverlayChunk,
  Rgba,
  Sampling,
} from "./overlays.ts";
import type { ComposedView, Reference } from "./panel/model.ts";
import type { StressResult } from "./tests.ts";
import type { TreeNode } from "./tree.ts";

/** The data the worker loads, each shown in the Status section (R9). */
export type DataItem = "frames" | "proj" | "geoid" | "orion";

export const DATA_ITEMS: readonly DataItem[] = [
  "frames",
  "proj",
  "geoid",
  "orion",
];

/**
 * An item's loading state (R9). `missing` is data the store doesn't have,
 * with the setup hint in `detail`; `error` is a fetch or a file that failed.
 */
export type DataState = "idle" | "fetching" | "ready" | "missing" | "error";

/** The overlays the worker builds (R13): the ones that need PROJ or Orion. */
export type OverlayKind =
  | "designGrid"
  | "trueNorthLines"
  | "rigidVsExact"
  | "distortion"
  | "trajectoryPath";

/** A built-in frame, by its name in `Frames`. */
export type FrameName =
  | "icrf"
  | "hcrs"
  | "gcrf"
  | "earthIcrf"
  | "eme2000"
  | "moonIcrf"
  | "itrf"
  | "moonMe"
  | "moonPa";

export const FRAME_NAMES: readonly FrameName[] = [
  "icrf",
  "hcrs",
  "gcrf",
  "earthIcrf",
  "eme2000",
  "moonIcrf",
  "itrf",
  "moonMe",
  "moonPa",
];

/**
 * An engineering frame as plain data: the worker builds the
 * `EngineeringFrame` from it with its own PROJ. A frame whose CRS has a
 * vertical part (a `vcsWkid`, or a WKT2 with a vertical CRS) loads GEOID18
 * first, the store's one geoid grid (R6).
 */
export interface FrameParams {
  readonly name: string;
  readonly body: "earth" | "moon";
  readonly crs: CrsRef;
  readonly site?: SiteTransform;
  readonly pipeline?: string;
  readonly allowBallpark?: boolean;
}

/** `designGrid` and `trueNorthLines`: lines every `step`, sampled every `segment` design units. */
export interface DesignGridParams {
  readonly frame: FrameParams;
  readonly extent: Extent;
  readonly step: number;
  readonly segment: number;
  /** `designGrid` only: leave out every k-th line from the corner (the minor lines, `designGrid`'s option). */
  readonly skipEvery?: number;
}

/** `trueNorthLines`: as the grid, with the convergence drawn `exaggeration` times (display only, F32; default 1). */
export interface TrueNorthLinesParams extends DesignGridParams {
  readonly exaggeration?: number;
}

/** `rigidVsExact`: the design line from `from` to `to`, in `samples` segments. */
export interface RigidVsExactParams {
  readonly frame: FrameParams;
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  readonly samples: number;
  /** The rigid line drawn at exact + k (rigid − exact) (display only, S-C1; default 1). */
  readonly exaggeration?: number;
}

/** `distortion`: Tissot ellipses and combined-factor contours over `extent`. */
export interface DistortionParams {
  readonly frame: FrameParams;
  readonly extent: Extent;
  readonly step: number;
  readonly height: number;
  readonly tissotRadius: number;
  readonly contoursPpm?: readonly number[];
}

/**
 * `trajectoryPath`: Orion's path from `t0` to `t1` every `step` seconds, in
 * `drawIn`, placed in ITRF at `at`. Instants are TDB seconds past J2000.
 * With `adaptive`, `step` is the coarse step and `adaptivePath` refines it
 * (finer where the path bends, within its budgets).
 */
export interface TrajectoryPathParams {
  readonly drawIn: FrameName;
  readonly t0: number;
  readonly t1: number;
  readonly step: number;
  readonly at: number;
  readonly color?: Rgba;
  readonly adaptive?: Readonly<Omit<AdaptiveOptions, "step" | "now">>;
}

/**
 * Orion as the tree and the legend need it at `at` (TDB seconds), from one
 * reply so the two never disagree: its node (plain data, no class
 * references), the frame it hangs under, the walk's statements against each
 * reference (`composedView`), and its origin in ITRF, meters.
 */
export interface TrajectoryInfo {
  node: TreeNode;
  /** The node's parent in the tree: the trajectory's reference frame's name. */
  parent: string;
  composed: Record<Reference, ComposedView>;
  itrf: [number, number, number];
  at: number;
}

export interface OverlayParams {
  designGrid: DesignGridParams;
  trueNorthLines: TrueNorthLinesParams;
  rigidVsExact: RigidVsExactParams;
  distortion: DistortionParams;
  trajectoryPath: TrajectoryPathParams;
}

export type OverlayRequest = {
  [K in OverlayKind]: { type: "overlay"; kind: K; params: OverlayParams[K] };
}[OverlayKind];

/** What the page asks of the worker. Every request has an `id` unique to its client. */
export type Request = { id: number } & (
  | { type: "load"; item: DataItem }
  | { type: "run"; ids?: readonly string[] }
  /** Stops every run in progress before its next case; each still sends its `done`. */
  | { type: "cancel" }
  | OverlayRequest
  /** R18: `boundCrsChecks` on the user's WKT2, streamed like `run`. */
  | { type: "userCrs"; wkt2: string; label: string }
  /** Orion's tree node and statements at `at` (TDB seconds); loads the OEM if needed. */
  | { type: "trajectoryInfo"; at: number }
);

export interface ProgressReply {
  type: "progress";
  item: DataItem;
  /** Bytes received so far of every file of the item. */
  received: number;
  /** The item's size, once every file's response has stated its `Content-Length`. */
  total?: number;
}

export interface StateReply {
  type: "state";
  item: DataItem;
  state: DataState;
  /** For `missing` and `error`: what failed, and for `missing` the setup hint. */
  detail?: string;
  /** For `ready`: the bytes fetched (absent when nothing was fetched). */
  bytes?: number;
  /** For `ready`: the load's time, milliseconds. */
  ms?: number;
  /** The `load` request this state answers. */
  id?: number;
}

/** A run's counts. `shown` is display-only results (R11), outside pass and fail. */
export interface RunSummary {
  passed: number;
  failed: number;
  /** Results whose data was missing. */
  skipped: number;
  shown: number;
  ms: number;
  /** Whether a `cancel` stopped the run before its last case. */
  cancelled: boolean;
}

/**
 * One drawn part of an overlay: `overlayMesh`'s chunks, each a float32
 * line-list mesh and the float64 origin of its draw, ready for the world.
 */
export interface OverlayLayer {
  name: string;
  chunks: OverlayChunk[];
}

/** An overlay as built in the worker. Its typed arrays' buffers are transferred. */
export interface OverlayGeometry {
  kind: OverlayKind;
  /**
   * designGrid: `grid`; trueNorthLines: `trueNorth`; rigidVsExact: `exact`
   * and `rigid`; distortion: `tissot` and `contours`; trajectoryPath: `path`.
   */
  layers: OverlayLayer[];
  /** distortion: label positions (x, y, z each, meters) and their values. */
  labels?: { positions: Float64Array; values: Float64Array; unit: string };
  /** rigidVsExact: the separation at the line's end, meters. */
  sagAtEnd?: number;
  /** distortion: the nodes with no scale, left out. */
  skipped?: number;
  /** trajectoryPath with `adaptive`: how it was sampled. */
  sampling?: Sampling;
  /** The frame's recorded PROJ operation, for the legend's accuracy (R8). */
  operation?: {
    pipeline: string;
    /** Meters; undefined when PROJ states none. */
    accuracy: number | undefined;
    ballpark: boolean;
    grids: string[];
  };
  /** The build's time, milliseconds. */
  ms: number;
}

/** What the worker sends back. */
export type Reply =
  | ProgressReply
  | StateReply
  | { type: "result"; id: number; result: StressResult }
  | { type: "done"; id: number; summary: RunSummary }
  | { type: "overlay"; id: number; geometry: OverlayGeometry }
  | { type: "trajectoryInfo"; id: number; info: TrajectoryInfo }
  | { type: "error"; id: number; name: string; message: string };

/** A worker as the client uses it (a `Worker` is one). */
export interface ClientWorker {
  postMessage(message: Request): void;
  onmessage: ((event: MessageEvent<Reply>) => void) | null;
  /** The worker failed: its script didn't load (or threw while loading), or it threw outside a request. */
  onerror: ((event: ErrorEvent) => void) | null;
  /** A reply could not be deserialized. */
  onmessageerror: ((event: MessageEvent) => void) | null;
  terminate(): void;
}

/** The page's side of the protocol. */
export interface Client {
  /** Runs the catalog, or the cases (or groups) with `ids`, calling `onResult` per result. */
  run(
    ids?: readonly string[],
    onResult?: (result: StressResult) => void,
  ): Promise<RunSummary>;
  /** R18: the bound-CRS checks on the user's WKT2 (never a token). */
  userCrs(
    wkt2: string,
    label: string,
    onResult?: (result: StressResult) => void,
  ): Promise<RunSummary>;
  /** Loads an item; resolves with its final state (`ready`, `missing` or `error`). */
  load(item: DataItem): Promise<StateReply>;
  overlay<K extends OverlayKind>(
    kind: K,
    params: OverlayParams[K],
  ): Promise<OverlayGeometry>;
  /** Orion's node and statements at `at`, TDB seconds (`TrajectoryInfo`). */
  trajectoryInfo(at: number): Promise<TrajectoryInfo>;
  /** Stops runs in progress before their next case; their promises resolve with partial counts. */
  cancel(): void;
  /** Every item's progress and state, as they arrive. Returns an unsubscribe. */
  onProgress(callback: (reply: ProgressReply | StateReply) => void): () => void;
}

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

/**
 * The page's side: promises over `worker`. Aborting `signal` posts `cancel`,
 * terminates the worker (once) and rejects every pending promise with an
 * `AbortError`; every later call rejects the same way and posts nothing.
 *
 * A worker that fails (`onerror`: in a production build, a worker script
 * that doesn't load) or a reply that can't be read (`onmessageerror`) would
 * otherwise leave promises and states hanging (Review Focus 5). Either
 * rejects every pending promise with a `WorkerError` and reports an `error`
 * state for every item not yet final: one at `fetching`, or one a pending
 * `load` waits for. After `onerror` every later call rejects with that error;
 * after `onmessageerror` the worker is still running and later calls go on.
 */
export function createClient(
  worker: ClientWorker,
  signal: AbortSignal,
): Client {
  interface Pending {
    resolve(value: unknown): void;
    reject(error: unknown): void;
    onResult?: ((result: StressResult) => void) | undefined;
    /** For a `load`: its item. */
    item?: DataItem | undefined;
  }
  let nextId = 1;
  const pending = new Map<number, Pending>();
  const listeners = new Set<(reply: ProgressReply | StateReply) => void>();
  /** Each item's last state, as the worker reported it. */
  const states = new Map<DataItem, DataState>();
  let stopped = false;
  /** Set by `onerror`: the worker is gone, and every call rejects with it. */
  let broken: Error | undefined;
  const emit = (reply: ProgressReply | StateReply) => {
    for (const listener of listeners) {
      listener(reply);
    }
  };
  const abortError = () =>
    new DOMException("The frames explorer's worker was stopped", "AbortError");

  const settle = (id: number, value: unknown) => {
    const request = pending.get(id);
    pending.delete(id);
    request?.resolve(value);
  };

  worker.onmessage = (event) => {
    const reply = event.data;
    switch (reply.type) {
      case "progress":
        emit(reply);
        return;
      case "state":
        states.set(reply.item, reply.state);
        emit(reply);
        if (reply.id !== undefined) {
          settle(reply.id, reply);
        }
        return;
      case "result":
        pending.get(reply.id)?.onResult?.(reply.result);
        return;
      case "done":
        settle(reply.id, reply.summary);
        return;
      case "overlay":
        settle(reply.id, reply.geometry);
        return;
      case "trajectoryInfo":
        settle(reply.id, reply.info);
        return;
      case "error": {
        const request = pending.get(reply.id);
        pending.delete(reply.id);
        request?.reject(
          Object.assign(new Error(reply.message), { name: reply.name }),
        );
        return;
      }
    }
  };

  const FINAL: ReadonlySet<DataState> = new Set(["ready", "missing", "error"]);
  /** Rejects every pending promise with `error`, and reports `error` for every item not yet final. */
  const fail = (error: Error) => {
    const items = new Set<DataItem>();
    for (const [item, state] of states) {
      if (state === "fetching") {
        items.add(item);
      }
    }
    for (const request of pending.values()) {
      const state =
        request.item === undefined ? undefined : states.get(request.item);
      if (
        request.item !== undefined &&
        (state === undefined || !FINAL.has(state))
      ) {
        items.add(request.item);
      }
    }
    for (const item of items) {
      const reply: StateReply = {
        type: "state",
        item,
        state: "error",
        detail: error.message,
      };
      states.set(item, "error");
      emit(reply);
    }
    const requests = [...pending.values()];
    pending.clear();
    for (const request of requests) {
      request.reject(error);
    }
  };
  const workerError = (message: string) =>
    Object.assign(new Error(message), { name: "WorkerError" });

  worker.onerror = (event) => {
    broken = workerError(
      `the frames explorer's worker failed: ${event.message || "its script did not load, or it threw outside a request"}`,
    );
    fail(broken);
  };
  worker.onmessageerror = () => {
    fail(
      workerError(
        "a reply from the frames explorer's worker could not be read (deserialized)",
      ),
    );
  };

  const stop = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    try {
      worker.postMessage({ type: "cancel", id: nextId++ });
    } finally {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      const error = abortError();
      for (const request of pending.values()) {
        request.reject(error);
      }
      pending.clear();
      listeners.clear();
    }
  };
  if (signal.aborted) {
    stop();
  } else {
    signal.addEventListener("abort", stop, { once: true });
  }

  function request<T>(
    message: WithoutId<Request>,
    onResult?: (result: StressResult) => void,
  ): Promise<T> {
    if (stopped) {
      return Promise.reject(abortError());
    }
    if (broken !== undefined) {
      return Promise.reject(broken);
    }
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        onResult,
        item: message.type === "load" ? message.item : undefined,
      });
      worker.postMessage({ ...message, id } as Request);
    });
  }

  return {
    run: (ids, onResult) =>
      request({ type: "run", ...(ids !== undefined && { ids }) }, onResult),
    userCrs: (wkt2, label, onResult) =>
      request({ type: "userCrs", wkt2, label }, onResult),
    load: (item) => request({ type: "load", item }),
    overlay: (kind, params) =>
      request({ type: "overlay", kind, params } as WithoutId<OverlayRequest>),
    trajectoryInfo: (at) => request({ type: "trajectoryInfo", at }),
    cancel: () => {
      if (!stopped && broken === undefined) {
        worker.postMessage({ type: "cancel", id: nextId++ });
      }
    },
    onProgress: (callback) => {
      if (!stopped) {
        listeners.add(callback);
      }
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
