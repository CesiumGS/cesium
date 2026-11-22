// Types for changepoints.mjs (shared by the CLI and Dyno).
export interface ChangePoint {
  index: number;
  p: number;
}
export interface Alert {
  id: string;
  metric: string;
  scene: string;
  title: string;
  config: string;
  hardware: string;
  kind: "regression" | "improvement";
  change: number;
  p: number;
  before: { median: number; runs: number };
  after: { median: number; runs: number };
  range: {
    from: { commit: string; subject?: string; date: string; run: string };
    to: { commit: string; subject?: string; date: string; run: string };
  };
}
export function changePoints(
  values: number[],
  options?: { alpha?: number; minSize?: number; permutations?: number; seed?: number },
): ChangePoint[];
export function detectAlerts(
  summaries: unknown[],
  metrics: string[],
  options?: { minChange?: number; minRuns?: number; alpha?: number },
): Alert[];
export const ALERT_STATES: string[];
export const ALERT_METRICS: string[];
