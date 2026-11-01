// Types for stats.mjs (shared by the CLI and the results page).
export interface Summary {
  n: number;
  median: number;
  low: number;
  high: number;
}
export interface Ratio {
  value: number | undefined;
  low: number;
  high: number;
  separated: boolean;
}
export function median(values: number[]): number | undefined;
export function summarize(values: number[]): Summary | undefined;
export function ratio(a: number[], b: number[]): Ratio | undefined;
