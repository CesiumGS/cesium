// What the panel renders (DESIGN.md): plain data, so the panel is the same
// whether a stub (stub.ts, part 6a) or the page's wiring (6b) fills it. Only
// types from the rest of the example: the main thread never bundles the
// stress catalog, PROJ or the overlay builders (protocol.ts's rule).
import type { AccuracyStatement } from "../../../src/measure/accuracy.ts";
import type { DataItem, DataState, RunSummary } from "../protocol.ts";
import type { Lens, StressResult } from "../tests.ts";
import type { TreeNode } from "../tree.ts";

/** One data item in the status strip (R9). */
export interface ItemStatus {
  item: DataItem;
  state: DataState;
  /** While fetching: bytes so far, and the total once every response stated it. */
  received?: number;
  total?: number;
  /** When ready: bytes fetched and the load's time. */
  bytes?: number;
  ms?: number;
  /** For missing and error: what failed, and for missing the setup hint. */
  detail?: string;
}

/** A question card's group, as plain data (the worker's `StressGroup` without its functions). */
export interface GroupInfo {
  id: string;
  name: string;
  question: string;
  lenses: readonly Lens[];
  /** The card's answer line, from the group's results. */
  headline?: string;
  /** What "Show on globe" turns to. */
  focus?: { frames: readonly string[]; overlay?: string; site?: string };
  /** A virtual group (Reproducibility): its results are other groups'. */
  virtual?: boolean;
}

/** One step of a result's computation trace (R16): input, each step, output. */
export interface TraceStep {
  kind: "input" | "step" | "output" | "expected";
  /** What the step is: "Design point", "PROJ operation", "ITRF → GCRF". */
  label: string;
  /** The value as computed, full precision, as copied. */
  value: string;
  /** The value is code (a pipeline, a WKT), shown in the mono face. */
  code?: boolean;
  note?: string;
}

/** Where a reference value comes from (R10). */
export interface Citation {
  document: string;
  publisher?: string;
  /** Table, page, PID or section. */
  locator?: string;
  url?: string;
  retrieved: string;
}

/** What the inspector shows beyond the result itself (6b derives these from the run). */
export interface ResultExtras {
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
  on: boolean;
  /** Waiting for data, drawn, or why it can't be. */
  state: "off" | "waiting" | "drawn" | "missing" | "error";
  waitingFor?: DataItem;
  /** The legend's accuracy line: always present, "not bounded" with its reason when undefined. */
  accuracy: string;
  /** The accuracy is not bounded (shown in the warning color). */
  unbounded?: boolean;
  /** Why it can't be drawn (missing, error). */
  problem?: string;
}

export type OrionFrame = "GCRF" | "ITRF" | "MOON_ME";
export type DistortionCrs = "6420" | "32610" | "3857" | "ldp";

/** The clock's readout (R4: triads and Orion follow it). */
export interface ClockView {
  /** ISO 8601 UTC, to the second. */
  utc: string;
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

/** The selected frame's composed accuracy to ITRF (R8), by node id. */
export type ComposedAccuracy = Readonly<Record<string, AccuracyStatement>>;

/** Where the gallery's ion token came from (never the token itself, R18). */
export type TokenSource = "env" | "setting" | "evaluation" | undefined;
// "setting": pasted in Dyno's Viewer (bench/suite/ionToken.ts).

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
  runGroup(group: string): void;
  cancel(): void;
  setOverlay(id: OverlayId, on: boolean): void;
  setOrionFrame(frame: OrionFrame): void;
  setDistortionCrs(crs: DistortionCrs): void;
  setDistortionHeight(meters: number): void;
  setBiasFactor(factor: number): void;
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

/** The selection the three views share (R14; 6b moves it to selection.ts). */
export type Selection =
  | { kind: "frame"; id: string }
  | { kind: "result"; id: string }
  | { kind: "none" };

export type Tab = "explore" | "verify" | "report";

/** The lens chips: "all" or one audience (R14). */
export type LensChoice = "all" | Lens;
