/** A changeset file: `.changeset/<name>.md`, not its README. */
export function isChangeset(path: string): boolean;

/** The packages a changeset's front matter names; empty for an empty changeset. */
export function namedPackages(text: string): string[];

/** The changeset rule on one change. */
export function checkChangesets(
  changed: readonly { status: string; path: string }[],
  packages: readonly { folder: string; name: string }[],
  read: (path: string) => string,
): {
  ok: boolean;
  touched: string[];
  added: string[];
  named: string[];
  unnamed: string[];
  release: boolean;
  problem?: string;
};

/** `git diff --name-status --no-renames`'s output as lines. */
export function parseNameStatus(text: string): { status: string; path: string }[];
