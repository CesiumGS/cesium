// The measure tool's state (plan 4b Task 19): the two points, the two-click
// state machine, the snap mode's choice of service and the deep link that
// carries both design points. Pure: test/designGlobeMeasureTool.test.ts.
import type { SnapKind } from "../../src/engineering/EngineeringFrame.ts";
import {
  ClientSnapService,
  refiningSnap,
  type SnapRequest,
  type SnapResult,
  type SnapService,
} from "../../src/engineering/snap.ts";
import type { SnapMode } from "./page.ts";

// ------------------------------------------------------------ the points

/** How an end was obtained. */
export type MeasureHow = "exact" | "geometry" | "pick" | "link";

/** One end of a measurement on a model. */
export interface MeasureEnd {
  /** The site whose model it is on (`SITES`). */
  readonly site: string;
  /** The design point, in the site's CRS's units. */
  readonly design: Float64Array;
  /** Where the end is marked in each placement (body-fixed metres). */
  readonly rigid: Float64Array;
  readonly reprojected: Float64Array;
  readonly how: MeasureHow;
  /** What a snap landed on. */
  readonly kind?: SnapKind;
  /** Metres: 0 for an exact snap or a linked point. */
  readonly tolerance: number;
  /** Marked on the visible surface above the exact point (the barrier's top). */
  readonly shownAbove?: boolean;
}

/** The two-click tool's state. */
export type MeasureState =
  | { readonly phase: "empty" }
  | { readonly phase: "first"; readonly a: MeasureEnd }
  | { readonly phase: "done"; readonly a: MeasureEnd; readonly b: MeasureEnd };

export type MeasureInput =
  | { readonly type: "point"; readonly end: MeasureEnd }
  | { readonly type: "escape" };

/**
 * The state after `input`: a first point, then a second (on the same
 * model: one on another leaves the first as it was), then a point after a
 * finished measurement starts the next one there; Escape clears.
 */
export function nextMeasure(
  state: MeasureState,
  input: MeasureInput,
): MeasureState {
  if (input.type === "escape") {
    return state.phase === "empty" ? state : { phase: "empty" };
  }
  const end = input.end;
  if (state.phase === "first") {
    return end.site === state.a.site
      ? { phase: "done", a: state.a, b: end }
      : state;
  }
  return { phase: "first", a: end };
}

// ------------------------------------------------------------- the snap

/** What `snapWith` snaps with. */
export interface SnapDeps {
  readonly client: ClientSnapService;
  /** The exact (server) side, routed by tileset; absent for none. */
  readonly server?: SnapService;
  /** `refiningSnap`, injectable for tests. */
  readonly refine?: typeof refiningSnap;
  /** A plain design pick at CSS pixels, as a snap result (the cursor's seam). */
  pick(x: number, y: number): Promise<SnapResult | undefined>;
}

/**
 * Snaps as `mode` says: Alignment (exact) is the client's snap refined by
 * the exact service; Geometry is the client's snap alone; None is a plain
 * design pick. `onUpdate` gets each answer (a refined snap's client answer
 * first, provisional).
 */
export function snapWith(
  mode: SnapMode,
  request: SnapRequest,
  deps: SnapDeps,
  onUpdate: (result: SnapResult) => void,
  signal?: AbortSignal,
): Promise<SnapResult | undefined> {
  if (mode === "none") {
    return deps.pick(request.x, request.y).then((r) => {
      if (r !== undefined && !signal?.aborted) {
        onUpdate(r);
      }
      return r;
    });
  }
  const refine = deps.refine ?? refiningSnap;
  return refine(
    request,
    deps.client,
    mode === "exact" ? deps.server : undefined,
    onUpdate,
    signal,
  );
}

// -------------------------------------------------------- the deep link

/** The largest design coordinate a link may carry, in design units. */
const LINK_LIMIT = 1e8;
const LINK_NUMBER = /^-?\d+(\.\d+)?$/;

/** A number for the link, exactly (float64's shortest round trip). */
function linkNumber(x: number): string {
  const s = String(x);
  return /e/i.test(s) ? x.toFixed(9) : s;
}

/**
 * The link's `a` and `b` (the design points as "E,N,H", exactly) and `on`
 * (the site, left out for the corridor) for a finished measurement; all
 * undefined (removed) otherwise.
 */
export function formatMeasureLink(state: MeasureState): {
  readonly a: string | undefined;
  readonly b: string | undefined;
  readonly on: string | undefined;
} {
  if (state.phase !== "done") {
    return { a: undefined, b: undefined, on: undefined };
  }
  const text = (d: Float64Array) => [...d].map(linkNumber).join(",");
  return {
    a: text(state.a.design),
    b: text(state.b.design),
    on: state.a.site === "corridor" ? undefined : state.a.site,
  };
}

/**
 * The design points a link carries, or undefined: each of `a` and `b` is
 * three plain decimal numbers (no exponent, no hex), each within ±1e8
 * design units, and `on` one of `sites` (the corridor when absent). The
 * link is untrusted: anything else is no measurement.
 */
export function parseMeasureLink(
  params: Readonly<Record<string, string | undefined>>,
  sites: readonly string[],
):
  | {
      readonly site: string;
      readonly a: Float64Array;
      readonly b: Float64Array;
    }
  | undefined {
  const get = (key: string) =>
    Object.hasOwn(params, key) ? params[key] : undefined;
  const point = (text: string | undefined): Float64Array | undefined => {
    if (text === undefined || text.length > 120) {
      return undefined;
    }
    const parts = text.split(",");
    if (parts.length !== 3 || !parts.every((p) => LINK_NUMBER.test(p))) {
      return undefined;
    }
    const values = parts.map(Number);
    return values.every((v) => Number.isFinite(v) && Math.abs(v) <= LINK_LIMIT)
      ? Float64Array.from(values)
      : undefined;
  };
  const on = get("on");
  const site = on ?? "corridor";
  if (!sites.includes(site)) {
    return undefined;
  }
  const a = point(get("a"));
  const b = point(get("b"));
  return a !== undefined && b !== undefined ? { site, a, b } : undefined;
}
