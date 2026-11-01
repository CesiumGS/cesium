// Types for report.mjs (shared by the CLI and the results page).
export const METRICS: Array<[string, string, string, number]>;
export function renderReport(results: unknown): string;
export function summarizeRun(results: unknown): unknown;
