// The Verify tab's run line (R5, F44): the counts while and after a run, and
// why a run stopped or skipped checks. Plain functions, tested on their own.
import type { DataItem } from "../protocol.ts";
import type { StressResult } from "../tests.ts";
import { duration, megabytes } from "./format.ts";
import type { RunView } from "./model.ts";

const list = (words: readonly string[]): string =>
  words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

/** The data items the skipped results waited for, in the order first seen. */
function missingItems(results: readonly StressResult[]): DataItem[] {
  const out: DataItem[] = [];
  for (const r of results) {
    for (const m of r.missing ?? []) {
      if (!out.includes(m)) {
        out.push(m);
      }
    }
  }
  return out;
}

/**
 * The run's line: "Not run yet", "12 of 225 checks run", the counts and time,
 * with the missing data a partial run skipped for, or why it stopped.
 */
export function runLine(
  run: RunView,
  results: readonly StressResult[],
  label: Readonly<Record<DataItem, string>>,
): string {
  switch (run.state) {
    case "idle":
      return "Not run yet";
    case "running":
      return `${run.done} of ${run.total} checks run`;
    case "cancelled": {
      const why =
        run.reason ?? (run.summary?.cancelled ? "you stopped it" : "unknown");
      return `Stopped after ${run.done} of ${run.total} checks: ${why}`;
    }
    case "done": {
      const s = run.summary;
      if (!s) {
        return `${run.done} checks run`;
      }
      const missing = missingItems(results.filter((r) => !r.userInput));
      const skipped =
        s.skipped > 0 && missing.length > 0
          ? `${s.skipped} skipped (${list(missing.map((m) => label[m]))} missing)`
          : `${s.skipped} skipped`;
      return `${s.passed} passed, ${s.failed} failed, ${skipped}, ${s.shown} shown, not judged; ${duration(s.ms)}`;
    }
  }
}

/** A result row's value cell when it has no value and tolerance to draw a bar from. */
export function valueNote(result: StressResult): string {
  if (result.missing !== undefined && result.missing.length > 0) {
    return "skipped: missing data";
  }
  if (result.optIn !== undefined) {
    return `not run: opt-in, ${megabytes(result.optIn.bytes)}`;
  }
  if (result.expectedError !== undefined) {
    return result.pass ? "threw as expected" : "didn't throw as expected";
  }
  return result.displayOnly === true
    ? "shown, not judged"
    : "judged by the case";
}
