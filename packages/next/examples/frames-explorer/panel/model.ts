// What the panel renders (DESIGN.md): plain data the page (main.ts) fills
// from the worker, the frame tree and the run. Only
// types from the rest of the example: the main thread never bundles the
// stress catalog, PROJ or the overlay builders (protocol.ts's rule).
import type { AccuracyStatement } from "../../../src/measure/accuracy.ts";
import type { DataItem, RunSummary } from "../protocol.ts";
import type {
  Citation,
  Comparison,
  GroupInfo,
  TraceStep,
} from "../stress/groupInfo.ts";
import type { Selection } from "../selection.ts";
import type { StressResult } from "../tests.ts";
import type { TreeNode } from "../tree.ts";

/** One data item in the status strip (R9): loading.ts's model. */
export type { ItemStatus } from "../loading.ts";
import type { ItemStatus } from "../loading.ts";

export type {
  Citation,
  Comparison,
  GroupInfo,
  TraceStep,
} from "../stress/groupInfo.ts";

/**
 * What the panel shows beyond the result itself: the page fills these from
 * the result's own fields (rulings F27, F28: `accuracyNote`, `trace`,
 * `source`), its group (`compared`) and the short row labels (content.ts).
 */
export interface ResultExtras {
  /** A noun phrase of 60 characters or fewer, for rows (the title stays in the inspector). */
  label?: string;
  /**
   * F27: the accuracy that applies when the result has no position
   * statement: "exact arithmetic", "published value ± half the last digit".
   */
  accuracyNote?: string;
  /** For a relative check beside an absolute placement: why that placement doesn't affect it. */
  relative?: string;
  compared?: Comparison;
  trace?: readonly TraceStep[];
  source?: Citation;
  /** A hand formula, written out (R10's last resort, R11's effect check). */
  formula?: string;
}

export type OverlayId =
  | "triads"
  | "designGrid"
  | "siteGrid"
  | "rigidVsExact"
  | "roundTrip"
  | "orion"
  | "distortion"
  | "bias";

/** An overlay toggle and its legend line (R8). */
export interface OverlayView {
  id: OverlayId;
  label: string;
  /** The legend's short name ("Design grid"). */
  short?: string;
  on: boolean;
  /** Waiting for data, drawn, or why it can't be. */
  state: "off" | "waiting" | "drawn" | "missing" | "error";
  waitingFor?: DataItem;
  /** The legend's accuracy line: always present, "not bounded" with its reason when undefined. */
  accuracy: string;
  /** The accuracy is not bounded: a term has no size (warning color, "Not bounded"). */
  unbounded?: boolean;
  /** Bounded, but resting on an assumption (warning color, with the number). */
  caution?: boolean;
  /** Why it can't be drawn (missing, error). */
  problem?: string;
}

export type OrionFrame = "GCRF" | "ITRF" | "MOON_ME";
export type DistortionCrs = "6420" | "32610" | "3857" | "ldp";

/** The clock's readout (R4: triads and Orion follow it). */
export interface ClockView {
  /** ISO 8601 UTC, to the second. */
  utc: string;
  /** The same instant as the viewer's time controls show it (the place's local time). */
  local?: string;
  /** Earth orientation at the instant: measured, predicted with its age, or outside the table. */
  eop:
    | { kind: "measured" }
    | { kind: "predicted"; ageDays: number }
    | { kind: "outside"; span: string };
}

/** A run of the catalog (R13): its progress and counts. */
export interface RunView {
  state: "idle" | "running" | "done" | "cancelled";
  done: number;
  total: number;
  summary?: RunSummary;
}

/** The frames a composed accuracy can be stated against (the walk's "against"). */
export type Reference = "ITRF" | "GCRF" | "ICRF";
export const REFERENCES: readonly Reference[] = ["ITRF", "GCRF", "ICRF"];

/**
 * A frame's composed accuracy (R8) as the walk shows it: `accuracyOf`'s
 * statement for a point at the frame's origin against `reference` at the
 * clock's instant, with each term tied to the edges it comes from (C2).
 */
export interface ComposedView {
  statement: AccuracyStatement;
  /** For each of `statement.terms`, the edges (child node ids) it comes from; empty for a term on no edge. */
  termEdges: readonly (readonly string[])[];
  /** Path edges that contribute nothing at the origin, and why (a rotation about the origin). */
  zeroAtOrigin: readonly { edge: string; why: string }[];
  /** One sentence under the total: the counterpoint, or a limit. */
  note?: string;
}

/** Composed accuracies, by reference and node id. */
export type ComposedAccuracy = Readonly<
  Record<Reference, Readonly<Record<string, ComposedView>>>
>;

/** Whether the gallery resolved an ion token (never the token itself, R18; F28: not where it came from). */
export type TokenSource = "available" | undefined;

/** The "Try your own" area's state (R18). */
export interface UserCrsView {
  state: "idle" | "fetching" | "noCrs" | "found" | "error" | "running" | "done";
  /** The ion asset or iModel id the user entered. */
  id?: string;
  /** For noCrs, found and error: what happened, in a sentence. */
  message?: string;
  /** The CRS's name, once read. */
  crsName?: string;
}

/** A tour stop (R16): caption, camera and overlays. */
export interface TourStop {
  id: string;
  title: string;
  caption: string;
  overlays: readonly OverlayId[];
}

/** One line of the report's environment (R15). */
export type EnvironmentLine = readonly [label: string, value: string];

/** Everything the panel shows. */
export interface PanelModel {
  items: readonly ItemStatus[];
  /** The frame tree, once frame data is ready; `treeNote` says why not. */
  tree?: TreeNode;
  treeNote?: string;
  composed: ComposedAccuracy;
  clock: ClockView;
  overlays: readonly OverlayView[];
  orionFrame: OrionFrame;
  distortionCrs: DistortionCrs;
  /** The distortion overlay's height above the ellipsoid, m. */
  distortionHeight: number;
  /** R4's frame-bias exaggeration, 1 to 1e7. */
  biasFactor: number;
  /**
   * F32: the design grid's true-north lines at true scale; otherwise their
   * convergence is drawn ×`convergenceFactor` (labelled on the globe).
   */
  trueScale: boolean;
  convergenceFactor: number;
  /** The triads' scale, as the legend states it. */
  triadScale: string;
  groups: readonly GroupInfo[];
  results: readonly StressResult[];
  extras: Readonly<Record<string, ResultExtras>>;
  /** Groups waiting for an item, by group id (R9: "waiting for …"). */
  waiting: Readonly<Record<string, DataItem>>;
  run: RunView;
  token: TokenSource;
  userCrs: UserCrsView;
  /** A bound CRS to try ("Use an example"): references.json's Tokyo input. */
  exampleWkt2: string;
  tour: readonly TourStop[];
  environment: readonly EnvironmentLine[];
}

/** What the panel can ask of the page. */
export interface PanelActions {
  runAll(): void;
  /** Loads a failed item again (the error alert's Retry). */
  retryItem(item: DataItem): void;
  runGroup(group: string): void;
  cancel(): void;
  setOverlay(id: OverlayId, on: boolean): void;
  setOrionFrame(frame: OrionFrame): void;
  setDistortionCrs(crs: DistortionCrs): void;
  setDistortionHeight(meters: number): void;
  setBiasFactor(factor: number): void;
  /** F32: true-north lines at true scale, or with the convergence exaggerated. */
  setTrueScale(on: boolean): void;
  jumpToFlyby(): void;
  /** Flies to a frame, a result's site, or a tour stop. */
  showOnGlobe(target: { frame: string } | { result: string }): void;
  fetchAsset(id: string): void;
  runUserCrs(wkt2: string): void;
  copyReport(): Promise<void>;
  saveReport(format: "markdown" | "json"): void;
  /** A deep link (R15) to a selection or a tour stop, for "Copy link". */
  linkTo(target: Selection | { kind: "tour"; stop: string }): string;
}

export type { LensChoice, Selection, Tab } from "../selection.ts";
