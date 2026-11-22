/** A tree as the release record's check reads it. */
export interface Tree {
  /** Each pending changeset's path and text. */
  changesets: Record<string, string>;
  packages: { folder: string; manifest: Record<string, any> }[];
  rootManifest: Record<string, any> | undefined;
  config: Record<string, any> | undefined;
}

/** A changed path, as `git diff --name-status` gives it. */
export interface Changed {
  status: string;
  path: string;
}

/** A changeset file: `.changeset/<name>.md`, not its README. */
export function isChangeset(path: string): boolean;

/** The fields of a manifest that changed beyond what `changeset version` writes. */
export function manifestChanges(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
  siblings: Map<string, string>,
  options?: { version?: boolean },
): string[];

/** Why a change isn't a release record; an empty list when it is one. */
export function releaseRecordProblems(changed: readonly Changed[], base: Tree, head: Tree): string[];

/** The tree at a git revision. */
export function gitTree(rev: string, cwd?: string): Tree;

/** `git diff -z --name-status --no-renames`'s output as entries. */
export function parseNameStatus(text: string): Changed[];

/** The paths changed from `base` to `head`. */
export function changedPaths(base: string, head: string, cwd?: string): Changed[];

/** Whether npm already has `name@version`, published. */
export function onNpm(name: string, version: string): boolean;

/** Whether the push from `before` to `head` is a release record to stage. */
export function pushIsRelease(
  before: string,
  head: string,
  options?: {
    log?: (line: string) => void;
    cwd?: string;
    published?: (name: string, version: string) => boolean;
  },
): { release: boolean; version: string };
