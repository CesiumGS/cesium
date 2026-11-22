import type { Changed, Tree } from "./record.mjs";

export { isChangeset, parseNameStatus } from "./record.mjs";

/** The packages a changeset's front matter names; empty for an empty changeset. */
export function namedPackages(text: string): string[];

/** The changeset rule on one change. */
export function checkChangesets(
  changed: readonly Changed[],
  base: Tree,
  head: Tree,
): {
  ok: boolean;
  touched: string[];
  added: string[];
  named: string[];
  unnamed: string[];
  deleted: string[];
  release: boolean;
  recordProblems: string[];
  problem?: string;
};

/** The parts the rule judges a change by: each release record alone, each run between them as one. */
export function changeParts(
  base: string,
  head: string,
  cwd?: string,
): { from: string; to: string; commits: number; record: boolean }[];

/** The rule on each part of the change from `base` to `head`. */
export function checkParts(
  base: string,
  head: string,
  cwd?: string,
): ({ from: string; to: string; commits: number; record: boolean } & {
  result: ReturnType<typeof checkChangesets>;
})[];
