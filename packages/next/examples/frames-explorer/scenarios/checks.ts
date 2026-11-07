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
 * never changes its kind when its result comes in. An id nothing says
 * anything about is taken as reference-backed, `published`, as `checkRows`
 * takes it off the checked setup.
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
  const compared = comparedFor(
    id,
    groupInfo(result?.group ?? groupOf(id))?.compared ?? UNKNOWN,
  );
  return compared === UNKNOWN ? "published" : kindOfComparison(compared);
}

/** A result id's group: the part before its first dot (all of an id without one). */
export const groupOf = (id: string): string => {
  const dot = id.indexOf(".");
  return dot < 0 ? id : id.slice(0, dot);
};

/** No comparison known for an id: neither its own (content.ts) nor its group's. */
const UNKNOWN: Comparison = { kind: "independent", text: "" };

/**
 * A check against measured data that the page judges itself (Fix round 1):
 * the dish's terrain horizon against the DSN's published receive mask,
 * traced over the drawn terrain (sightLines.ts `maskCheckText`). The mask
 * is the station's and doesn't move with the time, so it is judged at any
 * station that has one, on or off the checked setup.
 */
export interface PageCheck {
  id: string;
  title: string;
  /**
   * Consistent: our terrain lies below the mask at every azimuth. Above:
   * it rises above the mask somewhere. Unsure: inside our terrain's error,
   * or over terrain not drawn (never clear, Review Focus 2). Loading: not
   * traced yet.
   */
  outcome: "consistent" | "above" | "unsure" | "loading";
  /** One short line under the title. */
  summary: string;
  /** The whole comparison, for the row's details. */
  text: string;
  /** The terrain's error at the levels crossed, m, when known. */
  meters?: number;
  /** The published mask's citation. */
  source: { document: string; publisher?: string; locator?: string };
}

/** The page's trace of the mask, as `maskCheckText` (sightLines.ts) gives it. */
export interface MaskView {
  /** The check it was traced for (its label). */
  traced?: string;
  state: "clear" | "blocked" | "may-block" | "unknown" | "waiting";
  text: string;
  meters?: number;
  mask?: { azimuths: number; below: number; above: number; unsure: number };
}

/**
 * The dish's measured-data row from the evaluation's `maskCheck` and the
 * page's trace of it (`view`, undefined until traced). "Validated" only
 * when consistent; otherwise it says what was compared.
 */
export function maskCheckRow(
  check: { label: string; samples: number; source: PageCheck["source"] },
  view: MaskView | undefined,
): CheckRow {
  const n = check.samples;
  // A trace of another check (the last station's, before the page traces
  // the new one) is not this one's: loading until it is (fix 2).
  if (view !== undefined && view.traced !== check.label) {
    view = undefined;
  }
  const base = {
    id: "mask-check",
    title: `Our terrain horizon vs ${check.label}, ${n} azimuths`,
    source: check.source,
    ...(view?.meters !== undefined && { meters: view.meters }),
  };
  const m = view?.mask;
  let page: PageCheck;
  if (view === undefined || view.state === "waiting") {
    page = {
      ...base,
      outcome: "loading",
      summary: "tracing our terrain along the mask",
      text: view?.text ?? "Our terrain isn't traced along the mask yet.",
    };
  } else if (view.state === "clear") {
    page = {
      ...base,
      outcome: "consistent",
      summary: `validated against the published mask: our terrain lies below it at all ${m?.azimuths ?? n} azimuths`,
      text: view.text,
    };
  } else if (view.state === "blocked") {
    page = {
      ...base,
      outcome: "above",
      summary: `our terrain rises above the published mask at ${m?.above ?? "some"} of ${m?.azimuths ?? n} azimuths`,
      text: view.text,
    };
  } else {
    page = {
      ...base,
      outcome: "unsure",
      summary: m
        ? `compared at ${m.azimuths} azimuths: ${m.unsure} within our terrain's error or not drawn, ${m.below} below the mask`
        : view.text,
      text: view.text,
    };
  }
  return { status: "page", kind: "measured", check: page };
}

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
  /**
   * The evaluation's own check: off the checked setup a live re-run
   * (`live`); at it, for a spec with `liveAtChecked`, its own kind (a hand
   * formula, a round trip: the capstone's pair, Task 8 fix 1).
   */
  | { status: "live"; kind: CheckKind; result: StressResult }
  /**
   * Off the checked setup, when the evaluation at your setting failed
   * (Task 9, I10): nothing ran, and the row says so.
   */
  | {
      status: "not-run";
      kind: CheckKind;
      id: string;
      title: string;
      /** Why it didn't run; without one, the evaluation failed. */
      reason?: string;
    }
  /** Judged on the page, against measured data (`maskCheckRow`). */
  | { status: "page"; kind: "measured"; check: PageCheck }
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
    if (spec.liveAtChecked) {
      // Checks of this very answer at this setup, by another route (no
      // catalog case can: the capstone's pair); never a published value.
      for (const result of evaluation.live) {
        rows.push({
          status: "live",
          kind: evaluation.liveKinds?.[result.id] ?? "live",
          result,
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
  for (const n of evaluation.notRun ?? []) {
    rows.push({
      status: "not-run",
      kind: "live",
      id: n.id,
      title: n.title,
      reason: n.reason,
    });
  }
  return rows;
}
