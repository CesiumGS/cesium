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
import type { OverlayGeometry } from "../protocol.ts";
import type { StressContext, StressResult } from "../tests.ts";
import type { AddedFrameSpec } from "../tree.ts";
import type { KnobState, ScenarioId } from "./spec.ts";

/** The scenario's answer to its question, at the knobs it was evaluated at. */
export interface ScenarioAnswer {
  headline: string;
  value?: number;
  unit?: string;
  /** Always stated (R8): metres where it is bounded, and in words either way. */
  accuracy: { meters?: number; note: string };
  /** The tree path the answer runs along: node ids for `branchPath`. */
  path?: { from: string; to: string };
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

export interface ScenarioEvaluation {
  scenario: ScenarioId;
  /** The frames the scenario adds to the base tree (`buildScenarioTree`). */
  added: readonly AddedFrameSpec[];
  answer: ScenarioAnswer;
  overlays: readonly { id: string; geometry: OverlayGeometry }[];
  sightLines?: readonly SightLine[];
  /**
   * The checks re-run at these knobs, judged (by the host, `judgeResult`).
   * Off the checked setup they stand in for the catalog's own checks that
   * compare with no published value (round trips, hand formulas): those ran
   * at the checked setup only, so the proof doesn't show them there.
   */
  live: readonly StressResult[];
  /**
   * The answer's value at the checked setup, in `answer.unit`: off it, the
   * proof states how far the setting moves the answer from it.
   */
  checkedAnswerValue?: number;
}

/**
 * Evaluates a scenario at `knobs` (already clamped to its spec) and
 * `epochTdb` (TDB seconds past J2000). `ctx` has the frame tree and the data
 * the scenario's spec needs.
 */
export type ScenarioEvaluator = (
  ctx: StressContext,
  knobs: KnobState,
  epochTdb: number,
) => Promise<ScenarioEvaluation>;

const evaluators = new Map<ScenarioId, ScenarioEvaluator>();

/**
 * Registers the evaluator of scenario `id`. A second registration for the
 * same id replaces the first (a test stubs a scenario this way).
 */
export function registerScenario(
  id: ScenarioId,
  evaluator: ScenarioEvaluator,
): void {
  evaluators.set(id, evaluator);
}

/** The evaluator registered for `id`, if any. */
export function scenarioEvaluator(
  id: ScenarioId,
): ScenarioEvaluator | undefined {
  return evaluators.get(id);
}
