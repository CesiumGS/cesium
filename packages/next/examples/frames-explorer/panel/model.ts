// What the panel renders (DESIGN.md): plain data the page (panelModel.ts) fills
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
import type { Moment, ScenarioAnswer } from "../scenarios/evaluate.ts";
import type { CheckRow } from "../scenarios/checks.ts";
import type { PublishedView } from "./answerText.ts";
import type { SceneLegendRow } from "./legendRows.ts";
import type { RouteStep } from "./routeSteps.ts";
import type {
  KnobSpec,
  KnobState,
  KnobValue,
  ScenarioId,
} from "../scenarios/spec.ts";
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
  /**
   * The accuracy in one line (S-I7): the figure, its 1σ and one qualifier;
   * always present, "not bounded" with its reason when undefined. The
   * legend shows it too.
   */
  accuracy: string;
  /** What the figure means and where it comes from: behind "About this figure". */
  detail?: string;
  /** How it was drawn (Orion's sampling), a muted line under its options. */
  drawing?: string;
  /** The accuracy is not bounded: a term has no size (warning color, "Not bounded"). */
  unbounded?: boolean;
  /** Bounded, but resting on an assumption (warning color, with the number). */
  caution?: boolean;
  /** Why it can't be drawn (missing, error). */
  problem?: string;
  /**
   * A line about a part of a drawn overlay: Orion's dot while its OEM loads
   * on the page, or why it can't show (R9; `attention` in the warning color).
   */
  note?: { text: string; attention: boolean };
  /**
   * Lines drawn and keyed apart, each its own legend entry (the rigid and
   * the exact line, stop 4); without them the overlay is one entry.
   */
  parts?: readonly OverlayPart[];
}

/** One line of an overlay, as the legend keys it. */
export interface OverlayPart {
  /** Unique within the overlay ("rigid"). */
  key: string;
  /** The full name, as the globe labels the line. */
  label: string;
  /** The legend's compact name. */
  short: string;
  accuracy: string;
  line: "solid" | "dashed" | "dotted";
  /** The overlay's family color, or white (the rigid line). */
  tone: "family" | "white";
}

export type OrionFrame = "GCRF" | "ITRF" | "MOON_ME";
export type DistortionCrs = "6420" | "32610" | "3857" | "ldp";

/**
 * The times the panel prints that move every frame while the clock plays
 * (Task 4d): their own source, so the rest of the panel doesn't render
 * with them (page.ts `createTimeSource`).
 */
export interface LiveTime {
  /** The clock's instant, ISO 8601 UTC to the second. */
  utc: string;
  /** The scenario's time, ISO 8601 UTC, while a scenario shows. */
  epochUtc?: string;
}

export interface TimeSource {
  subscribe(listener: () => void): () => void;
  get(): LiveTime;
}

/** The clock's readout (R4: triads and Orion follow it); its time is `LiveTime`'s. */
export interface ClockView {
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
  /** Why a run stopped short (F44): the worker's error, not the user's Stop. */
  reason?: string;
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

/**
 * The scenario on the page (spec "How the page works"): the strip, its
 * question and answer, its knobs against the checked setup, its tree's lit
 * path and its checks (scenarios/checks.ts).
 */
export interface ScenarioPanelView {
  id: ScenarioId;
  title: string;
  question: string;
  /** What applies at the checked setup, in words ("published references"). */
  checkedBy: string;
  /** The frame it draws in when there's no choice of it (the "Drawing in" tag). */
  drawIn?: string;
  /** The strip, in its order: the scenarios the page shows. */
  strip: readonly { id: ScenarioId; title: string; question: string }[];
  knobs: readonly KnobSpec[];
  values: KnobState;
  /** The checked setup's knobs and epoch (ISO 8601 UTC). */
  checked: KnobState;
  /** The scenario's time is `LiveTime.epochUtc` (it moves every frame while the clock plays). */
  checkedEpochUtc: string;
  atChecked: boolean;
  /** What moved off the checked setup: knob ids, then "time". */
  changed: readonly string[];
  /** Loading until this setup's evaluation is in (R9). */
  status: "loading" | "ready" | "error";
  /** While loading: why it waits (a catalog run going on). */
  queued?: string;
  problem?: { message: string; missing: boolean };
  /** The latest answer (the last setup's while it is stale). */
  answer?: ScenarioAnswer;
  /** The headline's published counterpart, and how ours compares (answerText.ts). */
  published?: PublishedView;
  /**
   * How the shown evaluation stands against the current setup: its own
   * ("current"), the last setup's while the new one is worked out
   * ("updating": dimmed, no verdicts), or the clock's a moment ago while it
   * plays ("following": one steady state, updated in place).
   */
  freshness: "current" | "updating" | "following";
  /** The answer's path through the tree: up from its start to the common ancestor, then down. */
  path?: { up: readonly string[]; ancestor: string; down: readonly string[] };
  /** The rows of the shown evaluation's setup; read with `freshness`. */
  checks: readonly CheckRow[];
  /** The inline details' extras for the live rows (the catalog's are in `extras`). */
  liveExtras: Readonly<Record<string, ResultExtras>>;
  /** A limit the scenario says plainly (the backdrop Moon). */
  note?: string;
  /** Its lines of sight over the drawn terrain, the local horizon (sightLines.ts, Task 6b). */
  terrain?: readonly TerrainSightView[];
  /** Moments the scenario offers to jump the clock to ("Behind the Moon"), UTC ms. */
  presets?: readonly Moment[];
  /** The knob the tree drives (one-path's frame): its nodes are the choices. */
  treeControl?: {
    knob: string;
    verb: string;
    options: readonly { value: string; label: string }[];
  };
  /** A short line under the diagram's key. */
  diagramNote?: string;
  /** Data pinned beside the frame its numbers are in (not a frame of the tree). */
  data?: { label: string; frame: string; source: string };
  /** The answer's route through the tree, spelled out (routeSteps.ts). */
  route?: readonly RouteStep[];
  /** The route's two legs' headings, when it meets at the ancestor (stand-on-moon's clocks). */
  routeLegs?: { start: string; end: string };
  /** The base frames its answer and checks name, kept in the docked diagram's view. */
  focus: readonly string[];
  playing: boolean;
  rate: number;
  /** Earth orientation at the scenario's time. */
  eop?: ClockView["eop"];
}

/** One line of sight over the terrain, as the answer shows it (sightLines.ts). */
export interface TerrainSightView {
  id: string;
  state: "clear" | "blocked" | "may-block" | "unknown" | "waiting";
  text: string;
  accuracy?: string;
  /** The terrain's error at the levels crossed, m, when known. */
  meters?: number;
  /** Share of the path over unknown terrain, 0 to 1. */
  unknownFraction?: number;
  /** The check a mask view was traced for (its label): a row takes only its own. */
  traced?: string;
  /** A mask check's counts (sightLines.ts `maskCheckText`). */
  mask?: { azimuths: number; below: number; above: number; unsure: number };
  /** Where a blocked line first meets the drawn terrain (Earth-fixed m): the drone's footprint (Task 7). */
  hitAt?: readonly number[];
  /** Where the line was traced from, as placed on the drawn ground (Earth-fixed m). */
  from?: readonly number[];
  /** The line's lowest height above the drawn terrain, m, ends included (clear or may block). */
  clearance?: number;
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
  /** The current scenario's own lines and marks, for the legend (the corridor's). */
  sceneLegend?: readonly SceneLegendRow[];
  groups: readonly GroupInfo[];
  results: readonly StressResult[];
  extras: Readonly<Record<string, ResultExtras>>;
  /** Groups waiting for an item, by group id (R9: "waiting for …"). */
  waiting: Readonly<Record<string, DataItem>>;
  run: RunView;
  /**
   * Why a card's "Run this group" waits (a run is going on): one run at a
   * time (final review, Important 1). Undefined when it can run.
   */
  runBusy?: string;
  token: TokenSource;
  userCrs: UserCrsView;
  /** A bound CRS to try ("Use an example"): references.json's Tokyo input. */
  exampleWkt2: string;
  /** The scenario shown, once the page has set one up. */
  scenario?: ScenarioPanelView;
  environment: readonly EnvironmentLine[];
  /** A message for the snackbar (a deep link that didn't resolve), new each time its id changes. */
  notice?: { id: number; text: string };
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
  /** Flies to a frame or a result's site. */
  showOnGlobe(target: { frame: string } | { result: string }): void;
  /** Frame content (F): re-flies the selection, else the scenario's view, else the opening view. */
  frameContent(): void;
  fetchAsset(id: string): void;
  runUserCrs(wkt2: string): void;
  copyReport(): Promise<void>;
  saveReport(format: "markdown" | "json"): void;
  /** A deep link (R15) to a selection in the scenario at its knobs and time, for "Copy link". */
  linkTo(target: Selection): string;
  /** Shows a scenario at its checked setup. */
  selectScenario(id: ScenarioId): void;
  setKnob(id: string, value: KnobValue): void;
  /** Back to the checked setup: its knobs and epoch. */
  backToChecked(): void;
  /**
   * A moment the scenario offers: the clock to its time, paused (the dish's
   * "Behind the Moon"), or its knobs set (the drone's "Over the building").
   */
  goToMoment(moment: Moment): void;
  /** The next selection of result `id` shows it without moving the camera or the overlays. */
  selectQuietly(id: string): void;
}

export type { LensChoice, Selection, Tab } from "../selection.ts";
