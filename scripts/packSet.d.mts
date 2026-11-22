export const HOST_FOLDER: string;
export const MANIFEST_FORMAT: number;

export interface PackedPackage {
  name: string;
  version: string;
  tarball: string;
  integrity: string;
  size: number;
}

export interface InstallFragment {
  dependencies: Record<string, string>;
  overrides: Record<string, string>;
}

export interface SetManifest {
  format: number;
  commit: string;
  date: string;
  node: string;
  npm: string;
  packages: PackedPackage[];
  install: InstallFragment;
  installFolder: string;
}

/** The folder a set goes to by default: ~/.cesium-bench/packs/<commit>. */
export function defaultOut(commit: string): string;
/** The full SHA of the commit checked out in `repoDir`. */
export function headCommit(repoDir?: string): string;
/** The paths git sees as changed: staged, unstaged, untracked and not ignored. */
export function dirtyPaths(repoDir?: string): string[];
/** Throws, naming the changed paths, when the tree isn't clean. */
export function requireCleanTree(repoDir?: string): void;
/** npm's integrity string for a file. */
export function integrityOf(file: string): string;
/** The package.json fragment a host merges in. */
export function installFragment(
  packages: readonly { name: string; tarball: string }[],
  folder?: string,
): InstallFragment;
/** The problems with a set's `@cesium/*` dependencies: absent from the set, or not at its exact version. */
export function siblingProblems(
  entries: readonly {
    name: string;
    version: string;
    manifest: Record<string, any>;
  }[],
  members?: readonly { name: string; version: string }[],
): string[];
/** `path` absolute, with symbolic links in its nearest existing ancestor resolved. */
export function realResolve(path: string): string;
/** Packs every package into the output folder; returns the manifest. */
export function packSet(options?: {
  out?: string;
  force?: boolean;
  build?: boolean;
  requireClean?: boolean;
  repoDir?: string;
  log?: (line: string) => void;
  /** Called once the new set is staged, before it replaces the old one; for tests. */
  beforeReplace?: () => void;
}): SetManifest;
/** Checks a set's folder against its manifest; returns the problems. */
export function verifySet(folder: string): string[];
