// Types for reuse.mjs (only what the tests read).
export function storedRuns(
  directory: string,
  options: { machine: string; method: string; days: number },
): Array<{ file: string; date: number; engineKey: string; run: unknown }>;
