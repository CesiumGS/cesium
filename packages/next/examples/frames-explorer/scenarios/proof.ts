// A scenario's proof rows (Review Focus 1: off the checked setup, nothing
// claims verification).
//
//  - At the checked setup: each of the spec's `proof` ids as `checked`, with
//    the catalog's judged result, against its published reference (R10).
//  - Off it: each id that compares with a published value becomes
//    `reference-only` ("the reference applies at the checked setup"), with
//    how far the setting moves the answer when the evaluation can say; it
//    carries no result and no pass. Then the evaluation's live re-runs, as
//    `live`. The catalog's other checks (round trips, hand formulas) ran at
//    the checked setup only, so they aren't shown off it: the live re-runs
//    stand in for them.
//
// A result is reference-backed when it carries a `source` (the
// references.json entry it is compared with, F28). A proof id the catalog
// hasn't given yet is taken as reference-backed: off the checked setup it
// still reads "reference applies", never a pass.
//
// Plain data in and out, for the main thread: types only from the catalog.
import type { StressResult } from "../tests.ts";
import type { ScenarioEvaluation } from "./evaluate.ts";
import type { ScenarioSpec } from "./spec.ts";

export type ProofRow =
  | { kind: "checked"; result: StressResult }
  | { kind: "live"; result: StressResult }
  | {
      kind: "reference-only";
      id: string;
      title: string;
      /** The answer here less the answer at the checked setup, in the answer's unit. */
      delta?: { value: number; unit: string };
    };

/** How far the setting moves the answer from the checked setup's, when both are finite. */
function answerDelta(
  evaluation: ScenarioEvaluation,
): { value: number; unit: string } | undefined {
  const { value, unit } = evaluation.answer;
  const checked = evaluation.checkedAnswerValue;
  if (
    value === undefined ||
    checked === undefined ||
    !Number.isFinite(value) ||
    !Number.isFinite(checked)
  ) {
    return undefined;
  }
  return { value: value - checked, unit: unit ?? "" };
}

/**
 * The proof rows of `spec`'s `evaluation`: on (`atChecked`) or off its
 * checked setup, from the catalog's judged results by id. A display-only
 * result is never proof. Throws if the evaluation is another scenario's.
 */
export function proofRows(
  spec: ScenarioSpec,
  atChecked: boolean,
  catalog: ReadonlyMap<string, StressResult>,
  evaluation: ScenarioEvaluation,
): ProofRow[] {
  if (evaluation.scenario !== spec.id) {
    throw new RangeError(
      `proof: an evaluation of "${evaluation.scenario}" is not proof of "${spec.id}"`,
    );
  }
  const rows: ProofRow[] = [];
  if (atChecked) {
    for (const id of spec.proof) {
      const result = catalog.get(id);
      // Not run yet (the page shows the catalog's loading), or shown, not judged.
      if (result !== undefined && result.displayOnly !== true) {
        rows.push({ kind: "checked", result });
      }
    }
    return rows;
  }
  const delta = answerDelta(evaluation);
  for (const id of spec.proof) {
    const result = catalog.get(id);
    if (result?.displayOnly === true) {
      continue;
    }
    if (result === undefined || result.source !== undefined) {
      rows.push({
        kind: "reference-only",
        id,
        title: result?.title ?? id,
        ...(delta !== undefined && { delta }),
      });
    }
  }
  for (const result of evaluation.live) {
    rows.push({ kind: "live", result });
  }
  return rows;
}
