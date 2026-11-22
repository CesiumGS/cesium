// Types for the parts of diagnose.mjs Dyno renders directly.
export function waterfall(options: {
  runs: unknown[];
  configs: string[];
  color: (config: string) => string;
}): string;
export const DIAGNOSE_CSS: string;
