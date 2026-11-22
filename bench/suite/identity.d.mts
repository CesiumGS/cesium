// Types for identity.mjs (the CLI, the dev server and the tests).
export type RunPurpose = "dev" | "baseline";
export type RunKind = "bench" | "images" | "coldstart";

export interface RunBase {
  ref: string;
  sha?: string;
}

/** What a run is: the options and the tree, before the run starts. */
export interface Identity {
  kind: RunKind;
  purpose: RunPurpose;
  item?: string;
  study?: string;
  branch: string;
  dirty: boolean;
  worktree: string;
  base: RunBase;
  machine: string;
  servedFrom: string;
  warnings: string[];
}

export const INTEGRATION_BRANCH: string;
export const BASELINE_KINDS: string[];
export function integrationBranch(
  env?: Record<string, string | undefined>,
): string;
export function stampOf(date: Date): string;
export function makeRunId(date: Date, machine: string): string;
export function parseRunId(
  name: string,
): { id: string; stamp: string; date: Date; machine?: string } | undefined;
export function isRunFile(name: string): boolean;
export function gpuVendor(options?: {
  platform?: string;
  arch?: string;
  exec?: (file: string, args: string[]) => string | undefined;
}): string | undefined;
export function defaultMachine(options?: {
  platform?: string;
  vendor?: string;
  names?: string[];
}): string;
export function machineAlias(options?: {
  env?: Record<string, string | undefined>;
  platform?: string;
  arch?: string;
  host?: string;
  user?: string;
  vendor?: () => string | undefined;
}): string;
export function gitIn(cwd: string): (args: string[]) => string;
export function treeFacts(
  git: (args: string[]) => string,
  root: string,
  integration: string,
): {
  branch: string;
  detached: boolean;
  dirty: boolean;
  worktree: string;
  base: RunBase;
};
export function baselineProblem(facts: {
  kind: string;
  dirty: boolean;
  branch: string;
  detached?: boolean;
  integration: string;
}): string | undefined;
export function resolveIdentity(options: {
  kind: RunKind;
  opts: Record<string, unknown>;
  root: string;
  env?: Record<string, string | undefined>;
  git?: (args: string[]) => string;
  machine?: string;
}): Identity;
export function runFields(
  identity: Identity,
  date: Date,
): {
  id: string;
  purpose: RunPurpose;
  item?: string;
  study?: string;
  worktree: string;
  base: RunBase;
  machine: string;
  servedFrom: string;
};
export function identityLine(identity: Identity): string;
export function closingLines(identity: Identity, id: string): string[];
