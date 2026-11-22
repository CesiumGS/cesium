// Types for report.mjs (shared by the CLI and the results page).
export const METRICS: Array<[string, string, string, number]>;
export const CONDITION_METRICS: Array<[string, string, string, number]>;
export function renderReport(
  results: unknown,
  options?: { budgets?: unknown[] },
): string;
export function summarizeRun(results: unknown): unknown;
export function runPurpose(results: unknown): "baseline" | "dev";
export const DEV_FAMILIES: Array<[string, string, string, number]>;
export function metricRow(
  key: string,
): [string, string, string, number] | undefined;
export function metricValue(
  metrics: Record<string, unknown>,
  key: string,
): number | undefined;
export function isHeadlineGroup(group: string | undefined): boolean;
/** A summary without its group D cells; undefined when it is only group D's. */
export function headlineSummary<
  T extends {
    groups?: string[];
    scenes: Array<{ scene: string; group?: string }>;
  },
>(summary: T): T | undefined;
