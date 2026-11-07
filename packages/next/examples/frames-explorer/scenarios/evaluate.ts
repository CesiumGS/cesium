// A scenario's evaluation in the worker (R13): what it adds to the tree, its
// answer with its accuracy (R8), its overlays and sight lines, and the checks
// it re-runs live at the user's knobs. Plain data, so it crosses to the page
// by structured clone; the overlays' buffers are transferred.
//
// Each scenario module (Tasks 4 to 8) calls `registerScenario` when the
// worker imports it (host.ts, through scenarios/index.ts). The host meets the
// scenario's needs, clamps its knobs, calls the evaluator, and judges `live`
// as the runner would (`judgeResult`), so a live row is never the
// evaluator's word alone.
import type { EngineeringFrame } from "../../../src/engineering/EngineeringFrame.ts";
import type { FrameCache } from "../frameCache.ts";
import type { SceneLegendRow } from "../panel/legendRows.ts";
import type { OverlayGeometry } from "../protocol.ts";
import type { StressContext, StressResult } from "../tests.ts";
import type { AddedFrameSpec } from "../tree.ts";
import type { KnobState, ScenarioId } from "./spec.ts";

/** The scenario's answer to its question, at the knobs it was evaluated at. */
export interface ScenarioAnswer {
  /**
   * The headline's few words after its figure, so "<value> <unit> <label>"
   * answers the question on its own: "relative to the Moon (MOON_ME)",
   * "east of GCRF's x axis" (fix 1). The panel and the callout show it alike.
   */
  label: string;
  /** A second line always shown under the headline ("0.42 km/s in GCRF · 27.2 km/s in ITRF"). */
  aside?: string;
  /**
   * The line of sight's verdict against the Earth and the Moon, apart from
   * `aside` so the page can join the terrain's to it: the weakest of the
   * three leads (Task 6b fix 1, answerText.ts `withTerrain`). `where` names
   * the observer ("at DSS-43").
   */
  sky?: { state: "clear" | "lost"; text: string; where: string };
  /** The paragraph that explains it. */
  headline: string;
  /**
   * The headline's published counterpart, where it has one (the owner,
   * fix 1): the value as printed and its citation, read from
   * references.json; the catalog check `checkId` compares the two at the
   * checked setup, within `tolerance`.
   */
  published?: {
    value: number;
    unit: string;
    /** As the source prints it: "56.02 µs/day". */
    printed: string;
    /** The citation's own text (references.json `source.document`). */
    document: string;
    /** A web link to it, if references.json gives one (a DOI's, first). */
    url?: string;
    checkId: string;
    /** The catalog's tolerance, in words: "within 2%". */
    tolerance: string;
  };
  value?: number;
  unit?: string;
  /**
   * Always stated (R8): metres where it is bounded, and in words either way.
   * `unbounded` when it has no size (not bounded, not stated or not known):
   * the panel says so in its warning colour, from this flag, never from the
   * note's words (Task 4c item 4).
   */
  accuracy: { meters?: number; note: string; unbounded?: boolean };
  /** The tree path the answer runs along: node ids for `branchPath`. */
  path?: { from: string; to: string };
  /**
   * How the answer is worked out, in plain words: a few short steps, each a
   * title and its sentence or two (Task 4c item 1).
   */
  method?: readonly { title: string; text: string }[];
}

/**
 * A line of sight for the main thread to resolve against terrain (Task 5):
 * its ends Earth-fixed (ITRF), metres.
 */
export interface SightLine {
  id: string;
  from: readonly number[];
  to: readonly number[];
  label: string;
}

/** A moment a scenario offers to jump the clock to (the knobs' "Jump to"). */
export interface Moment {
  id: string;
  label: string;
  /** UTC ms. */
  utcMs: number;
  /** The button's icon: the Moon for one behind it, else the timeline. */
  icon?: "moon" | "timeline";
}

export interface ScenarioEvaluation {
  scenario: ScenarioId;
  /** The frames the scenario adds to the base tree (`buildScenarioTree`). */
  added: readonly AddedFrameSpec[];
  /**
   * Data the scenario draws, pinned beside the frame its numbers are
   * expressed in (the owner's tree design, fix 1): not a frame of the
   * tree. Its route to the drawn-in frame is the answer's path.
   */
  data?: {
    label: string;
    /** The frame its numbers are in: a node of the tree. */
    frame: string;
    /** Where it comes from ("OEM"). */
    source: string;
    /**
     * What its numbers are, for the route's first step: "position and
     * velocity" by default (Orion's), "the site origin's easting and
     * northing" (the BIM site's).
     */
    describes?: string;
    /** Its own accuracy, as a tree edge states one (R8). */
    accuracy: AddedFrameSpec["edge"]["accuracy"];
  };
  answer: ScenarioAnswer;
  overlays: readonly { id: string; geometry: OverlayGeometry }[];
  /**
   * Labels the page puts on the globe at Earth-fixed points (ITRF, metres):
   * the corridor's stations. `marker` draws Orion-now's dot with its halo.
   */
  labels?: readonly {
    id: string;
    text: string;
    at: readonly number[];
    marker?: boolean;
  }[];
  /**
   * A point the user drags on the globe to set two knobs (the corridor's
   * station and offset): where it is (ITRF, metres), and a local placement
   * that takes a point on the ground to the knobs' design plane, ITRF to
   * design units (a column-major 4×4, rigid at the point's road: good to a
   * few centimetres there, finer than the knobs' steps). The page reads the
   * knobs off the design point (`knobsAt`, scenes.ts); the worker answers at
   * them exactly.
   */
  drag?: { at: readonly number[]; toDesign: readonly number[] };
  /** Its own lines and marks in the globe's legend (the corridor's road, point and offset). */
  legend?: readonly SceneLegendRow[];
  sightLines?: readonly SightLine[];
  /**
   * Spans worth marking on the timeline, UTC ms: when the Moon hides Orion
   * from every dish (Task 6b).
   */
  windows?: readonly {
    id: string;
    label: string;
    startUtc: number;
    endUtc: number;
  }[];
  /**
   * Each site's published horizon mask (the DSN's receive masks, degrees
   * at azimuths 0 to 360), by its frame's name: from orbit the page draws a
   * dish's line only while Orion is above that dish's mask.
   */
  horizonMasks?: Readonly<Record<string, readonly number[]>>;
  /**
   * Rays from a site along its published mask (`from` and each `to` ITRF,
   * m), traced over the drawn terrain on the page (sightLines.ts): our
   * terrain's horizon checked against the published one.
   */
  maskCheck?: {
    label: string;
    /** The published mask's citation (references.json), for its Checks row. */
    source: { document: string; publisher?: string; locator?: string };
    from: readonly number[];
    samples: readonly {
      azimuth: number;
      elevation: number;
      to: readonly number[];
    }[];
  };
  /** Moments a button takes the clock to ("Behind the Moon"), UTC ms, with the button's icon. */
  presets?: readonly Moment[];
  /**
   * The checks re-run at these knobs, judged (by the host, `judgeResult`).
   * None may carry an id of the scenario's `checks` (the host refuses it),
   * and the host strips any `source`: the published references apply at the
   * checked setup, not here.
   * Off the checked setup they stand in for the catalog's own checks that
   * compare with no published value (round trips, hand formulas): those ran
   * at the checked setup only, so the checks don't show them there.
   */
  live: readonly StressResult[];
  /**
   * The answer's value at the checked setup, in `answer.unit`: off it, the
   * checks state how far the setting moves the answer from it.
   */
  checkedAnswerValue?: number;
}

/**
 * Evaluates a scenario at `knobs` (already clamped to its spec) and
 * `epochTdb` (TDB seconds past J2000). `ctx` has the frame tree and the data
 * the scenario's spec needs; `frames` is the worker's bounded cache of
 * engineering frames (frameCache.ts), which the host empties of the
 * previous scenario's when the scenario changes.
 */
export type ScenarioEvaluator = (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
  frames: FrameCache<EngineeringFrame>,
) => Promise<ScenarioEvaluation>;

const evaluators = new Map<ScenarioId, ScenarioEvaluator>();

/**
 * Registers the evaluator of scenario `id`. Throws if `id` already has one:
 * two modules evaluating one scenario is a mistake. (A test stubs one with
 * `unregisterScenarioForTests` first.)
 */
export function registerScenario(
  id: ScenarioId,
  evaluator: ScenarioEvaluator,
): void {
  if (evaluators.has(id)) {
    throw new Error(`scenario "${id}" already has an evaluator registered`);
  }
  evaluators.set(id, evaluator);
}

/** The evaluator registered for `id`, if any. */
export function scenarioEvaluator(
  id: ScenarioId,
): ScenarioEvaluator | undefined {
  return evaluators.get(id);
}

/** For tests only: forgets the evaluator of `id`, so a test can stub it. */
export function unregisterScenarioForTests(id: ScenarioId): void {
  evaluators.delete(id);
}
