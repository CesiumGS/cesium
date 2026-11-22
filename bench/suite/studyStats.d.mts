// Types for studyStats.mjs (the tests and the Studies page).
export function seededRandom(seed: number): () => number;
export function gaussian(random: () => number): number;
export function normalPdf(x: number): number;
export function normalCdf(x: number): number;
export function normalQuantile(p: number): number;
export function logGamma(x: number): number;
export function incompleteBeta(x: number, a: number, b: number): number;
export function tCdf(t: number, df: number): number;
export function tQuantile(p: number, df: number): number;
export function mean(values: number[]): number;
export function variance(values: number[]): number;
export function describe(values: number[]): {
  n: number;
  mean: number;
  sd: number;
  se: number;
};
export interface Interval {
  n: number;
  mean: number;
  se?: number;
  low: number;
  high: number;
  p?: number;
}
export function tInterval(values: number[], level?: number): Interval;
export function runsNeeded(options: {
  noise: number;
  effect: number;
  alpha?: number;
  power?: number;
}): number;
export function sequentialInterval(options: {
  mean: number;
  n: number;
  sigma: number;
  tau: number;
  alpha?: number;
}): Interval;
export function firstSequentialStop(
  values: number[],
  options: { sigma: number; tau: number; alpha?: number; naive?: boolean },
): number | undefined;
export function benjaminiHochberg(pValues: number[]): number[];
export function deltaMethodRatio(
  numerators: number[],
  denominators: number[],
): { ratio: number; se: number };
export function bootstrapRatio(
  numerators: number[],
  denominators: number[],
  options?: { seed?: number; resamples?: number },
): { ratio: number; se: number; low: number; high: number };
export function normalPosterior(options: {
  priorMean: number;
  priorSd: number;
  mean: number;
  se: number;
}): { mean: number; sd: number };
export interface BayesReadout {
  posterior: { mean: number; sd: number };
  pBetter: number;
  pWin: number;
  expectedLoss: number;
}
export function bayesReadout(options: {
  priorMean?: number;
  priorSd: number;
  gain: number;
  se: number;
  threshold: number;
}): BayesReadout;
export interface PooledGroup {
  id: string;
  mean: number;
  se: number;
  shrunk: number;
  z: number;
  differs: boolean;
}
export function hierarchical(
  groups: Array<{ id: string; mean: number; se: number }>,
  options?: { alpha?: number },
): { mean: number; se: number; tau: number; groups: PooledGroup[] };
export function nextSweepPoints(
  grid: number[][],
  measured: Array<{ x: number[]; y: number }>,
  options?: { count?: number; lengthScale?: number; noise?: number },
): Array<{ x: number[]; expectedImprovement: number }>;
