// Types for gpuTimer.mjs (shared by the CLI and Dyno).
export const GPU_TIMER: number;
export const GPU_METRICS: Record<string, string>;
export function gpuTimerOf(metrics: { gpuTimer?: number } | undefined): number;
export function currentGpuTimer<T>(results: T): T;
export function currentGpuTimerSummary<T>(summary: T): T;
