// Change points and alerts (plan §16.9, Detect), shared by the CLI and
// Dyno. A metric's run-to-run series (each run's median for one scene,
// scenario, configuration and hardware class) is split where its
// distribution changes, with E-Divisive means as MongoDB and Apache Otava
// use it: binary segmentation on the energy statistic, each split kept
// only when a permutation test finds it significant. A change becomes an
// alert when it is also large enough to matter (3% by default). Alerts
// are keyed by what changed and where, so their triage state (status,
// owner, note) survives new runs; that state lives beside the results.
import { summarize } from "./stats.mjs";

/** Deterministic pseudo-random numbers (alerts must be reproducible). */
function random(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * The split of `x` with the largest energy statistic (left: x[0..tau)),
 * scaled by the sample sizes; O(n²) with running sums of pairwise
 * distances inside the left part, the right part and the whole.
 */
function bestSplit(x, minSize) {
  const n = x.length;
  // within[t]: sum of |xi - xk| over i < k < t (left part x[0..t)).
  const within = new Float64Array(n + 1);
  for (let t = 1; t <= n; t++) {
    let add = 0;
    for (let i = 0; i < t - 1; i++) {
      add += Math.abs(x[i] - x[t - 1]);
    }
    within[t] = within[t - 1] + add;
  }
  // after[t]: the same over the right part x[t..n).
  const after = new Float64Array(n + 1);
  for (let t = n - 1; t >= 0; t--) {
    let add = 0;
    for (let k = t + 1; k < n; k++) {
      add += Math.abs(x[t] - x[k]);
    }
    after[t] = after[t + 1] + add;
  }
  const total = within[n];
  let best = { tau: -1, q: -Infinity };
  for (let tau = minSize; tau <= n - minSize; tau++) {
    const m = tau;
    const r = n - tau;
    const between = total - within[tau] - after[tau];
    const e =
      (2 / (m * r)) * between -
      (m > 1 ? within[tau] / ((m * (m - 1)) / 2) : 0) -
      (r > 1 ? after[tau] / ((r * (r - 1)) / 2) : 0);
    const q = ((m * r) / (m + r)) * e;
    if (q > best.q) {
      best = { tau, q };
    }
  }
  return best;
}

/**
 * Change points of a series: indices where a new segment starts, with
 * their permutation p-values.
 */
export function changePoints(
  values,
  { alpha = 0.05, minSize = 3, permutations = 199, seed = 1 } = {},
) {
  const next = random(seed);
  const out = [];
  const segment = (from, to) => {
    const x = values.slice(from, to);
    if (x.length < 2 * minSize) {
      return;
    }
    const best = bestSplit(x, minSize);
    if (best.tau < 0) {
      return;
    }
    let exceed = 0;
    const shuffled = x.slice();
    for (let p = 0; p < permutations; p++) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      if (bestSplit(shuffled, minSize).q >= best.q) {
        exceed++;
        // Already not significant: stop early.
        if ((exceed + 1) / (permutations + 1) >= alpha) {
          return;
        }
      }
    }
    const pValue = (exceed + 1) / (permutations + 1);
    if (pValue >= alpha) {
      return;
    }
    out.push({ index: from + best.tau, p: pValue });
    segment(from, from + best.tau);
    segment(from + best.tau, to);
  };
  segment(0, values.length);
  return out.sort((a, b) => a.index - b.index);
}

/**
 * Alerts from run summaries (oldest first): for every metric, scene and
 * scenario, configuration and hardware class with enough runs, each
 * significant change point whose medians differ by at least `minChange`.
 * Lower is better for every metric, so up is a regression.
 */
export function detectAlerts(
  summaries,
  metrics,
  { minChange = 0.03, minRuns = 6, ...options } = {},
) {
  const series = new Map();
  for (const s of summaries) {
    for (const cell of s.scenes) {
      const scene =
        cell.scenario && cell.scenario !== "cold-orbit"
          ? `${cell.scene}|${cell.scenario}`
          : cell.scene;
      for (const metric of metrics) {
        const m = cell.metrics[metric];
        if (!m || !Number.isFinite(m.median)) {
          continue;
        }
        const key = `${metric}|${scene}|${cell.config}|${s.hardware}`;
        if (!series.has(key)) {
          series.set(key, {
            metric,
            scene,
            title:
              cell.scenario && cell.scenario !== "cold-orbit"
                ? `${cell.title} · ${cell.scenario}`
                : cell.title,
            config: cell.config,
            hardware: s.hardware,
            points: [],
          });
        }
        series.get(key).points.push({ run: s, value: m.median });
      }
    }
  }
  const alerts = [];
  for (const entry of series.values()) {
    const points = entry.points.slice(-100);
    if (points.length < minRuns) {
      continue;
    }
    const values = points.map((p) => p.value);
    const cps = changePoints(values, options);
    const bounds = [0, ...cps.map((c) => c.index), values.length];
    cps.forEach((cp, k) => {
      const before = values.slice(bounds[k], cp.index);
      const after = values.slice(cp.index, bounds[k + 2]);
      const a = summarize(before)?.median;
      const b = summarize(after)?.median;
      if (!(a > 0) || b === undefined) {
        return;
      }
      const change = b / a;
      if (Math.abs(change - 1) < minChange) {
        return;
      }
      const last = points[cp.index - 1].run;
      const first = points[cp.index].run;
      alerts.push({
        id: `${entry.metric}|${entry.scene}|${entry.config}|${entry.hardware}|${last.commit.slice(0, 12)}..${first.commit.slice(0, 12)}`,
        metric: entry.metric,
        scene: entry.scene,
        title: entry.title,
        config: entry.config,
        hardware: entry.hardware,
        kind: change > 1 ? "regression" : "improvement",
        change,
        p: cp.p,
        before: { median: a, runs: before.length },
        after: { median: b, runs: after.length },
        range: {
          from: { commit: last.commit, subject: last.subject, date: last.date, run: last.name },
          to: { commit: first.commit, subject: first.subject, date: first.date, run: first.name },
        },
      });
    });
  }
  return alerts.sort((x, y) =>
    y.range.to.date.localeCompare(x.range.to.date),
  );
}

/** Metrics watched for alerts (lower is better for each). */
export const ALERT_METRICS = [
  "cpuP50",
  "gpuP50",
  "frameP95",
  "frameP999",
  "over100",
  "firstContentMs",
  "settleMs",
  "requests",
  "bytes",
  "heapBytes",
];

/** Triage states, in queue order. */
export const ALERT_STATES = ["new", "acknowledged", "expected", "invalid", "fixed"];
