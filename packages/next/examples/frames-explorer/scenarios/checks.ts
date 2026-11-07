// A scenario's check rows (Review Focus 1: off the checked setup, nothing
// claims verification). Task 6c: "Proof" overclaimed, so they are "Checks",
// and each names its kind (`CheckKind`) apart from its status.
//
//  - At the checked setup: each of the spec's `checks` ids as `checked`,
//    with the catalog's judged result, against its reference (R10); one the
//    catalog hasn't given yet as `pending` (R9: loading shows).
//  - Off it: each id that compares with a published value becomes
//    `reference-only` ("the reference applies at the checked setup"), with
//    how far the setting moves the answer when the evaluation can say; it
//    carries no result and no pass. Then the evaluation's live re-runs, as
//    `live`. The catalog's other checks (round trips, hand formulas) ran at
//    the checked setup only, so they aren't shown off it: the live re-runs
//    stand in for them.
//
// A result is reference-backed when it carries a `source` (the
// references.json entry it is compared with, F28). A check id the catalog
// hasn't given yet is taken as reference-backed: off the checked setup it
// still reads "reference applies", never a pass. The host strips `source`
// from live results and refuses a live result under a check id.
//
// Plain data in and out, for the main thread: types only from the catalog.
import { comparedFor } from "../content.ts";
import { groupInfo, type Comparison } from "../stress/groupInfo.ts";
import type { StressResult } from "../tests.ts";
import type { ScenarioEvaluation } from "./evaluate.ts";
import type { ScenarioSpec } from "./spec.ts";

/**
 * What a check compares with (Task 6c), apart from its status:
 *
 *  - `published`: a cited independent computation (Ashby & Patla, JPL
 *    Horizons, IERS, a SPICE fixture);
 *  - `measured`: measurements (NGS survey marks, the DSN's horizon masks,
 *    tracking data); the only kind that may say "validated";
 *  - `hand`: an independent closed-form check (R11);
 *  - `roundTrip`: two routes, or a there-and-back, that agree;
 *  - `live`: re-run at your setting, off the checked setup.
 */
export type CheckKind =
  "published" | "measured" | "hand" | "roundTrip" | "live";

/** The kinds, in the legend's order. */
export const CHECK_KINDS: readonly CheckKind[] = [
  "published",
  "measured",
  "hand",
  "roundTrip",
  "live",
];

/**
 * references.json entries whose values are measurements, not computations:
 * the NGS's survey marks (`ngs-*`) and the DSN's published horizon masks.
 */
const MEASURED_REFERENCES: ReadonlySet<string> = new Set(["dsn-horizon-masks"]);

/** Whether references.json entry `reference` holds measured data. */
export const isMeasuredReference = (reference: string): boolean =>
  reference.startsWith("ngs-") || MEASURED_REFERENCES.has(reference);

/** A comparison's kind of check: a hand formula, or two routes that agree. */
function kindOfComparison(c: Comparison | undefined): CheckKind {
  switch (c?.kind) {
    case "published":
      return "published";
    case "formula":
      return "hand";
    default:
      // A round trip, an independent route, an expected error: the
      // catalog's own consistency.
      return "roundTrip";
  }
}

/**
 * The kind of `spec`'s catalog check `id`: the spec's own word for it when
 * it gives one (`checkKinds`); else, with its result, the reference it
 * cites (measured or published) or what it is compared with; without one
 * yet, what its result id says it is compared with (content.ts, its
 * group's). The data test holds the last to the second, so a loading row
 * never changes its kind when its result comes in.
 */
export function checkKind(
  spec: Pick<ScenarioSpec, "checkKinds">,
  id: string,
  result?: StressResult,
): CheckKind {
  const declared = spec.checkKinds?.[id];
  if (declared !== undefined) {
    return declared;
  }
  const source = result?.source;
  if (source !== undefined && source.input !== true) {
    return isMeasuredReference(source.reference) ? "measured" : "published";
  }
  const group = result?.group ?? id.slice(0, id.indexOf("."));
  return kindOfComparison(comparedFor(id, groupInfo(group)?.compared ?? NONE));
}

const NONE: Comparison = { kind: "independent", text: "" };

export type CheckRow =
  | {
      status: "checked";
      kind: CheckKind;
      result: StressResult;
      /** How far the check carries to the scenario (`ScenarioSpec.checkNotes`). */
      note?: string;
    }
  /** At the checked setup: a check id the catalog hasn't given yet. No pass. */
  | { status: "pending"; kind: CheckKind; id: string; title: string }
  | { status: "live"; kind: "live"; result: StressResult }
  | {
      status: "reference-only";
      kind: CheckKind;
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
 * The check rows of `spec`'s `evaluation`: on (`atChecked`) or off its
 * checked setup, from the catalog's judged results by id. A display-only
 * result is never a check. Throws if the evaluation is another scenario's.
 */
export function checkRows(
  spec: ScenarioSpec,
  atChecked: boolean,
  catalog: ReadonlyMap<string, StressResult>,
  evaluation: ScenarioEvaluation,
): CheckRow[] {
  if (evaluation.scenario !== spec.id) {
    throw new RangeError(
      `checks: an evaluation of "${evaluation.scenario}" can't check "${spec.id}"`,
    );
  }
  const rows: CheckRow[] = [];
  if (atChecked) {
    for (const id of spec.checks) {
      const result = catalog.get(id);
      if (result === undefined) {
        rows.push({
          status: "pending",
          kind: checkKind(spec, id),
          id,
          title: id,
        });
      } else if (result.displayOnly !== true) {
        // A display-only result is shown, not judged: never a check.
        const note = spec.checkNotes?.[id];
        rows.push({
          status: "checked",
          kind: checkKind(spec, id, result),
          result,
          ...(note !== undefined && { note }),
        });
      }
    }
    return rows;
  }
  const delta = answerDelta(evaluation);
  for (const id of spec.checks) {
    const result = catalog.get(id);
    if (result?.displayOnly === true) {
      continue;
    }
    if (result === undefined || result.source !== undefined) {
      rows.push({
        status: "reference-only",
        kind: checkKind(spec, id, result),
        id,
        title: result?.title ?? id,
        ...(delta !== undefined && { delta }),
      });
    }
  }
  for (const result of evaluation.live) {
    rows.push({ status: "live", kind: "live", result });
  }
  return rows;
}
