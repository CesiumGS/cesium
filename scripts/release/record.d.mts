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

/** A commit with its parents; `parent` is the first. */
export interface PushCommit {
  commit: string;
  parent: string;
  parents: string[];
}

/** A commit judged against its first parent. */
export interface Judged extends PushCommit {
  merge: boolean;
  problems: string[];
  version: string | undefined;
  raises: boolean;
  carried: boolean;
}

/** The push's commits along the head's first-parent line, oldest first; undefined when it doesn't reach `before`. */
export function firstParentCommits(before: string, head: string, cwd?: string): PushCommit[] | undefined;

/** Every commit in `before..head`, on every parent's side, oldest first. */
export function pushCommits(before: string, head: string, cwd?: string): PushCommit[];

/** Each commit given, judged against its first parent. */
export function judge(commits: readonly PushCommit[], cwd?: string): Judged[];

/** Each commit of the push's first-parent line judged against its first parent. */
export function judgeCommits(before: string, head: string, cwd?: string): Judged[] | undefined;

/** Runs `fn` with GitHub's workflow commands stopped, in GitHub Actions only. */
export function withCommandsStopped<T>(
  fn: () => T,
  env?: Record<string, string | undefined>,
  write?: (line: string) => void,
): T;

/** Whether the push from `before` to `head` holds a release record to stage, and its commit. */
export function pushIsRelease(
  before: string,
  head: string,
  options?: {
    log?: (line: string) => void;
    cwd?: string;
    published?: (name: string, version: string) => boolean;
  },
): { release: boolean; version: string; sha: string };
