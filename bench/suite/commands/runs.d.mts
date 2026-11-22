// Types for commands/runs.mjs: what TypeScript reads of it (the tests).
export interface RunRow {
  id: string;
  date: string | null;
  kind: string;
  purpose: string;
  commit: string | null;
  branch: string | null;
  item: string | null;
  study: string | null;
  machine: string | null;
  scenes: string[];
  tags: string[];
  validity: { valid: number; warning: number; invalid: number } | null;
  note: string | null;
  pinned: boolean;
}
export function readPins(results: string): Map<string, string | null>;
export function pinnedRuns(results: string): Set<string>;
export function listRuns(
  results: string,
  opts?: Record<string, string | boolean | undefined>,
): RunRow[];
