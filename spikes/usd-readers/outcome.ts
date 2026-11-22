// How a reader's runs on one sample settle into one outcome (CS-900). The
// rule, stated in the Lab page and in docs/design/usd-readers.md:
//
//   - A run "opened" the sample only if it composed a stage and delivered its
//     records. A run that composed and then failed is "composed, then
//     failed"; a run that never composed is "failed".
//   - Timings count only the runs that opened. Records (for coverage) come
//     from the first run that opened.
//   - The sample is "opened" when every run opened, "mixed" when some did,
//     and "failed" when none did. Every distinct error from every run is
//     kept. Coverage treats "failed" as not opened.
//
// Browser and Node alike. Spike code for CS-900; not part of @cesium/next.

import type { StageRecord } from "./facts.ts";

/** One run's timings, in milliseconds. */
export interface Run {
  startMs: number;
  loadMs: number;
  composeMs: number;
}

/** What one worker run produced. */
export interface Opened {
  run?: Run;
  records?: StageRecord;
  error?: string;
}

export type OutcomeStatus = "opened" | "mixed" | "failed";

export interface Outcome {
  status: OutcomeStatus;
  runs: number;
  /** Runs that composed and delivered records. */
  opened: number;
  /** Runs that composed a stage and then failed. */
  composedThenFailed: number;
  /** Runs that never composed a stage. */
  failed: number;
  /** The runs that opened: the only ones timed. */
  timed: Run[];
  /** From the first run that opened. */
  records?: StageRecord;
  /** Every distinct error, from every run. */
  errors: string[];
}

export function settle(runs: readonly Opened[]): Outcome {
  const timed: Run[] = [];
  let records: StageRecord | undefined;
  let composedThenFailed = 0;
  let failed = 0;
  const errors = new Set<string>();
  for (const o of runs) {
    for (const e of [
      ...(o.error ? [o.error] : []),
      ...(o.records?.errors ?? []),
    ]) {
      errors.add(e);
    }
    if (o.run && o.records) {
      timed.push(o.run);
      records ??= o.records;
    } else if (o.run) {
      composedThenFailed++;
    } else {
      failed++;
    }
  }
  const opened = timed.length;
  return {
    status:
      opened === runs.length && opened > 0
        ? "opened"
        : opened > 0
          ? "mixed"
          : "failed",
    runs: runs.length,
    opened,
    composedThenFailed,
    failed,
    timed,
    records,
    errors: [...errors],
  };
}

/** An outcome in words: "opened", "opened in 3 of 5 runs", "failed in all 5 runs". */
export function describeOutcome(o: Outcome): string {
  if (o.status === "opened") {
    return "opened";
  }
  const parts: string[] = [];
  if (o.composedThenFailed > 0) {
    parts.push(`${o.composedThenFailed} composed, then failed`);
  }
  if (o.failed > 0) {
    parts.push(`${o.failed} failed before composing`);
  }
  return o.status === "mixed"
    ? `opened in ${o.opened} of ${o.runs} runs (${parts.join(", ")})`
    : `did not open in any of ${o.runs} runs (${parts.join(", ")})`;
}
