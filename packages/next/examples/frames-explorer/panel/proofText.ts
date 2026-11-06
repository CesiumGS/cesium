// What each proof row says (the owner, 2026-11-06: proof rows expand in
// place, and each states its status in words as well as colour). Pure, so
// the words are unit-tested (test/framesExplorerProofText.test.ts): nothing
// reads as verified that isn't (Review Focus 1).
import type { ProofRow } from "../scenarios/proof.ts";
import type { StressResult } from "../tests.ts";
import { formatDelta } from "./answerText.ts";
import { quantity } from "./format.ts";
import type { ResultExtras } from "./model.ts";

/** A row's name: its short label, else its title (QuestionCard's `rowName`). */
const rowName = (r: StressResult, extras?: ResultExtras) =>
  extras?.label ?? r.title;

export type ProofTone = "pass" | "fail" | "reference" | "loading";

export interface ProofRowText {
  key: string;
  title: string;
  /** The status in words: never colour alone. */
  status:
    | "Checked against a reference"
    | "Checked by the catalog"
    | "Live re-run"
    | "Reference applies at the checked setup"
    | "Loading";
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

export function proofRowText(
  row: ProofRow,
  extras: Readonly<Record<string, ResultExtras>>,
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
        summary: valueLine(r),
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
        summary: valueLine(r),
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
