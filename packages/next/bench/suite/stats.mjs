// Statistics for benchmark runs (plan §16.3): medians with bootstrap
// confidence intervals, and ratios between configurations, so a difference
// is reported only when the intervals separate.

export function median(values) {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** A deterministic generator, so reports are reproducible. */
function random(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function resample(values, next) {
  return values.map(() => values[Math.floor(next() * values.length)]);
}

/** Median and its 95% bootstrap interval. */
export function summarize(values, resamples = 2000) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length === 0) {
    return undefined;
  }
  const next = random(v.length * 7919);
  const medians = [];
  for (let i = 0; i < resamples; i++) {
    medians.push(median(resample(v, next)));
  }
  medians.sort((a, b) => a - b);
  return {
    n: v.length,
    median: median(v),
    low: medians[Math.floor(resamples * 0.025)],
    high: medians[Math.floor(resamples * 0.975)],
  };
}

/**
 * Ratio of medians b / a with a 95% bootstrap interval; `separated` when
 * the interval excludes 1 (a real difference at this sample size).
 */
export function ratio(a, b, resamples = 2000) {
  const va = a.filter((x) => Number.isFinite(x));
  const vb = b.filter((x) => Number.isFinite(x));
  if (va.length === 0 || vb.length === 0) {
    return undefined;
  }
  const next = random((va.length + 31) * (vb.length + 17));
  const ratios = [];
  for (let i = 0; i < resamples; i++) {
    const ma = median(resample(va, next));
    const mb = median(resample(vb, next));
    if (ma > 0) {
      ratios.push(mb / ma);
    }
  }
  ratios.sort((x, y) => x - y);
  const ma = median(va);
  const value = ma > 0 ? median(vb) / ma : undefined;
  const low = ratios[Math.floor(ratios.length * 0.025)];
  const high = ratios[Math.floor(ratios.length * 0.975)];
  return { value, low, high, separated: low > 1 || high < 1 };
}
