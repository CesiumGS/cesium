/** A Dyno page's cold start (coldStart.mjs, CS-706). */
export const COLD_START_GOAL_MS: number;
export const COLD_START_BUDGET_MS: number;
export const COLD_START_METRICS: Array<[string, string, string]>;

export interface ColdStartResource {
  name: string;
  startTime: number;
  responseEnd: number;
}
export interface ColdStartPhase {
  name: "modules" | "device" | "engine setup" | "content" | "first frame";
  from: number;
  to: number;
  ms: number;
}
export interface ColdStartMetrics {
  firstFrameMs?: number;
  modulesMs?: number;
  adapterMs?: number;
  deviceMs?: number;
  engineMs?: number;
  contentMs?: number;
  frameDataMs?: number;
  moduleRequests: number;
  requests: number;
  duplicateFetches: number;
  devices: number;
  shaderModules?: number;
  pipelines?: number;
}
export function pageHooks(): void;
export function analyzeColdStart(load: {
  marks: Record<string, number>;
  resources: ColdStartResource[];
  devices: number;
  shaderModules?: number;
  pipelines?: number;
}): {
  metrics: ColdStartMetrics;
  phases: ColdStartPhase[];
  /** The reference data's span, first request to last answer. */
  frameData?: { from?: number; to?: number };
  frameDataRequests: Array<{ path: string; startMs?: number; endMs?: number }>;
  duplicates: Array<{ path: string; count: number }>;
  firstModuleMs?: number;
};
export function median(values: Array<number | undefined>): number | undefined;
export function overBudget(
  results: {
    runs: Array<{
      config: string;
      scenario: string;
      metrics: { firstFrameMs?: number };
      background?: { quiet?: boolean };
    }>;
  },
  budgetMs: number,
): Array<{ config: string; firstFrameMs?: number; cantTell?: boolean }>;
export function measureColdStart(
  opts: Record<string, unknown>,
  context: { root: string; log: (line: string) => void },
): Promise<{
  runs: unknown[];
  configs: Array<{ id: string; commit: string; subject: string; date: string }>;
  browser: string;
  headless: boolean;
}>;

/** Main-thread time categories, in the order reports list them. */
export const CPU_CATEGORIES: readonly string[];
export function cpuCategory(
  stack: ReadonlyArray<{ functionName: string; url: string }>,
): string;
export function cpuByCategory(
  profile: {
    nodes: Array<{
      id: number;
      callFrame: { functionName: string; url: string };
      children?: number[];
    }>;
    startTime: number;
    samples: number[];
    timeDeltas: number[];
  },
  startUs: number,
  endMs: number,
): Record<string, number>;
