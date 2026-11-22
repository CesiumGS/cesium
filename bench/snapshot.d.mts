// Types for snapshot.mjs (the tests).
export function harnessRoot(dir: string): string;
export function workspacePackages(dir: string): Map<string, string>;
export function thirdPartyDifferences(
  snapshotLock: string,
  worktreeLock: string,
): string[];
export function linkSnapshotPackages(
  dir: string,
  repo: string,
  options?: {
    install?: (command: string, args: string[], cwd: string) => unknown;
  },
): { mode: "links" | "installed"; differences: string[] };
export function snapshot(
  commit: string,
  cwd: string,
): { root: string; repo: string; sha: string };
