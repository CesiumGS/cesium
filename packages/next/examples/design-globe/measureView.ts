// The measure section's view (plan 4b Task 19): the panel's strings for the
// openers, the datasheet and the user's own measurement, from the tool's
// state. Pure: panel/Measure.tsx renders it.
import type {
  EngineeringFrame,
  SnapKind,
} from "../../src/engineering/EngineeringFrame.ts";
import type { Measurement } from "../../src/measure/measure.ts";
import type { Answers } from "./answers.ts";
import {
  accuracyRows,
  fixed,
  unitSymbol,
  type EndView,
  type MeasureView,
} from "./measureModel.ts";
import {
  dist,
  drawnAt,
  metres3,
  openerView,
  type DrawState,
  type GlobeTone,
  type Opener,
  type OpenerFigures,
  type OpenerId,
  type OpenerMeasured,
} from "./measureOpeners.ts";
import type { MeasureEnd, MeasureHow, MeasureState } from "./measureState.ts";
import type { SnapMode } from "./page.ts";

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
  /** The page's `measure` failed for it: why (with Retry). */
  readonly error?: string;
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
  /** Both points are placed but `measure` failed: why (with Retry). */
  readonly error?: string;
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

/** NGS's datasheet link, only when it is https on NGS's own host, with no userinfo. */
export function datasheetUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    return u.protocol === "https:" &&
      u.username === "" &&
      u.password === "" &&
      (u.hostname === "ngs.noaa.gov" || u.hostname === "www.ngs.noaa.gov")
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}

export const HOW_TEXT: Record<MeasureHow, string> = {
  exact: "exact snap to the design",
  geometry: "snap to the drawn mesh",
  pick: "plain pick, no snap",
  link: "from the link, as given",
};

export const KIND_TEXT: Record<SnapKind, string> = {
  point: "a point",
  segment: "a straight line",
  arc: "a curve",
  surface: "the surface",
};

/** The user's measurement through `measure`, once both ends are in. */
export interface Measured {
  readonly state: Extract<MeasureState, { phase: "done" }>;
  readonly view: MeasureView;
  readonly m: Measurement;
}

/** What `measurePanel` builds the section from. */
export interface MeasurePanelInput {
  readonly answers: Answers | undefined;
  readonly draw: DrawState;
  readonly openers: readonly Opener[];
  /** An opener's Details rows. */
  details(id: OpenerId, a: Answers): DetailRow[];
  /** An opener's figures from the page's `measure`, once it has run. */
  measured(id: OpenerId): OpenerMeasured | undefined;
  /** Why the page's `measure` failed for an opener, if it did. */
  openerError(id: OpenerId): string | undefined;
  /** Why the user's measurement failed, if it did. */
  readonly userError: string | undefined;
  readonly snap: SnapMode;
  readonly state: MeasureState;
  /** Why the last point wasn't placed, or undefined for the next step. */
  readonly instruction: string | undefined;
  readonly refused: boolean;
  readonly busy: boolean;
  readonly result: UserMeasurePanel["result"] | undefined;
  readonly framesFailed: string | undefined;
  readonly framesLoaded: boolean;
}

/** The measure section's strings. */
export function measurePanel(input: MeasurePanelInput): MeasurePanel {
  const {
    answers: a,
    draw: s,
    openers,
    state,
    instruction,
    refused,
    busy,
  } = input;
  const framesFailed = input.framesFailed;
  const panels: OpenerPanel[] = [];
  if (a !== undefined) {
    for (const o of openers) {
      const error = input.openerError(o.id);
      panels.push({
        ...openerView(o, a, s, input.measured(o.id)),
        id: o.id,
        quiet: o.quiet,
        details: input.details(o.id, a),
        ...(error !== undefined && { error }),
      });
    }
  }
  const mode = input.snap;
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
      ...(input.userError !== undefined && { error: input.userError }),
      ...(input.result !== undefined && { result: input.result }),
    },
    ...(framesFailed !== undefined
      ? { waiting: `Measure needs the frame data: ${framesFailed}` }
      : !input.framesLoaded
        ? { waiting: "Loading the Earth orientation data measure needs…" }
        : {}),
  };
}

export function endRows(
  e: MeasureEnd,
  v: EndView,
  frame: EngineeringFrame | undefined,
  datum: string | undefined,
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
      value: `${v.elevation}${datum !== undefined ? `, ${datum}` : ""}${e.shownAbove ? " (marked on the barrier's top above it)" : ""}`,
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

/**
 * The user's measurement's strings: the design and true distances, the line
 * as drawn now (`paired`: the site draws both placements) and its Details.
 */
export function userResult(
  m: Measured,
  s: DrawState,
  paired: boolean,
  frame: EngineeringFrame | undefined,
  datum: string | undefined,
): NonNullable<UserMeasurePanel["result"]> {
  const st = m.state;
  const v = m.view;
  const length = dist(
    drawnAt(st.a, s.t, s.exaggeration),
    drawnAt(st.b, s.t, s.exaggeration),
  );
  const exaggerated = s.exaggeration !== 1 && s.t < 1;
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
    ...accuracyRows(m.m.accuracy),
  );
  return {
    design: v.designDistance,
    trueDistance: v.trueDistance,
    globe,
    tone,
    details,
    ends: [
      { label: "A", rows: endRows(st.a, v.a, frame, datum) },
      { label: "B", rows: endRows(st.b, v.b, frame, datum) },
    ],
  };
}
