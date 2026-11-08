// What a result's GPU time means: the version of the engine's GPU timer
// that measured it (RunMetrics.gpuTimer; src/gpu/GpuTimer.ts `version`).
// 1 (absent: every result before 2026-11-07): each pass's interval
// summed. 2: overlapping passes counted once. On a GPU whose passes
// overlap (an Apple tiler) 1 read far more, so numbers of the two are
// never compared: as cli.mjs keeps the old performance.memory heap apart
// (jsHeapReportedBytes), an older timer's gpuP50 moves to gpuSummedP50,
// which nothing summarizes, and gpuP50 holds only the current timer's.
// Trends, change-point alerts, the scorecard and budgets then see a
// series that starts at the first run of the current timer (the
// annotation in annotations.json marks it), and a ratio to a baseline of
// another timer is not taken.

export const GPU_TIMER = 2;

/** The metrics the timer measures, and where an older timer's go. */
export const GPU_METRICS = { gpuP50: "gpuSummedP50" };

/** A run's timer version (1 when not recorded). */
export const gpuTimerOf = (metrics) => metrics?.gpuTimer ?? 1;

/**
 * `results` with every run's GPU metrics of the current timer: an older
 * timer's moved apart. The same object when nothing moves.
 */
export function currentGpuTimer(results) {
  let changed = false;
  const runs = (results?.runs ?? []).map((run) => {
    const m = run.metrics;
    if (!m || gpuTimerOf(m) === GPU_TIMER) {
      return run;
    }
    const moved = Object.keys(GPU_METRICS).filter((k) => m[k] !== undefined);
    if (!moved.length) {
      return run;
    }
    changed = true;
    const metrics = { ...m };
    for (const k of moved) {
      metrics[GPU_METRICS[k]] = metrics[k];
      delete metrics[k];
    }
    return { ...run, metrics };
  });
  return changed ? { ...results, runs } : results;
}

/**
 * A stored summary (summarizeRun) with GPU metrics only from the current
 * timer: a cell summarized without a timer version (before versions were
 * recorded) or with another loses them. The same object when nothing
 * changes.
 */
export function currentGpuTimerSummary(summary) {
  let changed = false;
  const scenes = (summary?.scenes ?? []).map((cell) => {
    if (cell.gpuTimer === GPU_TIMER || !cell.metrics) {
      return cell;
    }
    const moved = Object.keys(GPU_METRICS).filter(
      (k) => cell.metrics[k] !== undefined,
    );
    if (!moved.length) {
      return cell;
    }
    changed = true;
    const metrics = { ...cell.metrics };
    for (const k of moved) {
      delete metrics[k];
    }
    return { ...cell, metrics };
  });
  return changed ? { ...summary, scenes } : summary;
}
