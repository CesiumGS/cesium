// Studies' statistics (CS-404): each against a known case, and the
// sequential test and the Bayesian readout on simulated A/A data with a
// fixed seed, so the rates they promise are checked, not assumed.
import { describe, expect, it } from "vitest";
import {
  bayesReadout,
  benjaminiHochberg,
  bootstrapRatio,
  deltaMethodRatio,
  firstSequentialStop,
  gaussian,
  hierarchical,
  nextSweepPoints,
  normalCdf,
  normalPosterior,
  normalQuantile,
  runsNeeded,
  seededRandom,
  tCdf,
  tInterval,
  tQuantile,
} from "../bench/suite/studyStats.mjs";

describe("distributions", () => {
  it("match tabulated values", () => {
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 6);
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5);
    expect(normalQuantile(0.05)).toBeCloseTo(-1.644854, 5);
    // Student's t: t(0.975, 5) = 2.570582, t(0.975, 33) = 2.034515.
    expect(tQuantile(0.975, 5)).toBeCloseTo(2.570582, 5);
    expect(tQuantile(0.975, 33)).toBeCloseTo(2.034515, 5);
    expect(tQuantile(0.975, 1)).toBeCloseTo(12.7062, 3);
    expect(tCdf(2.570582, 5)).toBeCloseTo(0.975, 6);
  });

  it("give a t interval and its p-value", () => {
    const i = tInterval([1, 2, 3, 4, 5]);
    expect(i.mean).toBe(3);
    // se = sqrt(2.5 / 5); the half width is t(0.975, 4) × se.
    expect(i.high - i.mean).toBeCloseTo(2.776445 * Math.sqrt(0.5), 4);
    // t = 3 / sqrt(0.5) = 4.243 on 4 degrees of freedom: two-sided 0.0132.
    expect(i.p).toBeCloseTo(0.0132, 3);
  });
});

describe("the power analysis", () => {
  it("turns a noise floor and a minimum effect into a run count (G*Power's 34 for half a standard deviation)", () => {
    expect(runsNeeded({ noise: 2, effect: 1 })).toBe(34);
    // A whole standard deviation: G*Power says 10.
    expect(runsNeeded({ noise: 1, effect: 1 })).toBe(10);
    // Units cancel: a 4% noise floor against a 2% effect is the same 34.
    expect(runsNeeded({ noise: 0.04, effect: 0.02 })).toBe(34);
    // More power, more runs.
    expect(runsNeeded({ noise: 2, effect: 1, power: 0.9 })).toBeGreaterThan(34);
  });

  it("refuses what it can't compute", () => {
    expect(() => runsNeeded({ noise: 0, effect: 1 })).toThrow(/noise floor/);
    expect(() => runsNeeded({ noise: 1, effect: 1, alpha: 2 })).toThrow(
      /alpha/,
    );
  });
});

describe("the sequential option", () => {
  it("keeps its false-positive rate at the stated level on A/A data, looking after every run", () => {
    const random = seededRandom(20261121);
    const sigma = 0.04;
    const tau = 0.05;
    const alpha = 0.05;
    const simulations = 2000;
    let sequential = 0;
    let naive = 0;
    for (let s = 0; s < simulations; s++) {
      const values = Array.from({ length: 60 }, () => sigma * gaussian(random));
      if (firstSequentialStop(values, { sigma, tau, alpha }) !== undefined) {
        sequential++;
      }
      if (
        firstSequentialStop(values, { sigma, tau, alpha, naive: true }) !==
        undefined
      ) {
        naive++;
      }
    }
    // Always valid: at or under α however often it looks.
    expect(sequential / simulations).toBeLessThanOrEqual(alpha);
    // Looking at a fixed-sample interval after every run doesn't hold α.
    expect(naive / simulations).toBeGreaterThan(2 * alpha);
  });

  it("still stops on a real effect", () => {
    const random = seededRandom(7);
    const values = Array.from(
      { length: 200 },
      () => 0.06 + 0.04 * gaussian(random),
    );
    const n = firstSequentialStop(values, { sigma: 0.04, tau: 0.05 });
    expect(n).toBeDefined();
    expect(n!).toBeLessThan(60);
  });
});

describe("multiple comparisons", () => {
  it("Benjamini-Hochberg adjusts in the input's order", () => {
    // Sorted 0.01, 0.03, 0.04, 0.2 → 0.04, 0.0533, 0.0533, 0.2.
    const q = benjaminiHochberg([0.01, 0.04, 0.03, 0.2]);
    expect(q[0]).toBeCloseTo(0.04, 10);
    expect(q[1]).toBeCloseTo(0.16 / 3, 10);
    expect(q[2]).toBeCloseTo(0.16 / 3, 10);
    expect(q[3]).toBeCloseTo(0.2, 10);
  });
});

describe("ratio metrics", () => {
  it("the delta method and the bootstrap over runs agree", () => {
    const random = seededRandom(3);
    const ticks: number[] = [];
    const cpu: number[] = [];
    for (let i = 0; i < 40; i++) {
      const t = 1000 + 100 * gaussian(random);
      ticks.push(t);
      cpu.push(4 * t + 50 * gaussian(random));
    }
    const delta = deltaMethodRatio(cpu, ticks);
    const boot = bootstrapRatio(cpu, ticks, { seed: 5 });
    expect(delta.ratio).toBeCloseTo(boot.ratio, 10);
    expect(delta.se / boot.se).toBeGreaterThan(0.8);
    expect(delta.se / boot.se).toBeLessThan(1.25);
    expect(boot.low).toBeLessThan(delta.ratio);
    expect(boot.high).toBeGreaterThan(delta.ratio);
  });
});

describe("the Bayesian readout", () => {
  it("matches the closed form: two normal groups with a conjugate prior", () => {
    // Prior N(0, 0.1²), observed gain 0.05 with se 0.02:
    // precision 100 + 2500 = 2600, mean 0.05 × 2500 / 2600.
    const post = normalPosterior({
      priorMean: 0,
      priorSd: 0.1,
      mean: 0.05,
      se: 0.02,
    });
    expect(post.mean).toBeCloseTo(0.05 * (2500 / 2600), 12);
    expect(post.sd).toBeCloseTo(Math.sqrt(1 / 2600), 12);
    const r = bayesReadout({
      priorSd: 0.1,
      gain: 0.05,
      se: 0.02,
      threshold: 0.02,
    });
    const mu = post.mean;
    const sd = post.sd;
    expect(r.pBetter).toBeCloseTo(normalCdf(mu / sd), 10);
    expect(r.pWin).toBeCloseTo(1 - normalCdf((0.02 - mu) / sd), 10);
    // E[max(0, −gain)] for a normal posterior.
    const loss =
      -mu * normalCdf(-mu / sd) +
      (sd * Math.exp(-0.5 * (mu / sd) ** 2)) / Math.sqrt(2 * Math.PI);
    expect(r.expectedLoss).toBeCloseTo(loss, 12);
  });

  it("is calibrated on A/A data: P(better) above 0.95 about 5% of the time with a flat prior", () => {
    const random = seededRandom(404);
    const simulations = 4000;
    const se = 0.02;
    let flatOver = 0;
    let informedWins = 0;
    const bins = new Array(10).fill(0);
    for (let s = 0; s < simulations; s++) {
      const gain = se * gaussian(random);
      const flat = bayesReadout({ priorSd: 100, gain, se, threshold: 0.03 });
      if (flat.pBetter > 0.95) {
        flatOver++;
      }
      bins[Math.min(9, Math.floor(flat.pBetter * 10))]++;
      const informed = bayesReadout({
        priorSd: 0.02,
        gain,
        se,
        threshold: 0.03,
      });
      if (informed.pWin > 0.95) {
        informedWins++;
      }
    }
    expect(flatOver / simulations).toBeGreaterThan(0.035);
    expect(flatOver / simulations).toBeLessThan(0.065);
    // Uniform: every tenth holds about a tenth of the A/A runs.
    for (const count of bins) {
      expect(count / simulations).toBeGreaterThan(0.08);
      expect(count / simulations).toBeLessThan(0.12);
    }
    // With the A/A prior, a win past the minimum effect is rare.
    expect(informedWins / simulations).toBeLessThan(0.01);
  });

  it("its probability of a win is calibrated when effects come from the prior", () => {
    const random = seededRandom(9);
    const priorSd = 0.03;
    const se = 0.02;
    const threshold = 0.02;
    const bins = Array.from({ length: 5 }, () => ({
      predicted: 0,
      wins: 0,
      n: 0,
    }));
    for (let s = 0; s < 20000; s++) {
      const truth = priorSd * gaussian(random);
      const gain = truth + se * gaussian(random);
      const { pWin } = bayesReadout({ priorSd, gain, se, threshold });
      const bin = bins[Math.min(4, Math.floor(pWin * 5))]!;
      bin.predicted += pWin;
      bin.wins += truth > threshold ? 1 : 0;
      bin.n++;
    }
    for (const b of bins.filter((x) => x.n > 500)) {
      expect(Math.abs(b.predicted / b.n - b.wins / b.n)).toBeLessThan(0.03);
    }
  });

  it("the hierarchical model recovers a planted one-scene difference", () => {
    const random = seededRandom(11);
    const groups = [
      "valley",
      "zermatt",
      "city",
      "coast",
      "plains",
      "canyon",
    ].map((id) => ({
      id,
      mean: (id === "canyon" ? 0.15 : 0.03) + 0.01 * gaussian(random),
      se: 0.015,
    }));
    const model = hierarchical(groups);
    const flagged = model.groups.filter((g) => g.differs).map((g) => g.id);
    expect(flagged).toEqual(["canyon"]);
    // The others pool toward their shared effect.
    const city = model.groups.find((g) => g.id === "city")!;
    expect(Math.abs(city.shrunk - model.mean)).toBeLessThan(
      Math.abs(city.mean - model.mean) + 1e-12,
    );
  });

  it("flags nothing when the scenes agree", () => {
    const random = seededRandom(12);
    const groups = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      mean: 0.03 + 0.015 * gaussian(random),
      se: 0.015,
    }));
    expect(hierarchical(groups).groups.some((g) => g.differs)).toBe(false);
  });
});

describe("the next settings to run", () => {
  it("Bayesian optimization looks near a sweep's minimum", () => {
    const grid = Array.from({ length: 21 }, (_, i) => [i / 20]);
    const f = (x: number) => (x - 0.7) ** 2;
    const measured = [0, 0.5, 1].map((x) => ({ x: [x], y: f(x) }));
    const [next] = nextSweepPoints(grid, measured);
    expect(Math.abs(next!.x[0]! - 0.7)).toBeLessThanOrEqual(0.15);
    // Never a point already measured.
    expect(
      nextSweepPoints(grid, measured, { count: 21 }).map((p) => p.x[0]),
    ).not.toContain(0.5);
  });
});
