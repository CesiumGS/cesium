import type { Reference } from "../handbook/src/reference.ts";

export interface ApiReferenceOptions {
  /** The package root; default the directory above `scripts`. */
  root?: string;
  /** Entry name to source file (relative to `root`); default the package's `exports`. */
  entries?: Record<string, string>;
}

export interface ApiReferenceReport {
  /** Symbols that no rule or override places. */
  unmapped: string[];
  /** Rules and overrides that place nothing. */
  unusedRules: string[];
  /** Groups with no symbols. */
  emptyGroups: string[];
}

/** The id used in links and in the API map: `Name`, or `entry:Name`. */
export function referenceId(entry: string, name: string): string;

/** A symbol's group from the overrides and rules, or undefined. */
export function groupOf(
  entry: string,
  name: string,
  file: string,
  used?: Set<string>,
): string | undefined;

/** Reads the reference from the entry points. */
export function buildReference(options?: ApiReferenceOptions): {
  reference: Reference;
  report: ApiReferenceReport;
};

/** Writes handbook/generated/reference.json. */
export function writeReference(options?: { root?: string; out?: string }): {
  reference: Reference;
  report: ApiReferenceReport;
  file: string;
  bytes: number;
};

/** The lines the generator prints about its result. */
export function describeReference(result: {
  reference: Reference;
  report: ApiReferenceReport;
  file: string;
  bytes: number;
}): string[];
