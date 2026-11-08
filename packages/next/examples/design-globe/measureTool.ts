// The design globe's measure tool (plan 4b Task 19; DESIGN.md "The story"):
// two points on a model, snapped as the snap mode says, measured through the
// library's `measure` between their design points, and drawn on the globe
// in whichever placement is drawn, morphing with it. And the measurements
// the page opens with (owner, 2026-11-07):
//   1. the design against itself: a marker at station 170,000's true
//      position (through the design CRS by PROJ), to the drawn station;
//   2. the design against a real survey mark: NGS's HS5109, placed from its
//      published NAD83(2011) position, to the nearest drawn centreline point;
//   3. quieter, two stations 10,000 ft apart: the design distance is the
//      same in both placements, and only reprojected draws it true.
// Every figure comes from answers.json or from the placements: none is
// written here.
//
// What a measurement says, in both placements:
//   - the design distance (design units, what CAD reports) and the true
//     distance (metres, between where the design points truly are), side by
//     side: from the design, so the same whichever placement is drawn;
//   - "on the globe": the straight line between the two points as they are
//     drawn now, which is the true distance when the drawing is true
//     (reprojected) and isn't when it isn't (rigid).
//
// The parts:
//   - pure (Node-tested, test/designGlobeMeasureTool.test.ts): the two-click
//     state machine (`nextMeasure`), the snap mode's choice (`snapWith`),
//     the deep link (`formatMeasureLink`, `parseMeasureLink`), the
//     openers (`openingMeasurements`, `openerView`) and `drawnAt`;
//   - the runtime (`createMeasureTool`): pointer and keyboard input, the
//     snaps (one AbortController per pointer event, the previous aborted;
//     judged by the site hit, as cursor.ts judges picks), `measure`, the
//     globe's lines (measureOverlay.ts) and the HUD's labels.
import type { Alignment } from "../../src/engineering/alignment.ts";
import {
  designPoint,
  type DesignPoint,
  type EngineeringFrame,
  type SnapKind,
} from "../../src/engineering/EngineeringFrame.ts";
import type { TilesetPlacement } from "../../src/engineering/placement.ts";
import {
  ClientSnapService,
  refiningSnap,
  type SnapRequest,
  type SnapResult,
  type SnapService,
} from "../../src/engineering/snap.ts";
import { loadFrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames, type Frames } from "../../src/frames/frames.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import { measure, type Measurement } from "../../src/measure/measure.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { LeapSeconds } from "../../src/time/leapSeconds.ts";
import type { Viewer } from "../../widgets/index.ts";
import type { Answers } from "./answers.ts";
import type { CheckBasis, ShownValues } from "./checks.ts";
import { hitRefusal, type PagePick, type PickState } from "./cursor.ts";
import { sectionSurface } from "./corridor.ts";
import { ExactSnapService, visibleRise } from "./exactSnap.ts";
import {
  fixed,
  measurementModel,
  stationText,
  unitSymbol,
  type EndView,
  type MeasureView,
} from "./measureModel.ts";
import { MeasureOverlay, type OverlayLine } from "./measureOverlay.ts";
import type { MorphTarget } from "./morphDriver.ts";
import { errorText, type LoadEvent, type SnapMode } from "./page.ts";
import type { SiteRuntime } from "./siteLoader.ts";

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

// --------------------------------------------------------- the openers

/** An end as both placements draw it (body-fixed metres). */
export interface DrawnEnd {
  readonly rigid: Float64Array;
  readonly reprojected: Float64Array;
}

/** What the openers read of the corridor's two placements. */
export interface OpenerPlacements {
  readonly rigid: Pick<TilesetPlacement, "displayed">;
  readonly reprojected: Pick<TilesetPlacement, "displayed">;
}

export type OpenerId = "marker" | "mark" | "pair";

/** A measurement the page opens with. */
export interface Opener {
  readonly id: OpenerId;
  /** Drawn quieter (the third pair). */
  readonly quiet: boolean;
  /** The ends exactly: the figures are measured between them. */
  readonly a: DrawnEnd;
  readonly b: DrawnEnd;
  /**
   * Where the ends are marked, when that isn't exactly there: a design point
   * on the profile grade line is marked on the visible barrier top above it
   * (as the exact snap's `shownPoint`).
   */
  readonly shown: { readonly a: DrawnEnd; readonly b: DrawnEnd };
}

/**
 * Where a morph draws an end: the shader's blend (placementPair.ts), rigid's
 * error scaled by `exaggeration`, then mixed toward reprojected by `t`.
 */
export function drawnAt(
  end: DrawnEnd,
  t: number,
  exaggeration: number,
): Float64Array {
  const out = new Float64Array(3);
  for (let k = 0; k < 3; k++) {
    const p = end.reprojected[k]!;
    const r = p + (end.rigid[k]! - p) * exaggeration;
    out[k] = r + (p - r) * t;
  }
  return out;
}

const fixedEnd = (p: ArrayLike<number>): DrawnEnd => ({
  rigid: Float64Array.from(p),
  reprojected: Float64Array.from(p),
});
const designEnd = (
  placements: OpenerPlacements,
  design: ArrayLike<number>,
): DrawnEnd => ({
  rigid: placements.rigid.displayed(design),
  reprojected: placements.reprojected.displayed(design),
});

/**
 * The three openers, from answers.json and the corridor's placements: the
 * station 170,000 marker (at its true position) to the drawn station; NGS's
 * mark (at its published position) to the nearest drawn centreline point;
 * and `pairs[0]`, 10,000 ft on the first tangent.
 */
export function openingMeasurements(
  answers: Answers,
  placements: OpenerPlacements,
  lift: (offset: number) => number = () => 0,
): Opener[] {
  /** A design point at `offset`, and where it is marked (lifted to the visible top). */
  const onDesign = (design: ArrayLike<number>, offset: number) => {
    const up = lift(offset);
    return {
      exact: designEnd(placements, design),
      shown:
        up === 0
          ? designEnd(placements, design)
          : designEnd(placements, [design[0]!, design[1]!, design[2]! + up]),
    };
  };
  const marker = onDesign(answers.marker.design, answers.marker.offset);
  const nearest = onDesign(answers.mark.nearestDesign, 0);
  const out: Opener[] = [
    {
      id: "marker",
      quiet: false,
      a: fixedEnd(answers.marker.bodyFixed),
      b: marker.exact,
      shown: { a: fixedEnd(answers.marker.bodyFixed), b: marker.shown },
    },
    {
      id: "mark",
      quiet: false,
      a: fixedEnd(answers.mark.bodyFixed),
      b: nearest.exact,
      shown: { a: fixedEnd(answers.mark.bodyFixed), b: nearest.shown },
    },
  ];
  const pair = answers.pairs[0];
  if (pair !== undefined) {
    const from = answers.points[pair.from]!;
    const to = answers.points[pair.to]!;
    const a = onDesign(from.design, from.offset);
    const b = onDesign(to.design, to.offset);
    out.push({
      id: "pair",
      quiet: true,
      a: a.exact,
      b: b.exact,
      shown: { a: a.shown, b: b.shown },
    });
  }
  return out;
}

/** How the morph draws now. */
export interface DrawState {
  /** 0 rigid, 1 reprojected. */
  readonly t: number;
  readonly exaggeration: number;
  readonly morphing: boolean;
}

/** What tone the "on the globe" line takes. */
export type GlobeTone = "rigid" | "reprojected" | "moving" | "muted";

/** An opener's words now. */
export interface OpenerFigures {
  readonly title: string;
  /** Design distance, design units. */
  readonly design: string;
  /** True distance, metres. */
  readonly trueDistance: string;
  /** The line on the globe now, metres; absent while exaggerated. */
  readonly drawn?: string;
  /** One sentence on the line as drawn. */
  readonly globe: string;
  readonly tone: GlobeTone;
}

const dist = (p: ArrayLike<number>, q: ArrayLike<number>) =>
  Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
const metres3 = (x: number) => `${fixed(x, 3)} m`;

/** An opener's title, design and true distances, and the line as drawn now. */
export function openerView(
  o: Opener,
  answers: Answers,
  s: DrawState,
): OpenerFigures {
  const symbol = unitSymbol(answers.frame.unitName);
  const designText = (x: number) => `${fixed(x, 3)} ${symbol}`;
  const exaggerated = s.exaggeration !== 1 && s.t < 1;
  const length = dist(
    drawnAt(o.a, s.t, s.exaggeration),
    drawnAt(o.b, s.t, s.exaggeration),
  );
  const drawn = exaggerated ? undefined : metres3(length);
  const tone: GlobeTone = s.morphing
    ? "moving"
    : exaggerated
      ? "muted"
      : s.t >= 0.5
        ? "reprojected"
        : "rigid";
  const rigidDrawn = tone === "rigid";

  let title: string;
  let design: number;
  let trueDistance: number;
  let globe: string;
  switch (o.id) {
    case "marker": {
      const m = answers.marker;
      const at = answers.points[m.point];
      title = `Station ${stationText(m.station)} against its true position`;
      // The marker is the station's own design point, where it truly is.
      const ratio =
        answers.frame.metersPerHeightUnit / answers.frame.metersPerUnit;
      design =
        at === undefined
          ? 0
          : Math.hypot(
              m.design[0] - at.design[0],
              m.design[1] - at.design[1],
              (m.design[2] - at.design[2]) * ratio,
            );
      trueDistance = at === undefined ? 0 : dist(m.bodyFixed, at.bodyFixed);
      globe = rigidDrawn
        ? "Rigid draws the station this far from where it is."
        : "Drawn where it is.";
      break;
    }
    case "mark": {
      const m = answers.mark;
      title = `${m.pid} ${m.name} to the centreline`;
      design = m.designDistance;
      trueDistance = m.trueDistance;
      if (rigidDrawn) {
        const off = length - m.trueDistance;
        globe = `On the globe, rigid's centreline is ${metres3(length)} from the mark, ${metres3(Math.abs(off))} ${off >= 0 ? "too far" : "too near"}: it draws the road here ${errorText(dist(o.b.rigid, o.b.reprojected))} from where it is.`;
      } else {
        globe =
          Math.abs(length - m.trueDistance) < 5e-4
            ? "On the globe it measures the true distance: the drawn road lines up with NGS's mark."
            : `On the globe it measures ${metres3(length)}.`;
      }
      break;
    }
    case "pair": {
      const pair = answers.pairs[0]!;
      title = pair.label;
      design = pair.designDistance;
      trueDistance = pair.trueDistance;
      if (rigidDrawn) {
        const off = length - pair.trueDistance;
        globe = `Rigid draws it ${metres3(length)}, ${metres3(Math.abs(off))} ${off >= 0 ? "long" : "short"}; the design distance is the same in both placements.`;
      } else {
        globe =
          Math.abs(length - pair.trueDistance) < 5e-4
            ? "Drawn at its true length; the design distance is the same in both placements."
            : `Drawn ${metres3(length)} long.`;
      }
      break;
    }
  }
  if (exaggerated) {
    globe = `Errors drawn ×${s.exaggeration}: no measurement on the globe until true scale.`;
  } else if (s.morphing) {
    globe =
      o.id === "marker"
        ? "Moving between placements: the gap follows the geometry."
        : `Moving between placements: drawn ${metres3(length)} now.`;
  }
  return {
    title,
    design: designText(design),
    trueDistance: metres3(trueDistance),
    ...(drawn !== undefined && { drawn }),
    globe,
    tone,
  };
}

// ------------------------------------------------------ what is shown

/** A measurement's numbers as the page shows them (for `shownValues`). */
export interface ShownMeasurement {
  /** Design units. */
  readonly designDistance: number;
  readonly horizontalDistance: number;
  /** Metres, between where the design points truly are. */
  readonly trueDistance: number;
  /** Each end's station and offset, when on the alignment. */
  readonly a?: { readonly station: number; readonly offset: number };
  readonly b?: { readonly station: number; readonly offset: number };
}

/** An end's check basis and stated tolerance (metres) from how it was obtained. */
function basisOf(end: MeasureEnd): {
  basis: CheckBasis;
  tolerance?: number;
} {
  switch (end.how) {
    case "exact":
    case "link":
      return { basis: "exact" };
    case "geometry":
      return end.kind === "point"
        ? { basis: "vertex" }
        : { basis: "pick", tolerance: end.tolerance };
    case "pick":
      return { basis: "pick", tolerance: end.tolerance };
  }
}

const RANK: Record<CheckBasis, number> = { exact: 0, vertex: 1, pick: 2 };

/**
 * What the measure section shows, for the checks (checks.ts `checkRows`,
 * Task 20's panel): the 10,000 ft pair's distances and ends (exact: they
 * are the answers' own design points); station 170,000's marker, its
 * separation as drawn when settled at true scale; PROJ's zone 3 for NGS's
 * mark; and the user's ends and distances where they are answers' points
 * and pairs (within 1e-6 design units), with the basis their snap gives.
 */
export function shownValues(
  answers: Answers,
  shown: {
    readonly pair?: ShownMeasurement;
    /** The marker's drawn separation (metres), settled at true scale. */
    readonly marker?: {
      readonly separation: number;
      readonly mode: "rigid" | "reprojected";
    };
    /** PROJ's zone 3 E and N for the mark, design units. */
    readonly mark?: ArrayLike<number>;
    readonly user?: {
      readonly a: MeasureEnd;
      readonly b: MeasureEnd;
      readonly measurement?: ShownMeasurement;
    };
  },
): ShownValues {
  const points: ShownValues["points"] = new Map();
  const pairs: ShownValues["pairs"] = new Map();
  const first = answers.pairs[0];
  if (first !== undefined && shown.pair !== undefined) {
    for (const [index, at] of [
      [first.from, shown.pair.a],
      [first.to, shown.pair.b],
    ] as const) {
      points.set(index, {
        design: Float64Array.from(answers.points[index]!.design),
        ...(at !== undefined && { station: at.station, offset: at.offset }),
        basis: "exact",
      });
    }
    pairs.set(first.id, {
      designDistance: shown.pair.designDistance,
      horizontalDistance: shown.pair.horizontalDistance,
      trueDistance: shown.pair.trueDistance,
      basis: "exact",
    });
  }
  points.set(answers.marker.point, {
    design: Float64Array.from(answers.marker.design),
    basis: "exact",
  });
  const user = shown.user;
  if (user !== undefined && user.a.site === "corridor") {
    const indexOf = (end: MeasureEnd) =>
      answers.points.findIndex((p) =>
        p.design.every((x, k) => Math.abs(x - end.design[k]!) <= 1e-6),
      );
    const ends = [
      [user.a, user.measurement?.a],
      [user.b, user.measurement?.b],
    ] as const;
    const found = ends.map(([end]) => indexOf(end));
    ends.forEach(([end, at], i) => {
      const index = found[i]!;
      if (index >= 0 && !points.has(index)) {
        points.set(index, {
          design: Float64Array.from(end.design),
          ...(at !== undefined && { station: at.station, offset: at.offset }),
          ...basisOf(end),
        });
      }
    });
    const pair = answers.pairs.find(
      (p) =>
        (p.from === found[0] && p.to === found[1]) ||
        (p.from === found[1] && p.to === found[0]),
    );
    if (
      pair !== undefined &&
      user.measurement !== undefined &&
      !pairs.has(pair.id)
    ) {
      const [ba, bb] = [basisOf(user.a), basisOf(user.b)];
      const worst = RANK[ba.basis] >= RANK[bb.basis] ? ba : bb;
      const tolerance =
        worst.basis === "pick"
          ? (ba.tolerance ?? 0) + (bb.tolerance ?? 0)
          : undefined;
      pairs.set(pair.id, {
        designDistance: user.measurement.designDistance,
        horizontalDistance: user.measurement.horizontalDistance,
        trueDistance: user.measurement.trueDistance,
        basis: worst.basis,
        ...(tolerance !== undefined && { tolerance }),
      });
    }
  }
  return {
    points,
    pairs,
    ...(shown.marker !== undefined && {
      marker: {
        separation: shown.marker.separation,
        mode: shown.marker.mode,
        basis: "exact",
      },
    }),
    ...(shown.mark !== undefined && {
      mark: { easting: shown.mark[0]!, northing: shown.mark[1]! },
    }),
  };
}

const shownOf = (m: Measurement): ShownMeasurement | undefined =>
  m.design === undefined
    ? undefined
    : {
        designDistance: m.design.distance,
        horizontalDistance: m.design.horizontalDistance,
        trueDistance: m.distance,
        ...(m.alignment !== undefined && {
          a: { station: m.alignment.a.station, offset: m.alignment.a.offset },
          b: { station: m.alignment.b.station, offset: m.alignment.b.offset },
        }),
      };

// --------------------------------------------------------- panel views

/** A row behind "Details". */
export interface DetailRow {
  readonly label: string;
  readonly value: string;
}

/** The survey mark's datasheet, for the disk's card. */
export interface DatasheetView {
  readonly pid: string;
  readonly name: string;
  /** The datasheet's own lines, verbatim. */
  readonly lines: readonly string[];
  readonly retrieved: string;
  /** Only an https link on NGS's own host. */
  readonly url?: string;
}

export interface OpenerPanel extends OpenerFigures {
  readonly id: OpenerId;
  readonly quiet: boolean;
  readonly details: readonly DetailRow[];
}

/** One end in the user's measurement's details. */
export interface EndPanel {
  readonly label: "A" | "B";
  readonly rows: readonly DetailRow[];
}

export interface UserMeasurePanel {
  readonly phase: MeasureState["phase"];
  /** What to do next, or why a point wasn't placed. */
  readonly instruction: string;
  /** The last click was refused (moving, exaggerated, nothing there). */
  readonly refused: boolean;
  /** A snap or the measurement runs. */
  readonly busy: boolean;
  readonly result?: {
    readonly design: string;
    readonly trueDistance: string;
    readonly globe: string;
    readonly tone: GlobeTone;
    readonly details: readonly DetailRow[];
    readonly ends: readonly [EndPanel, EndPanel];
  };
}

export interface MeasurePanel {
  readonly snap: SnapMode;
  /** The openers, once the answers and the corridor's placements are in. */
  readonly openers: readonly OpenerPanel[];
  readonly datasheet?: DatasheetView;
  readonly user: UserMeasurePanel;
  /** Why measure isn't ready (the frame data, the answers). */
  readonly waiting?: string;
}

/** Labels over the canvas, placed each frame the camera or the morph moves. */
export interface MeasureLive {
  readonly pills: readonly {
    readonly key: string;
    readonly x: number;
    readonly y: number;
    readonly text: string;
    readonly tone: "measure" | "quiet" | "ruler";
  }[];
  readonly dots: readonly {
    readonly key: string;
    readonly x: number;
    readonly y: number;
    readonly tone: "measure" | "truth";
  }[];
  /** Station 170,000's true position, labelled. */
  readonly marker?: {
    readonly x: number;
    readonly y: number;
    readonly text: string;
  };
  /** The survey mark's disk. */
  readonly disk?: {
    readonly x: number;
    readonly y: number;
    /** The datasheet card opens left of the disk, and above it, to stay in the view. */
    readonly left: boolean;
    readonly up: boolean;
  };
  /** The snap under the pointer. */
  readonly hover?: {
    readonly x: number;
    readonly y: number;
    readonly kind: SnapKind;
    readonly exact: boolean;
  };
  /** The view's centre is marked (keyboard measuring). */
  readonly crosshair: boolean;
  /** The openers' line as drawn now. */
  readonly figures: Readonly<Partial<Record<OpenerId, OpenerFigures>>>;
}

// --------------------------------------------------------- the runtime

/** How far from the cursor a snap may land, CSS pixels. */
export const APERTURE = 12;
/** Labels farther than this from the camera are left out, metres. */
const LABEL_RANGE = 30_000;
/** The ruler's note shows within this of its far end, metres. */
const RULER_RANGE = 400;
/** A click: the pointer moved less than this between down and up, CSS pixels. */
const CLICK_SLOP = 5;

export interface MeasureToolDeps {
  readonly viewer: Viewer;
  readonly signal: AbortSignal;
  sites(): Iterable<SiteRuntime>;
  site(id: string): SiteRuntime | undefined;
  /** The corridor's alignment (the exact snap's). */
  readonly alignment: Alignment;
  answers(): Answers | undefined;
  /** As the cursor judges a pick (cursor.ts). */
  pickState(): PickState;
  pickAt(x: number, y: number): Promise<PagePick>;
  snapMode(): SnapMode;
  /** The morph now (the openers' figures, the overlay). */
  drawState(): DrawState & { readonly ghost: boolean };
  /** The link's measure parameters changed. */
  setLink(params: ReturnType<typeof formatMeasureLink>): void;
  /** The panel's view changed. */
  changed(): void;
  /** Something on the globe changed: draw a frame and run the frame loop. */
  wake(): void;
  /** Loading items (the frame data `measure` needs). */
  report(event: LoadEvent): void;
  disposed(): boolean;
}

export interface MeasureTool {
  view(): MeasurePanel;
  readonly live: {
    get(): MeasureLive;
    subscribe(listener: () => void): () => void;
  };
  /** Draws the openers and the user's line in both placements. */
  readonly target: MorphTarget;
  /** Places the labels (each frame the camera or the morph moves). */
  place(): void;
  /** The corridor's placements are in (or changed): the openers and exact snapping. */
  placementsChanged(): void;
  /** The answers are in. */
  answersChanged(): void;
  /** A point at the view's centre (keyboard). */
  pointAtCentre(): void;
  clear(): void;
  /** A link's measurement (deep link, back or forward). */
  applyLink(params: Readonly<Record<string, string | undefined>>): void;
  /** Loads the frame data again after a failure. */
  retry(): void;
  /** What the measure section shows, for the checks (Task 20). */
  shownValues(): ShownValues | undefined;
  /** Where to look at an opener: its middle as drawn, and its length. */
  openerFocus(
    id: OpenerId,
  ): { center: Float64Array; length: number } | undefined;
  dispose(): void;
}

/** A store whose listeners are told once per animation frame. */
function liveStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  let queued = 0;
  return {
    get: () => value,
    set(next: T) {
      value = next;
      if (queued === 0) {
        queued = requestAnimationFrame(() => {
          queued = 0;
          for (const l of [...listeners]) {
            l();
          }
        });
      }
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispose: () => cancelAnimationFrame(queued),
  };
}

/** NGS's datasheet link, only when it is https on NGS's own host. */
export function datasheetUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === "https:" &&
      (u.hostname === "ngs.noaa.gov" || u.hostname === "www.ngs.noaa.gov")
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** A snap result for a measured end, for `measurementModel`. */
function asSnap(end: MeasureEnd, point: DesignPoint): SnapResult {
  return {
    snapPoint: end.reprojected,
    hitPoint: end.reprojected,
    distance: 0,
    kind: end.kind ?? "point",
    design: point,
    tolerance: end.tolerance,
    exact: end.how === "exact" || end.how === "link",
    source: end.how === "exact" ? "server" : "client",
    provisional: false,
  };
}

const HOW_TEXT: Record<MeasureHow, string> = {
  exact: "exact snap to the design",
  geometry: "snap to the drawn mesh",
  pick: "plain pick, no snap",
  link: "from the link, as given",
};

const KIND_TEXT: Record<SnapKind, string> = {
  point: "a point",
  segment: "a straight line",
  arc: "a curve",
  surface: "the surface",
};

export function createMeasureTool(deps: MeasureToolDeps): MeasureTool {
  const { viewer, signal } = deps;
  let state: MeasureState = { phase: "empty" };
  let instruction: string | undefined;
  let refused = false;
  let busy = false;
  /** The user's measurement through `measure`, once both ends are in. */
  let measured:
    | {
        readonly state: MeasureState;
        readonly view: MeasureView;
        readonly m: Measurement;
      }
    | undefined;
  let openers: Opener[] = [];
  let openerViews = new Map<OpenerId, MeasureView>();
  let openerMeasures = new Map<OpenerId, Measurement>();
  let markDesign: Float64Array | undefined;
  let hover: MeasureLive["hover"];
  let crosshair = false;

  const live = liveStore<MeasureLive>({
    pills: [],
    dots: [],
    crosshair: false,
    figures: {},
  });
  const overlay = new MeasureOverlay(viewer.world);

  // ------------------------------------------------------ frame data
  let frames: { frames: Frames; leap: LeapSeconds } | undefined;
  let framesLoad: Promise<void> | undefined;
  let framesFailed: string | undefined;
  function loadFrames(): Promise<void> {
    framesLoad ??= (async () => {
      const id = "frames";
      deps.report({
        type: "start",
        id,
        label: "Earth orientation and leap seconds, for measure",
      });
      try {
        const given = await viewer.frameData;
        const data =
          given ??
          (await loadFrameData("/frames-data/", (file, received, total) =>
            deps.report({
              type: "progress",
              id,
              file,
              received,
              ...(total !== undefined && { total }),
            }),
          ));
        if (deps.disposed()) {
          return;
        }
        frames = { frames: createFrames(data), leap: data.leapSeconds };
        framesFailed = undefined;
        deps.report({ type: "ready", id });
        remeasure();
      } catch (error) {
        if (deps.disposed()) {
          return;
        }
        framesLoad = undefined;
        framesFailed = error instanceof Error ? error.message : String(error);
        deps.report({
          type: /404|manifest|not found/i.test(framesFailed)
            ? "missing"
            : "error",
          id,
          detail: framesFailed,
          ...(/404|manifest|not found/i.test(framesFailed) && {
            command: "npm run setup",
          }),
        });
        deps.changed();
      }
    })();
    return framesLoad;
  }

  /** `measure` between two design points of `frame`, at the clock's time. */
  function measureDesign(
    frame: EngineeringFrame,
    a: DesignPoint,
    b: DesignPoint,
  ): Measurement | undefined {
    if (frames === undefined) {
      return undefined;
    }
    const alignment = frame.alignments[0]?.name;
    try {
      return measure(
        a,
        b,
        Instant.fromUtc(viewer.clock.time, frames.leap),
        frames.frames,
        { signal: false, ...(alignment !== undefined && { alignment }) },
      );
    } catch (error) {
      console.warn(
        `design globe: measure failed (${error instanceof Error ? error.message : String(error)})`,
      );
      return undefined;
    }
  }

  // --------------------------------------------------- the placements
  const corridor = () => deps.site("corridor");
  let client:
    { tilesets: readonly Tileset3D[]; service: ClientSnapService } | undefined;
  const exact = new Map<Tileset3D, ExactSnapService>();

  function pickable(): Tileset3D[] {
    return [...deps.sites()].flatMap((s) =>
      [s.rigid, s.reprojected].filter((t): t is Tileset3D => t !== undefined),
    );
  }
  function clientService(): ClientSnapService {
    const tilesets = pickable();
    if (
      client === undefined ||
      client.tilesets.length !== tilesets.length ||
      client.tilesets.some((t, i) => t !== tilesets[i])
    ) {
      client = { tilesets, service: new ClientSnapService(tilesets) };
    }
    return client.service;
  }
  /** One `ExactSnapService` per corridor tileset, routed by the request's. */
  const server: SnapService = {
    snap: (request, abort) =>
      exact.get(request.tileset)?.snap(request, abort) ??
      Promise.resolve(undefined),
  };

  function siteOf(tileset: Tileset3D | undefined): SiteRuntime | undefined {
    if (tileset === undefined) {
      return undefined;
    }
    return [...deps.sites()].find(
      (s) => s.rigid === tileset || s.reprojected === tileset,
    );
  }

  /** Where each placement of `site` draws `design` (a one-tileset site: rigid in both). */
  function drawnEnd(
    site: SiteRuntime,
    design: ArrayLike<number>,
  ): DrawnEnd | undefined {
    const rigid = site.rigidPlacement ?? site.reprojectedPlacement;
    if (rigid === undefined) {
      return undefined;
    }
    const r = rigid.displayed(design);
    const p =
      site.pair !== undefined && site.reprojectedPlacement !== undefined
        ? site.reprojectedPlacement.displayed(design)
        : r;
    return { rigid: r, reprojected: p };
  }
  const frameOf = (site: SiteRuntime): EngineeringFrame | undefined =>
    (site.reprojectedPlacement ?? site.rigidPlacement)?.frame;

  // ---------------------------------------------------------- openers
  function buildOpeners(): void {
    const a = deps.answers();
    const site = corridor();
    const rigid = site?.rigidPlacement;
    const reprojected = site?.reprojectedPlacement;
    if (a === undefined || rigid === undefined || reprojected === undefined) {
      return;
    }
    // Marked on the visible top: the barrier's over the profile grade line.
    openers = openingMeasurements(
      a,
      { rigid, reprojected },
      (offset) => visibleRise(offset) - sectionSurface(offset),
    );
    // PROJ's zone 3 for the mark, from NGS's published position.
    markDesign = reprojected.designOf(Float64Array.from(a.mark.bodyFixed));
    openerViews = new Map();
    remeasure();
    redraw();
  }

  /** The openers' and the user's `measure` (again once the frame data is in). */
  function remeasure(): void {
    const a = deps.answers();
    const frame = corridor()?.reprojectedPlacement?.frame;
    if (a !== undefined && frame !== undefined && frames !== undefined) {
      const views = new Map<OpenerId, MeasureView>();
      const measures = new Map<OpenerId, Measurement>();
      const exactEnd = (design: ArrayLike<number>): MeasureEnd => ({
        site: "corridor",
        design: Float64Array.from(design),
        rigid: Float64Array.from(design),
        reprojected: Float64Array.from(design),
        how: "exact",
        kind: "point",
        tolerance: 0,
      });
      const pairs: [OpenerId, ArrayLike<number>, ArrayLike<number>][] = [
        ["mark", a.mark.design, a.mark.nearestDesign],
      ];
      const first = a.pairs[0];
      if (first !== undefined) {
        pairs.push([
          "pair",
          a.points[first.from]!.design,
          a.points[first.to]!.design,
        ]);
      }
      for (const [id, da, db] of pairs) {
        const pa = designPoint(frame, da);
        const pb = designPoint(frame, db);
        const m = measureDesign(frame, pa, pb);
        if (m !== undefined) {
          measures.set(id, m);
          views.set(
            id,
            measurementModel(
              asSnap(exactEnd(da), pa),
              asSnap(exactEnd(db), pb),
              m,
            ),
          );
        }
      }
      openerViews = views;
      openerMeasures = measures;
    }
    measureUser();
    deps.changed();
  }

  function measureUser(): void {
    if (state.phase !== "done") {
      measured = undefined;
      return;
    }
    if (measured?.state === state) {
      return;
    }
    const site = deps.site(state.a.site);
    const frame = site && frameOf(site);
    if (frame === undefined) {
      measured = undefined;
      return;
    }
    const point = (end: MeasureEnd) =>
      designPoint(
        frame,
        end.design,
        end.how === "link"
          ? undefined
          : end.how === "pick"
            ? { how: "pick", tolerance: end.tolerance }
            : {
                how: "snap",
                tolerance: end.tolerance,
                ...(end.kind !== undefined && { kind: end.kind }),
              },
      );
    const pa = point(state.a);
    const pb = point(state.b);
    const m = measureDesign(frame, pa, pb);
    measured =
      m === undefined
        ? undefined
        : {
            state,
            m,
            view: measurementModel(asSnap(state.a, pa), asSnap(state.b, pb), m),
          };
  }

  // -------------------------------------------------------- the globe
  const YELLOW = "#fde047";
  function redraw(): void {
    const lines: OverlayLine[] = [];
    const a = deps.answers();
    for (const o of openers) {
      lines.push({
        key: o.id,
        segments: [o.shown],
        color: o.quiet ? "#fef08a" : YELLOW,
        ghost: true,
      });
      if (o.id === "pair" && a !== undefined) {
        lines.push(rulerLine(o, a));
      }
      if (o.id === "marker" || o.id === "mark") {
        // A small cross on the ground at the fixed end: the marker or the disk.
        lines.push({
          key: `${o.id}-cross`,
          segments: groundCross(o.a.reprojected, o.id === "mark" ? 4 : 3),
          color: o.id === "mark" ? "#d6a84a" : "#a8eef4",
          ghost: false,
        });
      }
    }
    if (state.phase === "done") {
      lines.push({
        key: "user",
        segments: [{ a: state.a, b: state.b }],
        color: YELLOW,
        ghost: true,
      });
    }
    overlay.set(lines);
    overlay.setState(deps.drawState());
    deps.wake();
    place();
  }

  /** Ticks in design feet (yellow, left) against true ground feet (white, right). */
  function rulerLine(o: Opener, a: Answers): OverlayLine {
    const pair = a.pairs[0]!;
    const step = 1000;
    const segments: { a: DrawnEnd; b: DrawnEnd }[] = [];
    const colors: string[] = [];
    const across = (f: number, side: number, length: number) => {
      const at = (p: "rigid" | "reprojected") => {
        const x = o.shown.a[p];
        const y = o.shown.b[p];
        return Float64Array.from(
          [0, 1, 2].map((k) => x[k]! + (y[k]! - x[k]!) * f),
        );
      };
      const base = { rigid: at("rigid"), reprojected: at("reprojected") };
      const { east, north, up } = enu(base.reprojected);
      const d = [0, 1, 2].map(
        (k) => o.shown.b.reprojected[k]! - o.shown.a.reprojected[k]!,
      );
      const de = d[0]! * east[0]! + d[1]! * east[1]! + d[2]! * east[2]!;
      const dn = d[0]! * north[0]! + d[1]! * north[1]! + d[2]! * north[2]!;
      const l = Math.hypot(de, dn) || 1;
      // Square to the line, level, `side` of it; lifted a little off the deck.
      const off = [0, 1, 2].map(
        (k) =>
          ((-dn / l) * east[k]! + (de / l) * north[k]!) * side * length +
          up[k]! * 0.05,
      );
      const lift = [0, 1, 2].map((k) => up[k]! * 0.05);
      const shift = (p: Float64Array, v: number[]) =>
        Float64Array.from([0, 1, 2].map((k) => p[k]! + v[k]!));
      segments.push({
        a: {
          rigid: shift(base.rigid, lift),
          reprojected: shift(base.reprojected, lift),
        },
        b: {
          rigid: shift(base.rigid, off),
          reprojected: shift(base.reprojected, off),
        },
      });
    };
    const designFeet = pair.designDistance;
    const groundFeet = pair.trueDistance / a.frame.metersPerUnit;
    for (let i = 0; i * step <= designFeet + 1e-9; i++) {
      across((i * step) / designFeet, 1, i % 5 === 0 ? 2.5 : 1.5);
      colors.push(YELLOW);
    }
    for (let i = 0; i * step <= groundFeet + 1e-9; i++) {
      across((i * step) / groundFeet, -1, i % 5 === 0 ? 2.5 : 1.5);
      colors.push("#ffffff");
    }
    return { key: "ruler", segments, colors, color: YELLOW, ghost: false };
  }

  // ------------------------------------------------------ the labels
  function seen(p: ArrayLike<number>): Float64Array | undefined {
    const cam = viewer.view.camera;
    const to = [0, 1, 2].map((k) => cam.position[k]! - p[k]!);
    const up = new Float64Array(3);
    Ellipsoid.WGS84.geodeticSurfaceNormal(Float64Array.from(p), up);
    if (
      Math.hypot(to[0]!, to[1]!, to[2]!) > LABEL_RANGE ||
      // Below the camera's horizon from there.
      to[0]! * up[0]! + to[1]! * up[1]! + to[2]! * up[2]! < 0
    ) {
      return undefined;
    }
    return viewer.view.toPixel(p);
  }

  /** The labels and the openers' live figures, for this frame. */
  function place(): void {
    if (deps.disposed()) {
      return;
    }
    const s = deps.drawState();
    const a = deps.answers();
    const pills: MeasureLive["pills"][number][] = [];
    const dots: MeasureLive["dots"][number][] = [];
    const figures: Partial<Record<OpenerId, OpenerFigures>> = {};
    let marker: MeasureLive["marker"];
    let disk: MeasureLive["disk"];
    const middle = (p: Float64Array, q: Float64Array) =>
      Float64Array.from([0, 1, 2].map((k) => (p[k]! + q[k]!) / 2));
    /**
     * A line's pill and end dots; none when the line is under 24 px on the
     * screen (far off, it would only clutter). Whether it is labelled.
     */
    const label = (
      key: string,
      pa: Float64Array,
      pb: Float64Array,
      text: string,
      tone: "measure" | "quiet",
      first = false,
    ): boolean => {
      const ea = seen(pa);
      const eb = seen(pb);
      if (
        ea !== undefined &&
        eb !== undefined &&
        Math.hypot(ea[0]! - eb[0]!, ea[1]! - eb[1]!) < 24
      ) {
        return false;
      }
      const mid = seen(middle(pa, pb));
      if (mid !== undefined) {
        const pill = { key, x: mid[0]!, y: mid[1]!, text, tone };
        // The user's own first: it wins a clash with an opener's.
        if (first) {
          pills.unshift(pill);
        } else {
          pills.push(pill);
        }
      }
      [ea, eb].forEach((e, i) => {
        if (e !== undefined) {
          dots.push({
            key: `${key}-${i}`,
            x: e[0]!,
            y: e[1]!,
            tone: "measure",
          });
        }
      });
      return true;
    };
    const cameraTo = (p: ArrayLike<number>) => {
      const c = viewer.view.camera.position;
      return Math.hypot(c[0]! - p[0]!, c[1]! - p[1]!, c[2]! - p[2]!);
    };
    for (const o of openers) {
      if (a === undefined) {
        break;
      }
      const f = openerView(o, a, s);
      figures[o.id] = f;
      const pa = drawnAt(o.shown.a, s.t, s.exaggeration);
      const pb = drawnAt(o.shown.b, s.t, s.exaggeration);
      const text =
        o.id === "marker"
          ? f.drawn !== undefined
            ? `${f.drawn} drawn apart`
            : "Not to scale"
          : `${f.design} design`;
      label(o.id, pa, pb, text, o.quiet ? "quiet" : "measure");
      // The fixed ends: the marker's pin and the survey disk.
      const fixedAt = seen(pa);
      if (o.id === "marker" && fixedAt !== undefined) {
        marker = {
          x: fixedAt[0]!,
          y: fixedAt[1]!,
          text: `Sta. ${stationText(a.marker.station)}, where it truly is`,
        };
      } else if (o.id === "mark" && fixedAt !== undefined) {
        const view = canvas.getBoundingClientRect();
        disk = {
          x: fixedAt[0]!,
          y: fixedAt[1]!,
          left: fixedAt[0]! > view.width / 2,
          up: fixedAt[1]! > view.height / 2,
        };
      }
      // The ruler's gap shows only within a few hundred feet of its far
      // end, where its ticks can be told apart.
      if (o.id === "pair" && cameraTo(pb) < RULER_RANGE) {
        const gap = rulerGap(a);
        const ruler = seen(pb);
        if (ruler !== undefined && gap !== undefined) {
          pills.push({
            key: "ruler",
            x: ruler[0]!,
            y: ruler[1]! + 26,
            text: gap,
            tone: "ruler",
          });
        }
      }
    }
    if (state.phase === "first") {
      const p = seen(drawnAt(state.a, s.t, s.exaggeration));
      if (p !== undefined) {
        dots.push({ key: "user-0", x: p[0]!, y: p[1]!, tone: "measure" });
      }
    } else if (state.phase === "done") {
      label(
        "user",
        drawnAt(state.a, s.t, s.exaggeration),
        drawnAt(state.b, s.t, s.exaggeration),
        measured !== undefined
          ? `${measured.view.designDistance} design`
          : "Measuring…",
        "measure",
        true,
      );
    }
    const before = live.get();
    const r = canvas.getBoundingClientRect();
    const next: MeasureLive = {
      pills: declutter(pills.map((p) => keepInside(p, r.width))),
      dots,
      ...(marker !== undefined && { marker }),
      ...(disk !== undefined && { disk }),
      ...(hover !== undefined && { hover }),
      crosshair,
      figures,
    };
    if (JSON.stringify(next) !== JSON.stringify(before)) {
      live.set(next);
    }
  }

  /** The ruler's gap at the end of its 10,000 ft, in design units. */
  function rulerGap(a: Answers): string | undefined {
    const pair = a.pairs[0];
    if (pair === undefined) {
      return undefined;
    }
    const symbol = unitSymbol(a.frame.unitName);
    const groundFeet = pair.trueDistance / a.frame.metersPerUnit;
    const gap = groundFeet - pair.designDistance;
    return `Ground runs ${fixed(Math.abs(gap), 3)} ${symbol} ${gap >= 0 ? "longer" : "shorter"} than design`;
  }

  // -------------------------------------------------------- the input
  let hoverAbort: AbortController | undefined;
  let hoverBusy = false;
  let hoverNext: [number, number] | undefined;
  let clickAbort: AbortController | undefined;

  const snapDeps = (): SnapDeps => ({
    client: clientService(),
    server,
    pick: async (x, y) => {
      const { hit } = await deps.pickAt(x, y);
      if (hit === undefined) {
        return undefined;
      }
      return {
        snapPoint: hit.position,
        hitPoint: hit.position,
        distance: 0,
        kind: "surface",
        ...(hit.design !== undefined && { design: hit.design }),
        tolerance: hit.tolerance,
        exact: false,
        ...(hit.tileset !== undefined && { tileset: hit.tileset }),
        source: "client",
        provisional: false,
      };
    },
  });

  /** A snap as a measured end, or why it isn't one. */
  function toEnd(result: SnapResult | undefined): MeasureEnd | string {
    if (result === undefined) {
      return "Nothing to measure there: point at a model.";
    }
    const site = siteOf(result.tileset);
    if (site === undefined) {
      return "No design model there: the ghost and the ground aren't measurable.";
    }
    const judged = hitRefusal(site, result.tileset, deps.pickState());
    if (judged.refused !== undefined) {
      return judged.refused;
    }
    const placement = result.tileset?.placement;
    if (result.design === undefined || placement === undefined) {
      return "This site's frame is still loading: no design coordinates yet.";
    }
    const design = Float64Array.from(result.design.design);
    const shownDesign =
      result.shownPoint !== undefined
        ? placement.designOf(result.shownPoint)
        : undefined;
    const drawn = drawnEnd(site, shownDesign ?? design);
    if (drawn === undefined) {
      return "This site's frame is still loading: no design coordinates yet.";
    }
    const mode = deps.snapMode();
    return {
      site: site.entry.id,
      design,
      ...drawn,
      how:
        result.source === "server" && result.exact
          ? "exact"
          : mode === "none"
            ? "pick"
            : "geometry",
      kind: result.kind,
      tolerance: result.tolerance,
      ...(shownDesign !== undefined && { shownAbove: true }),
    };
  }

  function apply(input: MeasureInput): void {
    const next = nextMeasure(state, input);
    if (input.type === "point" && next === state) {
      instruction = "Both points go on one model: this one is another site's.";
      refused = true;
      deps.changed();
      return;
    }
    state = next;
    instruction = undefined;
    refused = false;
    measureUser();
    deps.setLink(formatMeasureLink(state));
    redraw();
    deps.changed();
  }

  /** A point where the user clicked (or the view's centre). */
  function pointAt(x: number, y: number): void {
    clickAbort?.abort();
    const ctl = new AbortController();
    clickAbort = ctl;
    const camera = viewer.view.camera.version;
    const before = deps.pickState();
    busy = true;
    deps.changed();
    void snapWith(
      deps.snapMode(),
      { view: viewer.view, x, y, aperture: APERTURE },
      snapDeps(),
      () => {},
      ctl.signal,
    )
      .then((result) => {
        if (ctl.signal.aborted || deps.disposed()) {
          return;
        }
        const now = deps.pickState();
        // Stale: the camera or the morph moved while it ran.
        if (
          camera !== viewer.view.camera.version ||
          now.t !== before.t ||
          now.exaggeration !== before.exaggeration
        ) {
          instruction = "The view moved while snapping: click again.";
          refused = true;
          return;
        }
        const end = toEnd(result);
        if (typeof end === "string") {
          instruction = end;
          refused = true;
          return;
        }
        apply({ type: "point", end });
      })
      .catch(() => {
        instruction = "That snap failed: click again.";
        refused = true;
      })
      .finally(() => {
        if (clickAbort === ctl) {
          clickAbort = undefined;
          busy = false;
          deps.changed();
        }
      });
  }

  function hoverAt(x: number, y: number): void {
    if (deps.snapMode() === "none") {
      setHover(undefined);
      return;
    }
    hoverNext = [x, y];
    if (hoverBusy) {
      return;
    }
    const [hx, hy] = hoverNext;
    hoverNext = undefined;
    hoverAbort?.abort();
    const ctl = new AbortController();
    hoverAbort = ctl;
    hoverBusy = true;
    const camera = viewer.view.camera.version;
    const show = (result: SnapResult) => {
      if (ctl.signal.aborted || camera !== viewer.view.camera.version) {
        return;
      }
      const site = siteOf(result.tileset);
      if (
        site === undefined ||
        hitRefusal(site, result.tileset, deps.pickState()).refused !==
          undefined ||
        result.design === undefined
      ) {
        setHover(undefined);
        return;
      }
      const px = viewer.view.toPixel(result.shownPoint ?? result.snapPoint);
      setHover(
        px === undefined
          ? undefined
          : { x: px[0]!, y: px[1]!, kind: result.kind, exact: result.exact },
      );
    };
    void snapWith(
      deps.snapMode(),
      { view: viewer.view, x: hx, y: hy, aperture: APERTURE },
      snapDeps(),
      show,
      ctl.signal,
    )
      .then((r) => {
        if (r === undefined && !ctl.signal.aborted) {
          setHover(undefined);
        }
      })
      .catch(() => setHover(undefined))
      .finally(() => {
        hoverBusy = false;
        if (hoverNext !== undefined && !deps.disposed()) {
          hoverAt(...hoverNext);
        }
      });
  }

  function setHover(next: MeasureLive["hover"]): void {
    if (JSON.stringify(next) === JSON.stringify(hover)) {
      return;
    }
    hover = next;
    place();
  }

  const canvas = viewer.canvas;
  const local = (e: PointerEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  let down: { x: number; y: number; id: number } | undefined;
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button === 0) {
        down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerup",
    (e) => {
      const d = down;
      down = undefined;
      if (
        d !== undefined &&
        d.id === e.pointerId &&
        Math.hypot(e.clientX - d.x, e.clientY - d.y) < CLICK_SLOP
      ) {
        pointAt(...local(e));
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (e.buttons === 0) {
        hoverAt(...local(e));
      } else {
        setHover(undefined);
      }
    },
    { signal },
  );
  canvas.addEventListener("pointerleave", () => setHover(undefined), {
    signal,
  });
  // Keyboard: the canvas takes focus; Enter places a point at the centre
  // (the crosshair marks it), Escape clears.
  const priorTabIndex = canvas.getAttribute("tabindex");
  if (priorTabIndex === null) {
    canvas.tabIndex = 0;
  }
  canvas.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        pointAtCentre();
      } else if (e.key === "Escape") {
        clear();
      }
    },
    { signal },
  );
  canvas.addEventListener(
    "focus",
    () => {
      crosshair = canvas.matches(":focus-visible");
      place();
    },
    { signal },
  );
  canvas.addEventListener(
    "blur",
    () => {
      crosshair = false;
      place();
    },
    { signal },
  );

  function pointAtCentre(): void {
    const r = canvas.getBoundingClientRect();
    pointAt(r.width / 2, r.height / 2);
  }
  function clear(): void {
    clickAbort?.abort();
    apply({ type: "escape" });
  }

  // --------------------------------------------------------- the link
  let pendingLink: ReturnType<typeof parseMeasureLink> | undefined;
  function applyLink(
    params: Readonly<Record<string, string | undefined>>,
  ): void {
    const linked = parseMeasureLink(
      params,
      [...deps.sites()].map((s) => s.entry.id),
    );
    const current = formatMeasureLink(state);
    if (
      linked === undefined
        ? current.a === undefined
        : current.a === params.a && current.b === params.b
    ) {
      return;
    }
    pendingLink = linked;
    if (linked === undefined) {
      apply({ type: "escape" });
      return;
    }
    resolveLink();
  }
  /** A linked measurement once its site's placements are in. */
  function resolveLink(): void {
    const linked = pendingLink;
    const site = linked && deps.site(linked.site);
    if (linked === undefined || site === undefined) {
      return;
    }
    const a = drawnEnd(site, linked.a);
    const b = drawnEnd(site, linked.b);
    if (a === undefined || b === undefined) {
      return;
    }
    pendingLink = undefined;
    const end = (design: Float64Array, drawn: DrawnEnd): MeasureEnd => ({
      site: linked.site,
      design,
      ...drawn,
      how: "link",
      tolerance: 0,
    });
    state = { phase: "done", a: end(linked.a, a), b: end(linked.b, b) };
    measureUser();
    redraw();
    deps.changed();
  }

  // --------------------------------------------------------- the view
  function view(): MeasurePanel {
    const a = deps.answers();
    const s = deps.drawState();
    const panels: OpenerPanel[] = [];
    if (a !== undefined) {
      for (const o of openers) {
        panels.push({
          ...openerView(o, a, s),
          id: o.id,
          quiet: o.quiet,
          details: openerDetails(o.id, a),
        });
      }
    }
    const mode = deps.snapMode();
    const how =
      mode === "exact"
        ? "Snaps to the alignment's exact design where there is one, else to the drawn mesh."
        : mode === "geometry"
          ? "Snaps to the drawn mesh's vertices and edges."
          : "No snapping: the point under the pointer.";
    const next =
      state.phase === "empty"
        ? "Click a point on a model, or press Enter on the focused view to use its centre."
        : state.phase === "first"
          ? "Now the second point. Esc clears."
          : "Click again to start another. Esc clears.";
    return {
      snap: mode,
      openers: panels,
      ...(a !== undefined && {
        datasheet: {
          pid: a.mark.pid,
          name: a.mark.name,
          lines: [
            a.mark.published.position,
            a.mark.published.ellipsoidHeight,
            a.mark.published.spc,
          ],
          retrieved: a.mark.retrieved,
          ...(datasheetUrl(a.mark.datasheetUrl) !== undefined && {
            url: datasheetUrl(a.mark.datasheetUrl)!,
          }),
        },
      }),
      user: {
        phase: state.phase,
        instruction: instruction ?? `${next} ${how}`,
        refused,
        busy,
        ...(state.phase === "done" &&
          measured !== undefined && { result: userResult(measured, s) }),
      },
      ...(framesFailed !== undefined
        ? { waiting: `Measure needs the frame data: ${framesFailed}` }
        : frames === undefined
          ? { waiting: "Loading the Earth orientation data measure needs…" }
          : {}),
    };
  }

  function endRows(
    e: MeasureEnd,
    v: EndView,
    frame?: EngineeringFrame,
  ): DetailRow[] {
    const symbol = frame ? unitSymbol(frame.units.horizontalUnitName) : "";
    const rows: DetailRow[] = [];
    if (v.station !== undefined) {
      rows.push({ label: "Station", value: v.station });
    }
    if (v.offset !== undefined) {
      rows.push({ label: "Offset", value: v.offset });
    }
    if (v.elevation !== undefined) {
      rows.push({
        label: "Elevation",
        value: `${v.elevation}${e.shownAbove ? " (marked on the barrier's top above it)" : ""}`,
      });
    }
    rows.push({
      label: "Design E, N",
      value: `${fixed(e.design[0]!, 3)}, ${fixed(e.design[1]!, 3)} ${symbol}`,
    });
    rows.push({
      label: "Obtained",
      value: `${HOW_TEXT[e.how]}${e.kind !== undefined && e.how !== "link" ? `, on ${KIND_TEXT[e.kind]}` : ""}${v.tolerance === "exact" ? "" : `; ${v.tolerance}`}`,
    });
    return rows;
  }

  function userResult(
    m: NonNullable<typeof measured>,
    s: DrawState,
  ): NonNullable<UserMeasurePanel["result"]> {
    const st = m.state as Extract<MeasureState, { phase: "done" }>;
    const v = m.view;
    const length = dist(
      drawnAt(st.a, s.t, s.exaggeration),
      drawnAt(st.b, s.t, s.exaggeration),
    );
    const exaggerated = s.exaggeration !== 1 && s.t < 1;
    const site = deps.site(st.a.site);
    const paired = site?.pair !== undefined;
    const tone: GlobeTone = s.morphing
      ? "moving"
      : exaggerated
        ? "muted"
        : !paired || s.t < 0.5
          ? "rigid"
          : "reprojected";
    const off = length - m.m.distance;
    const globe = exaggerated
      ? `Errors drawn ×${s.exaggeration}: no measurement on the globe until true scale.`
      : s.morphing
        ? `Moving between placements: drawn ${metres3(length)} now.`
        : Math.abs(off) < 5e-4
          ? "Drawn at its true length."
          : `${paired ? "Rigid draws it" : "Drawn rigidly, this model's line is"} ${metres3(length)}, ${metres3(Math.abs(off))} ${off >= 0 ? "long" : "short"}.`;
    const frame = site && frameOf(site);
    const details: DetailRow[] = [
      { label: "Horizontal design distance", value: v.horizontalDistance },
      { label: "Rise, design", value: v.delta[2] },
    ];
    if (m.m.overBody !== undefined) {
      details.push({
        label: "On the ellipsoid",
        value: metres3(m.m.overBody.distance),
      });
    }
    details.push(
      { label: "Combined scale factor", value: v.combinedFactorPpm },
      { label: "Grid convergence", value: v.convergence },
      { label: "Accuracy", value: v.accuracy },
    );
    return {
      design: v.designDistance,
      trueDistance: v.trueDistance,
      globe,
      tone,
      details,
      ends: [
        { label: "A", rows: endRows(st.a, v.a, frame) },
        { label: "B", rows: endRows(st.b, v.b, frame) },
      ],
    };
  }

  function openerDetails(id: OpenerId, a: Answers): DetailRow[] {
    const symbol = unitSymbol(a.frame.unitName);
    const coords = (d: ArrayLike<number>) =>
      `${fixed(d[0]!, 3)}, ${fixed(d[1]!, 3)} ${symbol}; ${fixed(d[2]!, 3)} ${symbol} NAVD88`;
    const v = openerViews.get(id);
    switch (id) {
      case "marker":
        return [
          {
            label: "Design point",
            value: `Sta. ${stationText(a.marker.station)} on the centreline: ${coords(a.marker.design)}`,
          },
          {
            label: "The marker",
            value:
              "The design's own point where it truly is, through the design CRS by PROJ: not a survey.",
          },
        ];
      case "mark": {
        const m = a.mark;
        const rows: DetailRow[] = [
          {
            label: "NGS publishes",
            value: `E ${fixed(m.publishedSpc.easting, 2)}, N ${fixed(m.publishedSpc.northing, 2)} ${symbol} (zone 3)`,
          },
        ];
        if (markDesign !== undefined) {
          rows.push({
            label: "PROJ gives",
            value: `E ${fixed(markDesign[0]!, 3)}, N ${fixed(markDesign[1]!, 3)} ${symbol}, from NGS's NAD83(2011) position`,
          });
        }
        const published = Math.hypot(
          m.publishedSpc.easting - m.nearestDesign[0],
          m.publishedSpc.northing - m.nearestDesign[1],
        );
        rows.push(
          {
            label: "Horizontal design distance",
            value: `${fixed(m.horizontalDistance, 3)} ${symbol}; from NGS's own zone 3, ${fixed(published, 3)} ${symbol}`,
          },
          {
            label: "Nearest centreline",
            value: `Sta. ${stationText(m.nearest.station)}, at ${coords(m.nearestDesign)}`,
          },
        );
        if (v !== undefined) {
          rows.push(
            { label: "Combined scale factor", value: v.combinedFactorPpm },
            { label: "Accuracy", value: v.accuracy },
          );
        }
        return rows;
      }
      case "pair": {
        const pair = a.pairs[0]!;
        const rows: DetailRow[] = [
          {
            label: "Horizontal design distance",
            value: `${fixed(pair.horizontalDistance, 3)} ${symbol}`,
          },
          {
            label: "Ends",
            value: `Sta. ${stationText(pair.ends.a.station)} to ${stationText(pair.ends.b.station)}, on the centreline`,
          },
        ];
        const gap = rulerGap(a);
        if (gap !== undefined) {
          rows.push({
            label: "The ruler",
            value: `Design feet (yellow ticks) against ground feet (white): ${gap.charAt(0).toLowerCase()}${gap.slice(1)} over the line.`,
          });
        }
        if (v !== undefined) {
          rows.push(
            { label: "Combined scale factor", value: v.combinedFactorPpm },
            { label: "Grid convergence", value: v.convergence },
            { label: "Accuracy", value: v.accuracy },
          );
        }
        return rows;
      }
    }
  }

  // ------------------------------------------------------- the target
  const target: MorphTarget = {
    setState(st) {
      overlay.setState(st);
    },
  };

  void loadFrames();
  signal.addEventListener("abort", () => {
    hoverAbort?.abort();
    clickAbort?.abort();
  });

  return {
    view,
    live,
    target,
    place,
    placementsChanged() {
      exact.clear();
      const site = corridor();
      for (const t of [site?.rigid, site?.reprojected]) {
        if (t !== undefined && t.placement !== undefined) {
          exact.set(t, new ExactSnapService(t, deps.alignment));
        }
      }
      buildOpeners();
      resolveLink();
    },
    answersChanged() {
      buildOpeners();
    },
    pointAtCentre,
    clear,
    applyLink,
    retry() {
      if (framesFailed !== undefined) {
        void loadFrames();
      }
    },
    shownValues() {
      const a = deps.answers();
      if (a === undefined) {
        return undefined;
      }
      const s = deps.drawState();
      const marker = openers.find((o) => o.id === "marker");
      const pair = openerMeasures.get("pair");
      const pairShown = pair && shownOf(pair);
      const settled = !s.morphing && s.exaggeration === 1;
      const done = state.phase === "done" ? state : undefined;
      const userShown =
        done !== undefined && measured?.state === done
          ? shownOf(measured.m)
          : undefined;
      return shownValues(a, {
        ...(pairShown !== undefined && { pair: pairShown }),
        ...(settled &&
          marker !== undefined && {
            marker: {
              separation: dist(
                drawnAt(marker.a, s.t, 1),
                drawnAt(marker.b, s.t, 1),
              ),
              mode: s.t >= 0.5 ? "reprojected" : "rigid",
            },
          }),
        ...(markDesign !== undefined && { mark: markDesign }),
        ...(done !== undefined && {
          user: {
            a: done.a,
            b: done.b,
            ...(userShown !== undefined && { measurement: userShown }),
          },
        }),
      });
    },
    openerFocus(id) {
      const o = openers.find((x) => x.id === id);
      if (o === undefined) {
        return undefined;
      }
      const s = deps.drawState();
      const pa = drawnAt(o.a, s.t, s.exaggeration);
      const pb = drawnAt(o.b, s.t, s.exaggeration);
      return {
        center: Float64Array.from([0, 1, 2].map((k) => (pa[k]! + pb[k]!) / 2)),
        length: dist(pa, pb),
      };
    },
    dispose() {
      live.dispose();
      overlay.dispose();
      if (priorTabIndex === null) {
        canvas.removeAttribute("tabindex");
      }
    },
  };
}

/** East, north and up at a body-fixed point (WGS 84). */
function enu(p: ArrayLike<number>): {
  east: Float64Array;
  north: Float64Array;
  up: Float64Array;
} {
  const up = new Float64Array(3);
  Ellipsoid.WGS84.geodeticSurfaceNormal(Float64Array.from(p), up);
  const l = Math.hypot(up[0]!, up[1]!) || 1;
  const east = Float64Array.from([-up[1]! / l, up[0]! / l, 0]);
  const north = Float64Array.from([
    up[1]! * east[2]! - up[2]! * east[1]!,
    up[2]! * east[0]! - up[0]! * east[2]!,
    up[0]! * east[1]! - up[1]! * east[0]!,
  ]);
  return { east, north, up };
}

/** A small level cross on the ground at `p`, `r` metres each way. */
function groundCross(
  p: ArrayLike<number>,
  r: number,
): { a: DrawnEnd; b: DrawnEnd }[] {
  const { east, north } = enu(p);
  return [east, north].map((axis) => {
    const at = (s: number) =>
      fixedEnd([0, 1, 2].map((k) => p[k]! + axis[k]! * s));
    return { a: at(-r), b: at(r) };
  });
}

/** A pill moved sideways to stay inside a view `width` CSS pixels wide. */
function keepInside<T extends { x: number; text: string }>(
  p: T,
  width: number,
): T {
  const half = (p.text.length * 7 + 16) / 2;
  const x = Math.min(Math.max(p.x, half + 6), width - half - 6);
  return x === p.x || width < 2 * half + 12 ? p : { ...p, x };
}

/**
 * Hides the lower-priority of two pills that would overlap (earlier first),
 * by an estimate of their size: 7 px a character, 22 px tall.
 */
function declutter<T extends { x: number; y: number; text: string }>(
  pills: readonly T[],
): T[] {
  const kept: T[] = [];
  for (const p of pills) {
    const w = p.text.length * 7 + 16;
    const clash = kept.some((q) => {
      const qw = q.text.length * 7 + 16;
      return Math.abs(p.x - q.x) < (w + qw) / 2 && Math.abs(p.y - q.y) < 24;
    });
    if (!clash) {
      kept.push(p);
    }
  }
  return kept;
}
