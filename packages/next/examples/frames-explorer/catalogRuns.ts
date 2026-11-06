// The stress catalog's runs in the worker (R13): the results the page
// holds, the run's progress, and the last run's summary. Every run, the
// catalog's or "Try your own"'s, waits its turn in one queue (final review,
// Important 1); a run of some groups replaces just their results.
import type { RunView } from "./panel/model.ts";
import { isAbort, messageOf, type PageCore } from "./page.ts";
import type { RunSummary } from "./protocol.ts";
import type { RunQueue } from "./runQueue.ts";
import type { StressResult } from "./tests.ts";

/** The counts over every result the page holds (a group's run joins the rest). */
export function wholeSummary(
  results: readonly StressResult[],
  ms: number,
): RunSummary {
  const s: RunSummary = {
    passed: 0,
    failed: 0,
    skipped: 0,
    shown: 0,
    ms,
    cancelled: false,
  };
  for (const r of results) {
    if (r.missing !== undefined) {
      s.skipped++;
    } else if (r.displayOnly) {
      s.shown++;
    } else if (r.pass) {
      s.passed++;
    } else {
      s.failed++;
    }
  }
  return s;
}

export interface CatalogRuns {
  results(): readonly StressResult[];
  runView(): RunView;
  lastRun(): { startedAt: string; summary: RunSummary } | undefined;
  /** Runs the catalog (or groups of it). Resolves with why it failed, or undefined. */
  run(ids?: readonly string[]): Promise<string | undefined>;
  dispose(): void;
}

export function createCatalogRuns(deps: {
  core: Pick<PageCore, "client" | "invalidate" | "disposed" | "scrub">;
  runs: RunQueue;
  /** The results changed: the links' known results follow (R15). */
  updateKnown(): void;
  /** A run ended: the round-trip markers follow, if they're on. */
  ran(): void;
}): CatalogRuns {
  const { client, invalidate, disposed, scrub } = deps.core;
  let results: StressResult[] = [];
  let runView: RunView = { state: "idle", done: 0, total: 0 };
  let lastRun: { startedAt: string; summary: RunSummary } | undefined;
  const startedAt = { iso: "", ms: 0 };

  function run(ids?: readonly string[]): Promise<string | undefined> {
    // Queued behind any run going on; the same ids asked again while waiting
    // or running share that run (a double-click on "Run this group").
    return deps.runs.run(
      () =>
        disposed() ? Promise.resolve("the example was left") : runNow(ids),
      ids === undefined ? "all" : `ids:${[...ids].sort().join(",")}`,
    );
  }

  async function runNow(ids?: readonly string[]): Promise<string | undefined> {
    const groups = ids && new Set(ids);
    // The results this run replaces: its groups', and those it names by id.
    results = groups
      ? results.filter((r) => !groups.has(r.group) && !groups.has(r.id))
      : [];
    let before = results.length;
    runView = {
      state: "running",
      done: 0,
      total: groups
        ? 0
        : lastRun
          ? lastRun.summary.passed +
            lastRun.summary.failed +
            lastRun.summary.skipped +
            lastRun.summary.shown
          : 225,
    };
    startedAt.iso = new Date().toISOString();
    startedAt.ms = performance.now();
    invalidate();
    try {
      const summary = await client.run(ids, (r) => {
        // A case named by one of its results' ids re-runs them all: replace
        // its siblings rather than list them twice.
        const at = results.findIndex((x) => x.id === r.id);
        if (at >= 0 && at < before) {
          results.splice(at, 1);
          before--;
        }
        results.push(r);
        runView = {
          ...runView,
          done: results.length - before,
          total: Math.max(runView.total, results.length - before),
        };
        invalidate();
      });
      if (disposed()) {
        return "the example was left";
      }
      lastRun = { startedAt: startedAt.iso, summary };
      runView = {
        state: summary.cancelled ? "cancelled" : "done",
        done: results.length - before,
        total: results.length - before,
        summary: wholeSummary(results, summary.ms),
      };
      deps.updateKnown();
      deps.ran();
    } catch (error) {
      if (isAbort(error) || disposed()) {
        return "the example was left";
      }
      runView = {
        state: "cancelled",
        done: results.length - before,
        total: runView.total,
        reason: scrub(messageOf(error)),
      };
      lastRun = {
        startedAt: startedAt.iso,
        summary: {
          ...wholeSummary(results, performance.now() - startedAt.ms),
          cancelled: true,
        },
      };
      invalidate();
      // Every count and the "known" results reflect what did come back.
      deps.updateKnown();
      return scrub(messageOf(error));
    }
    invalidate();
    return undefined;
  }

  return {
    results: () => results,
    runView: () => runView,
    lastRun: () => lastRun,
    run,
    dispose: () => {},
  };
}
