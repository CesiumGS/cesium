// Orion on the page (main thread): the legend line computed from the worker's
// statement (R8), the redraw cadence that keeps one request in flight and
// drops stale ones, and the view down on the orbit plane (tour stop 5).
// Pure, so each is unit-tested (test/framesExplorerOrion.test.ts).
import type { AccuracyTerm } from "../../src/measure/accuracy.ts";
import type { Sampling } from "./overlays.ts";
import { length, seconds } from "./panel/format.ts";
import type { ComposedView, OrionFrame } from "./panel/model.ts";
import type { TrajectoryInfo } from "./protocol.ts";
import type { TreeNode } from "./tree.ts";

/** A term's source as the legend's detail says it. */
const TERM_NAME: Record<string, string> = {
  coordinateScale: "the unstated time scale (TDB or TT; taken as TDB)",
  trajectory: "the OEM's covariance",
  ephemeris: "DE440",
  earthOrientation: "Earth orientation",
  projection: "the PROJ operation",
};

/** A term as the one-line qualifier (S-I7). */
const TERM_SHORT: Record<string, string> = {
  coordinateScale: "taken as TDB",
  trajectory: "the OEM's covariance",
  ephemeris: "DE440",
  earthOrientation: "Earth orientation",
  projection: "the PROJ operation",
};

/** A term's note without the statement's "End a:" bookkeeping. */
const plainNote = (t: AccuracyTerm): string =>
  t.note.replace(/^End [ab]: /, "").replace(/^Trajectory "[^"]*": /, "");

/** "2026-04-06T23:00:00.000Z" as "2026-04-06 23:00 UTC". */
const whenOf = (utc: string): string =>
  utc.replace("T", " ").replace(/:\d\d(\.\d+)?Z$/, " UTC");

/**
 * Orion's legend line (R8, S-I7) from the worker's statement against ITRF
 * at the clock's instant (`TrajectoryInfo.composed.ITRF`): `accuracy` is one
 * line, the total, its 1σ and one qualifier (its largest term); `detail`
 * says when, against what, why and the frame drawn in; `drawing` is how the
 * path was sampled. Not bounded names the term with no size; `error` (the
 * last request failed) says so rather than waiting. `caution` marks a total
 * resting on an assumption (the OEM doesn't state its time scale).
 */
export function orionLegend(
  view: ComposedView | undefined,
  options: {
    drawIn: OrionFrame;
    utc: string;
    sampling?: Sampling;
    error?: string;
  },
): {
  accuracy: string;
  detail: string;
  drawing?: string;
  caution: boolean;
  unbounded: boolean;
} {
  const drawn = `Drawn in ${options.drawIn}.`;
  const when = whenOf(options.utc);
  const drawing = samplingText(options.sampling);
  const extra = drawing !== undefined ? { drawing } : {};
  if (options.error !== undefined) {
    return {
      accuracy: "not bounded: Orion's statement didn't come",
      detail: `Orion's statement at ${when} failed: ${options.error}. It is asked for again when the clock moves. ${drawn}`,
      ...extra,
      caution: false,
      unbounded: true,
    };
  }
  if (view === undefined) {
    return {
      accuracy: "waiting for Orion's statement from the worker",
      detail: drawn,
      ...extra,
      caution: false,
      unbounded: false,
    };
  }
  const { statement } = view;
  if (statement.meters === undefined) {
    const open = statement.terms.find((t) => t.meters === undefined);
    const why = open
      ? plainNote(open)
      : (statement.warnings[0] ?? "a term has no size");
    return {
      accuracy: `not bounded: ${why}`,
      detail: `At ${when}, against the Earth's centre: not bounded, ${why}. ${drawn}`,
      ...extra,
      caution: false,
      unbounded: true,
    };
  }
  const largest = statement.terms.reduce<AccuracyTerm | undefined>(
    (a, t) =>
      t.meters !== undefined && (a === undefined || t.meters > a.meters!)
        ? t
        : a,
    undefined,
  );
  const lead =
    largest !== undefined && largest.meters! > 0 ? largest : undefined;
  const total = `±${length(statement.meters, 2)} (1σ)`;
  return {
    accuracy: lead
      ? `${total}, ${TERM_SHORT[lead.source] ?? lead.source}`
      : total,
    detail: `At ${when}, against the Earth's centre${lead ? `: mostly ${TERM_NAME[lead.source] ?? lead.source}` : ""}. ${drawn}`,
    ...extra,
    caution: statement.terms.some((t) => t.source === "coordinateScale"),
    unbounded: false,
  };
}

function samplingText(sampling: Sampling | undefined): string | undefined {
  if (sampling === undefined) {
    return undefined;
  }
  const capped =
    sampling.capped === "time"
      ? " (capped by its time budget: coarser in places)"
      : sampling.capped === "samples"
        ? " (capped by its sample budget: coarser in places)"
        : "";
  return `${sampling.samples.toLocaleString("en-US")} samples, finest ${seconds(sampling.finest)}${capped}`;
}

/**
 * Orion's node in the tree and the frame it hangs under: the worker's, or,
 * when the last request failed, a node that says so (its accuracy not
 * stated, with the error), under the reference it had (EME2000, the OEM's,
 * before any came). Undefined before anything came.
 */
export function orionNode(
  info: TrajectoryInfo | undefined,
  error: string | undefined,
  utc: string,
): { node: TreeNode; parent: string } | undefined {
  if (error === undefined) {
    return info && { node: info.node, parent: info.parent };
  }
  return {
    parent: info?.parent ?? "EME2000",
    node: {
      id: info?.node.id ?? "orion",
      label: info?.node.label ?? "Orion",
      edge: {
        kind: "trajectory",
        detail: info?.node.edge.detail ?? "trajectory (the Artemis II OEM)",
        accuracy: {
          note: `not stated: Orion's statement at ${whenOf(utc)} failed: ${error}`,
        },
      },
      children: [],
    },
  };
}

/**
 * A request cadence for work that may take longer than the clock waits: one
 * request in flight; a request made meanwhile replaces any other waiting (a
 * stale one is dropped, never queued) and runs when the one in flight ends.
 * `apply` gets each answer that wasn't dropped, `fail` each failure. `drop`
 * discards the answer in flight and the request waiting (the frame changed,
 * the overlay went off).
 */
export function latestOnly<A, R>(
  work: (arg: A) => Promise<R>,
  apply: (result: R, arg: A) => void,
  fail?: (error: unknown, arg: A) => void,
): { request(arg: A): void; drop(): void; readonly busy: boolean } {
  let busy = false;
  let waiting: { arg: A } | undefined;
  let generation = 0;
  const start = (arg: A) => {
    busy = true;
    const g = generation;
    let promise: Promise<R>;
    try {
      promise = work(arg);
    } catch (error) {
      promise = Promise.reject(error);
    }
    promise
      .then(
        (result) => {
          if (g === generation) {
            apply(result, arg);
          }
        },
        (error: unknown) => {
          if (g === generation) {
            fail?.(error, arg);
          }
        },
      )
      .finally(() => {
        busy = false;
        const next = waiting;
        waiting = undefined;
        if (next !== undefined) {
          start(next.arg);
        }
      });
  };
  return {
    request(arg) {
      if (busy) {
        waiting = { arg };
      } else {
        start(arg);
      }
    },
    drop() {
      generation++;
      waiting = undefined;
    },
    get busy() {
      return busy;
    },
  };
}

type Vec = ArrayLike<number>;
const dot = (a: Vec, b: Vec) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const unit = (a: Vec): number[] => {
  const l = Math.hypot(a[0]!, a[1]!, a[2]!);
  return [a[0]! / l, a[1]! / l, a[2]! / l];
};
const crossOf = (a: Vec, b: Vec): number[] => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];

/**
 * A view down `normal` (toward the camera) on `points`, with `across` (the
 * Earth→Moon direction) to the right: the center of the points' extent in
 * the plane, and the range that frames them all for a camera of `fov` (the
 * wider dimension's angle, 1.x semantics) and `aspect` (width / height), with
 * a 20% margin (room for the labels at the edges).
 */
export function planeFraming(
  points: readonly Vec[],
  normal: Vec,
  across: Vec,
  camera: { fov: number; aspect: number },
): {
  center: number[];
  range: number;
  from: { direction: number[]; up: number[] };
} {
  const n = unit(normal);
  const a = dot(across, n);
  const right = unit([0, 1, 2].map((i) => across[i]! - a * n[i]!));
  const up = crossOf(n, right);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    const x = dot(p, right);
    const y = dot(p, up);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const xm = (x0 + x1) / 2;
  const ym = (y0 + y1) / 2;
  const depth = points.length > 0 ? dot(points[0]!, n) : 0;
  const center = [0, 1, 2].map(
    (i) => right[i]! * xm + up[i]! * ym + n[i]! * depth,
  );
  const half = Math.tan(camera.fov / 2);
  const [tanX, tanY] =
    camera.aspect > 1
      ? [half, half / camera.aspect]
      : [half * camera.aspect, half];
  const range = 1.2 * Math.max((x1 - x0) / 2 / tanX, (y1 - y0) / 2 / tanY, 1);
  return { center, range, from: { direction: n, up } };
}

/** a × b, column-major 4×4 (float64): Orion's path's placement now (placeOrion). */
export function compose(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): Float64Array {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + r]! * b[c * 4 + k]!;
      }
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

/**
 * A point of the drawn path where `placement` puts it: Orion's path drawn
 * in a frame at one instant, placed now by that frame now times its
 * inverse then (`compose`). At the clock's time Orion's own place is on it
 * (test/data/framesExplorerScenarios.test.ts).
 */
export function pathPoint(
  placement: ArrayLike<number>,
  p: ArrayLike<number>,
): Float64Array {
  const m = placement;
  return Float64Array.of(
    m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]! + m[12]!,
    m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]! + m[13]!,
    m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]! + m[14]!,
  );
}
