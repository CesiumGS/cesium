// What each proof row says (the owner, 2026-11-06: proof rows expand in
// place, and each states its status in words as well as colour). Pure, so
// the words are unit-tested (test/framesExplorerProofText.test.ts): nothing
// reads as verified that isn't (Review Focus 1).
import type { ProofRow } from "../scenarios/proof.ts";
import type { StressResult } from "../tests.ts";
import { formatAnswer, formatDelta } from "./answerText.ts";
import { quantity } from "./format.ts";
import type { ResultExtras } from "./model.ts";

/** A row's name: its short label, else its title (QuestionCard's `rowName`). */
const rowName = (r: StressResult, extras?: ResultExtras) =>
  extras?.label ?? r.title;

export type ProofTone = "pass" | "fail" | "reference" | "loading" | "stale";

export interface ProofRowText {
  key: string;
  title: string;
  /** The status in words: never colour alone. */
  status:
    | "Checked against a reference"
    | "Checked by the catalog"
    | "Live re-run"
    | "Reference applies at the checked setup"
    | "Loading"
    | "Updating"
    | "Following the clock";
  /** Pass or fail, for a judged row only. */
  verdict?: "Pass" | "Fail";
  tone: ProofTone;
  /** One short line beside the status: the value against its tolerance, or the delta. */
  summary: string;
  /** The judged result, for the inline details. */
  result?: StressResult;
}

/** "3.2 nm, within 1 mm", or the case's own words. */
export function valueLine(r: StressResult): string {
  if (r.value !== undefined && r.tolerance !== undefined) {
    const within = Math.abs(r.value) <= r.tolerance;
    return `${quantity(r.value, r.unit)}, ${within ? "within" : "beyond"} ${quantity(r.tolerance, r.unit)}`;
  }
  if (r.effect) {
    return `${quantity(r.effect.value, r.effect.unit)}`;
  }
  return r.pass ? "judged by the case" : (r.error ?? "failed");
}

/**
 * A row's words. `freshness` is the shown evaluation's against the current
 * setup (model.ts): while it is the last setup's, no row carries a verdict,
 * a verdict's colour or a delta (Review Focus 1, R9). While the clock plays
 * the rows follow it in one steady state, their values updated in place.
 */
export function proofRowText(
  row: ProofRow,
  extras: Readonly<Record<string, ResultExtras>>,
  freshness: "current" | "updating" | "following" = "current",
  published?: { proofId: string; printed: string; unit: string },
): ProofRowText {
  const own = rowText(row, extras, published);
  if (freshness === "current" || row.kind === "pending") {
    return own;
  }
  const following = freshness === "following";
  const result = own.result;
  return {
    key: own.key,
    title: own.title,
    status: following ? "Following the clock" : "Updating",
    tone: "stale",
    summary:
      following && result
        ? // The value only: "within" would read as a verdict for an
          // earlier time (fix 2).
          result.effect
          ? quantity(result.effect.value, result.effect.unit)
          : result.value !== undefined
            ? quantity(result.value, result.unit)
            : "following the clock"
        : row.kind === "reference-only"
          ? "its reference applies at the checked setup"
          : "re-running at your setting",
    ...(following && result && { result }),
  };
}

/** What a check without a published reference compares, in a few words. */
const AGREES: Readonly<Record<string, string>> = {
  roundTrip: "a round trip comes back",
  independent: "two routes agree",
  formula: "a hand formula agrees",
};

/**
 * A row's one line, collapsed (the owner, fix 1): ours against the
 * published value where the headline has one, else what it is compared
 * against.
 */
function summaryOf(
  r: StressResult,
  extras: ResultExtras | undefined,
  published: { proofId: string; printed: string; unit: string } | undefined,
): string {
  if (published && r.id === published.proofId && r.effect) {
    return `${formatAnswer(r.effect.value, published.unit)} vs ${published.printed} (published) · ${valueLine(r)}`;
  }
  const agrees =
    r.source === undefined ? AGREES[extras?.compared?.kind ?? ""] : undefined;
  return agrees ? `${valueLine(r)}: ${agrees}` : valueLine(r);
}

function rowText(
  row: ProofRow,
  extras: Readonly<Record<string, ResultExtras>>,
  published?: { proofId: string; printed: string; unit: string },
): ProofRowText {
  switch (row.kind) {
    case "checked": {
      const r = row.result;
      return {
        key: `checked:${r.id}`,
        title: rowName(r, extras[r.id]),
        // A check that cites no published value is the catalog's own (a
        // round trip): it says so, not "against a reference".
        status:
          r.source !== undefined
            ? "Checked against a reference"
            : "Checked by the catalog",
        verdict: r.pass ? "Pass" : "Fail",
        tone: r.pass ? "pass" : "fail",
        summary: summaryOf(r, extras[r.id], published),
        result: r,
      };
    }
    case "live": {
      const r = row.result;
      return {
        key: `live:${r.id}`,
        title: rowName(r, extras[r.id]),
        status: "Live re-run",
        verdict: r.pass ? "Pass" : "Fail",
        tone: r.pass ? "pass" : "fail",
        summary: summaryOf(r, extras[r.id], undefined),
        result: r,
      };
    }
    case "reference-only":
      return {
        key: `reference:${row.id}`,
        title: extras[row.id]?.label ?? row.title,
        status: "Reference applies at the checked setup",
        tone: "reference",
        summary: row.delta
          ? `your setting moves the answer by ${formatDelta(row.delta.value, row.delta.unit)}`
          : "not judged at your setting",
      };
    case "pending":
      return {
        key: `pending:${row.id}`,
        title: extras[row.id]?.label ?? row.title,
        status: "Loading",
        tone: "loading",
        summary: "the check is running",
      };
  }
}
