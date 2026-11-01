// Types for images.mjs (the CLI and the dev server's review endpoint).
export const REGRESSION: { mean: number; p95: number };
export const PARITY: { mean: number; p95: number };
export function readBaselines(directory: string): Record<string, unknown>;
export function approve(
  baselines: string,
  key: string,
  image: string,
  meta: Record<string, unknown>,
): void;
export function runImages(options: Record<string, unknown>): Promise<number>;
