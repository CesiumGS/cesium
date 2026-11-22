// Statistics for studies (CS-404; work/studies/README.md).
//
// A study's verdict rests on these, so each is small, pure and tested
// against a known case:
//
// - the unit of analysis is the run (one repetition: a fresh browser
//   session), never a tick: ticks within a run are correlated;
// - the primary metric is a paired comparison of log ratios (candidate over
//   baseline, paired by device, scene and repetition), tested with a t
//   interval for a fixed sample, or with an always-valid interval (a
//   mixture sequential probability ratio test) when the study stops early;
// - a guardrail passes on non-inferiority: its interval's worse end is
//   inside the margin;
// - secondary metrics are corrected with Benjamini-Hochberg; the primary
//   isn't;
// - ratio metrics pooled over runs take the delta method or a bootstrap;
// - the Bayesian readout is a normal model with a conjugate prior, and a
//   hierarchical (random-effects) model pools scenes or devices and flags
//   one that differs;
// - a sweep's next settings come from a small Gaussian process with
//   expected improvement.
//
// Nothing here reads files or the clock: the random numbers come from a
// seeded generator, so every result is reproducible.

/** A seeded generator (mulberry32): numbers in [0, 1). */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal draw from a generator (Box-Muller). */
export function gaussian(random) {
  let u = 0;
  while (u === 0) {
    u = random();
  }
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

// ------------------------------------------------------------ distributions

/** The standard normal density. */
export const normalPdf = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/**
 * The standard normal distribution function, from the complementary error
 * function (W. J. Cody's rational approximation via erfc, accurate to about
 * 1.2 × 10⁻⁷).
 */
export function normalCdf(x) {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.5 * z);
  const erfc =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? 1 - erfc / 2 : erfc / 2;
}

/** The standard normal quantile (Acklam's algorithm, one Newton step). */
export function normalQuantile(p) {
  if (!(p > 0 && p < 1)) {
    if (p === 0) {
      return -Infinity;
    }
    if (p === 1) {
      return Infinity;
    }
    return NaN;
  }
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const low = 0.02425;
  let x;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - low) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // One Newton step on the distribution function.
  const e = normalCdf(x) - p;
  return x - e / normalPdf(x);
}

/** ln Γ(x), Lanczos (g = 7, nine terms). */
export function logGamma(x) {
  const g = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let s = g[0];
  for (let i = 1; i < 9; i++) {
    s += g[i] / (x + i);
  }
  const t = x + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s)
  );
}

/** The regularized incomplete beta function I_x(a, b) (a continued fraction). */
export function incompleteBeta(x, a, b) {
  if (x <= 0) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }
  const front = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x),
  );
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(1 - x, b, a);
  }
  // Lentz's method.
  const tiny = 1e-300;
  let f = 1;
  let c = 1;
  let d = 0;
  for (let i = 0; i <= 400; i++) {
    const m = i >> 1;
    let numerator;
    if (i === 0) {
      numerator = 1;
    } else if (i % 2 === 0) {
      numerator = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    } else {
      numerator =
        -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    }
    d = 1 + numerator * d;
    d = Math.abs(d) < tiny ? tiny : d;
    d = 1 / d;
    c = 1 + numerator / c;
    c = Math.abs(c) < tiny ? tiny : c;
    const step = c * d;
    f *= step;
    if (Math.abs(1 - step) < 1e-12) {
      break;
    }
  }
  return (front * (f - 1)) / a;
}

/** Student's t distribution function with `df` degrees of freedom. */
export function tCdf(t, df) {
  const tail = 0.5 * incompleteBeta(df / (df + t * t), df / 2, 0.5);
  return t >= 0 ? 1 - tail : tail;
}

/**
 * Student's t quantile: exact for one and two degrees of freedom, else the
 * Cornish-Fisher expansion in the normal quantile (Abramowitz and Stegun
 * 26.7.5), refined by Newton steps on tCdf.
 */
export function tQuantile(p, df) {
  if (df === 1) {
    return Math.tan(Math.PI * (p - 0.5));
  }
  if (df === 2) {
    return (2 * p - 1) / Math.sqrt(2 * p * (1 - p));
  }
  const z = normalQuantile(p);
  const z3 = z ** 3;
  const z5 = z ** 5;
  const z7 = z ** 7;
  const z9 = z ** 9;
  let t =
    z +
    (z3 + z) / (4 * df) +
    (5 * z5 + 16 * z3 + 3 * z) / (96 * df ** 2) +
    (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * df ** 3) +
    (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * df ** 4);
  for (let i = 0; i < 3; i++) {
    const density = Math.exp(
      logGamma((df + 1) / 2) -
        logGamma(df / 2) -
        0.5 * Math.log(df * Math.PI) -
        ((df + 1) / 2) * Math.log(1 + (t * t) / df),
    );
    t -= (tCdf(t, df) - p) / density;
  }
  return t;
}

// ---------------------------------------------------------------- summaries

export function mean(values) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** The sample variance (n − 1). */
export function variance(values) {
  if (values.length < 2) {
    return NaN;
  }
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

/** n, mean, standard deviation and standard error of paired differences. */
export function describe(values) {
  const n = values.length;
  const m = n ? mean(values) : NaN;
  const sd = Math.sqrt(variance(values));
  return { n, mean: m, sd, se: sd / Math.sqrt(n) };
}

/**
 * A two-sided t interval at `level` (0.95) for the mean of `values`, with
 * its p-value against zero.
 */
export function tInterval(values, level = 0.95) {
  const { n, mean: m, se } = describe(values);
  if (n < 2 || !Number.isFinite(se)) {
    return { n, mean: m, low: -Infinity, high: Infinity, p: 1 };
  }
  if (se === 0) {
    return { n, mean: m, low: m, high: m, p: m === 0 ? 1 : 0 };
  }
  const t = tQuantile(1 - (1 - level) / 2, n - 1);
  const stat = m / se;
  return {
    n,
    mean: m,
    se,
    low: m - t * se,
    high: m + t * se,
    p: 2 * (1 - tCdf(Math.abs(stat), n - 1)),
  };
}

// ------------------------------------------------------------ the sample plan

/**
 * The runs a paired comparison needs (a power analysis): the smallest n
 * with (t(1 − α/2, n − 1) + t(power, n − 1))² (σ / δ)² ≤ n, where σ is the
 * noise floor (the standard deviation of one paired difference, from an
 * A/A run) and δ the minimum effect, in the same units. Two-sided.
 * Known case: σ / δ = 2 (an effect of half a standard deviation), α 0.05,
 * power 0.8 gives 34, as G*Power does.
 */
export function runsNeeded({ noise, effect, alpha = 0.05, power = 0.8 }) {
  if (!(noise > 0) || !(Math.abs(effect) > 0)) {
    throw new Error("runsNeeded: a noise floor and a minimum effect above 0");
  }
  if (!(alpha > 0 && alpha < 1) || !(power > 0 && power < 1)) {
    throw new Error("runsNeeded: alpha and power between 0 and 1");
  }
  const ratio = (noise / Math.abs(effect)) ** 2;
  for (let n = 2; n < 1e6; n++) {
    const need =
      (tQuantile(1 - alpha / 2, n - 1) + tQuantile(power, n - 1)) ** 2 * ratio;
    if (need <= n) {
      return n;
    }
  }
  return Infinity;
}

// ------------------------------------------------------------- sequential

/**
 * An always-valid interval for a mean after n observations (the mixture
 * sequential probability ratio test, Johari, Pekelis and Walsh, "Always
 * valid inference", 2017), with the noise σ known from the study's noise
 * floor and a normal mixture of standard deviation τ (the minimum effect).
 * Looking after every run keeps the false-positive rate at or under α.
 */
export function sequentialInterval({ mean: m, n, sigma, tau, alpha = 0.05 }) {
  const v = (sigma * sigma) / n;
  const t2 = tau * tau;
  const half = Math.sqrt(
    ((v * (v + t2)) / t2) * (Math.log((v + t2) / v) + 2 * Math.log(1 / alpha)),
  );
  return { n, mean: m, low: m - half, high: m + half };
}

/**
 * Runs a sequential test over `values` in order, looking after each one
 * from the second on: the first n at which the always-valid interval
 * excludes zero, or undefined. With `naive`, the fixed-sample t interval
 * at each look instead (which inflates the false-positive rate: the test
 * shows it).
 */
export function firstSequentialStop(
  values,
  { sigma, tau, alpha = 0.05, naive = false },
) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    const n = i + 1;
    if (n < 2) {
      continue;
    }
    const interval = naive
      ? tInterval(values.slice(0, n), 1 - alpha)
      : sequentialInterval({ mean: sum / n, n, sigma, tau, alpha });
    if (interval.low > 0 || interval.high < 0) {
      return n;
    }
  }
  return undefined;
}

// --------------------------------------------------- multiple comparisons

/**
 * Benjamini-Hochberg adjusted p-values (q-values), in the input's order:
 * the secondary metrics' correction. The primary metric isn't corrected.
 */
export function benjaminiHochberg(pValues) {
  const m = pValues.length;
  const order = pValues.map((p, i) => [p, i]).sort((x, y) => x[0] - y[0]);
  const q = new Array(m);
  let running = 1;
  for (let k = m - 1; k >= 0; k--) {
    const [p, i] = order[k];
    running = Math.min(running, (p * m) / (k + 1));
    q[i] = running;
  }
  return q;
}

// ------------------------------------------------------------ ratio metrics

/**
 * A ratio metric over runs (CPU time over ticks, say): Σ numerators over
 * Σ denominators, with its standard error by the delta method, each run a
 * unit (never each tick).
 */
export function deltaMethodRatio(numerators, denominators) {
  const n = numerators.length;
  const my = mean(numerators);
  const mx = mean(denominators);
  const vy = variance(numerators);
  const vx = variance(denominators);
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (numerators[i] - my) * (denominators[i] - mx);
  }
  cov /= n - 1;
  const r = my / mx;
  const v =
    (vy / mx ** 2 - (2 * my * cov) / mx ** 3 + (my ** 2 * vx) / mx ** 4) / n;
  return { ratio: r, se: Math.sqrt(Math.max(0, v)) };
}

/** The same ratio, with a bootstrap over runs (seeded). */
export function bootstrapRatio(
  numerators,
  denominators,
  { seed = 1, resamples = 2000 } = {},
) {
  const n = numerators.length;
  const random = seededRandom(seed);
  const ratios = [];
  for (let b = 0; b < resamples; b++) {
    let sy = 0;
    let sx = 0;
    for (let i = 0; i < n; i++) {
      const j = Math.floor(random() * n);
      sy += numerators[j];
      sx += denominators[j];
    }
    ratios.push(sy / sx);
  }
  ratios.sort((a, b) => a - b);
  const total = (list) => list.reduce((s, v) => s + v, 0);
  return {
    ratio: total(numerators) / total(denominators),
    se: Math.sqrt(variance(ratios)),
    low: ratios[Math.floor(resamples * 0.025)],
    high: ratios[Math.floor(resamples * 0.975)],
  };
}

// --------------------------------------------------------------- Bayesian

/**
 * The posterior of a normal mean with a normal prior and a normal
 * likelihood of known standard error (the conjugate case).
 */
export function normalPosterior({ priorMean, priorSd, mean: m, se }) {
  const precision = 1 / priorSd ** 2 + 1 / se ** 2;
  const sd = Math.sqrt(1 / precision);
  return {
    mean: (priorMean / priorSd ** 2 + m / se ** 2) / precision,
    sd,
  };
}

/**
 * The Bayesian readout beside a computed verdict. `gain` is the observed
 * improvement (positive is good: the negated log ratio for a metric where
 * lower is better), `se` its standard error, `threshold` the minimum effect
 * as a gain. Returns the posterior, the probability that the candidate is
 * better at all, the probability that it beats the minimum effect (a win),
 * and the expected loss of shipping it, E[max(0, −gain)], in the gain's
 * units.
 */
export function bayesReadout({ priorMean = 0, priorSd, gain, se, threshold }) {
  const posterior = normalPosterior({ priorMean, priorSd, mean: gain, se });
  const { mean: mu, sd } = posterior;
  return {
    posterior,
    pBetter: 1 - normalCdf(-mu / sd),
    pWin: 1 - normalCdf((threshold - mu) / sd),
    expectedLoss: -mu * normalCdf(-mu / sd) + sd * normalPdf(mu / sd),
  };
}

/**
 * A hierarchical (random-effects) normal model over groups (scenes or
 * devices), each with its estimate and standard error: the
 * DerSimonian-Laird between-group variance τ², the pooled mean, each
 * group's shrunken estimate, and each group's leave-one-out z score
 * against the others' pooled mean. A group is flagged when its |z| is past
 * the Bonferroni bound for `alpha` over the groups.
 */
export function hierarchical(groups, { alpha = 0.05 } = {}) {
  const pool = (list) => {
    const w = list.map((g) => 1 / g.se ** 2);
    const sw = w.reduce((s, v) => s + v, 0);
    const fixed = list.reduce((s, g, i) => s + w[i] * g.mean, 0) / sw;
    const q = list.reduce((s, g, i) => s + w[i] * (g.mean - fixed) ** 2, 0);
    const c = sw - w.reduce((s, v) => s + v * v, 0) / sw;
    const tau2 =
      list.length > 1 && c > 0 ? Math.max(0, (q - (list.length - 1)) / c) : 0;
    const wr = list.map((g) => 1 / (g.se ** 2 + tau2));
    const swr = wr.reduce((s, v) => s + v, 0);
    return {
      mean: list.reduce((s, g, i) => s + wr[i] * g.mean, 0) / swr,
      se: Math.sqrt(1 / swr),
      tau: Math.sqrt(tau2),
    };
  };
  const all = pool(groups);
  const bound = normalQuantile(1 - alpha / (2 * Math.max(1, groups.length)));
  return {
    ...all,
    groups: groups.map((g) => {
      const shrunk =
        all.tau === 0
          ? all.mean
          : (g.mean / g.se ** 2 + all.mean / all.tau ** 2) /
            (1 / g.se ** 2 + 1 / all.tau ** 2);
      let z = 0;
      if (groups.length > 2) {
        const rest = pool(groups.filter((other) => other !== g));
        z =
          (g.mean - rest.mean) /
          Math.sqrt(g.se ** 2 + rest.tau ** 2 + rest.se ** 2);
      }
      return {
        id: g.id,
        mean: g.mean,
        se: g.se,
        shrunk,
        z,
        differs: Math.abs(z) > bound,
      };
    }),
  };
}

// ------------------------------------------------ the next settings to run

/** Solves L Lᵀ x = b for a Cholesky factor L (lower, row arrays). */
function choleskySolve(l, b) {
  const n = b.length;
  const y = new Array(n);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let k = 0; k < i; k++) {
      s -= l[i][k] * y[k];
    }
    y[i] = s / l[i][i];
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let k = i + 1; k < n; k++) {
      s -= l[k][i] * x[k];
    }
    x[i] = s / l[i][i];
  }
  return x;
}

function cholesky(a) {
  const n = a.length;
  const l = a.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = a[i][j];
      for (let k = 0; k < j; k++) {
        s -= l[i][k] * l[j][k];
      }
      l[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / l[j][j];
    }
  }
  return l;
}

/**
 * Bayesian optimization for a sweep: given the grid's points (each an
 * array of coordinates, already scaled to [0, 1] per axis) and the points
 * measured so far with their value (lower is better), fits a Gaussian
 * process (squared-exponential kernel, `lengthScale` in scaled units, a
 * nugget for the noise floor) and returns the `count` unmeasured points
 * with the largest expected improvement, best first.
 */
export function nextSweepPoints(
  grid,
  measured,
  { count = 1, lengthScale = 0.25, noise = 1e-4 } = {},
) {
  if (measured.length === 0) {
    return grid
      .slice(0, count)
      .map((x) => ({ x, expectedImprovement: Infinity }));
  }
  const ys = measured.map((m) => m.y);
  const ym = mean(ys);
  const ysd = Math.sqrt(variance(ys)) || 1;
  const yn = ys.map((y) => (y - ym) / ysd);
  const kernel = (a, b) =>
    Math.exp(
      -a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / (2 * lengthScale ** 2),
    );
  const k = measured.map((p, i) =>
    measured.map((q, j) => kernel(p.x, q.x) + (i === j ? noise : 0)),
  );
  const l = cholesky(k);
  const alpha = choleskySolve(l, yn);
  const best = Math.min(...yn);
  const key = (x) => x.join(",");
  const seen = new Set(measured.map((m) => key(m.x)));
  return grid
    .filter((x) => !seen.has(key(x)))
    .map((x) => {
      const ks = measured.map((m) => kernel(x, m.x));
      const mu = ks.reduce((s, v, i) => s + v * alpha[i], 0);
      const v = choleskySolve(l, ks);
      const s = Math.sqrt(
        Math.max(1e-12, 1 - ks.reduce((t, kv, i) => t + kv * v[i], 0)),
      );
      const z = (best - mu) / s;
      return {
        x,
        expectedImprovement: (best - mu) * normalCdf(z) + s * normalPdf(z),
      };
    })
    .sort((a, b) => b.expectedImprovement - a.expectedImprovement)
    .slice(0, count);
}
